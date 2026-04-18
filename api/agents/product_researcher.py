"""Stage 01 — product research agent (docs/features.md §2).

Crawls the user's product URL and harvests brand discourse from Google SERP via
Apify, then asks Kalibr → OpenAI to synthesize the combined context into a
typed `ProductProfile`. Persists the profile to the `product_profiles` table
(upsert on `run_id`).

Policy: per `no-dummy-fallback-policy`, this agent never returns cached or
fabricated data. If Apify is unreachable the error propagates up so the
orchestrator can surface a real failure state to the user.
"""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING, Any
from urllib.parse import urlparse

from api.apify_client import ApifyUnavailable
from api.db.schema import ProductProfileRow
from api.db.session import get_session
from api.models import ProductProfile, RunInput

if TYPE_CHECKING:  # pragma: no cover
    from api.apify_client import ApifyRunner
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def run(
    *,
    run_id: str,
    inputs: RunInput,
    event_bus: "EventBus",
    kalibr: "KalibrRouter",
    apify: "ApifyRunner",
) -> ProductProfile:
    """Execute Stage 01 and return a persisted `ProductProfile`.

    Parameters
    ----------
    run_id:
        Stable id of the enclosing pipeline run. Used as the primary key on
        `product_profiles`.
    inputs:
        Validated user inputs; `inputs.product_url` is the crawl seed.
    event_bus:
        Run-scoped event bus for `info` / `ok` / `error` trace emits.
    kalibr:
        Injected router used for the `research_synthesis` Kalibr goal.
    apify:
        Runner already wired to the same event bus; we fan out two actors.
    """

    await event_bus.emit(
        agent="product_researcher",
        message="stage 01 · product research · start",
        kind="info",
        meta={"stage": 1, "product_url": str(inputs.product_url)},
    )

    product_url = str(inputs.product_url)
    domain = _host_for_serp(product_url)

    # --- Apify fan-out ----------------------------------------------------
    try:
        crawl_task = apify.run(
            "website_content",
            {
                "startUrls": [{"url": product_url}],
                "maxCrawlDepth": 2,
                "maxCrawlPages": 25,
            },
            stage=1,
        )
        serp_task = apify.run(
            "google_serp",
            {
                "queries": (
                    f'"{domain}"\n'
                    f'"{domain}" review\n'
                    f'"{domain}" alternatives'
                ),
                "resultsPerPage": 10,
                "maxPagesPerQuery": 1,
            },
            stage=1,
        )
        crawl_items, serp_items = await asyncio.gather(crawl_task, serp_task)
    except ApifyUnavailable as exc:
        await event_bus.emit(
            agent="product_researcher",
            message=f"apify unavailable: {exc}",
            kind="error",
            meta={"stage": 1},
        )
        raise
    except Exception as exc:  # noqa: BLE001 — re-wrap unknown apify-side failures
        await event_bus.emit(
            agent="product_researcher",
            message=f"apify harvest failed: {exc}",
            kind="error",
            meta={"stage": 1},
        )
        raise ApifyUnavailable(
            f"stage 01 apify harvest failed: {exc}"
        ) from exc

    # --- Kalibr synthesis -------------------------------------------------
    system_prompt = "You are a senior GTM researcher."
    user_prompt = _build_brief(
        product_url=product_url,
        domain=domain,
        crawl_items=crawl_items,
        serp_items=serp_items,
        brand_voice_guide=inputs.brand_voice_guide,
    )

    try:
        profile = await kalibr.complete(
            goal="research_synthesis",
            system=system_prompt,
            user=user_prompt,
            response_model=ProductProfile,
        )
    except Exception as exc:  # noqa: BLE001 — propagate with a clear trace
        await event_bus.emit(
            agent="product_researcher",
            message=f"kalibr synthesis failed: {exc}",
            kind="error",
            meta={"stage": 1},
        )
        raise

    assert isinstance(profile, ProductProfile)

    # --- Stitch metadata --------------------------------------------------
    # The Kalibr response may omit the product_url (it's redundant context in
    # the prompt); force it to the authoritative value the user submitted.
    profile = profile.model_copy(
        update={
            "product_url": inputs.product_url,
            "kalibr_trace_id": _best_effort_trace_id(kalibr),
        }
    )

    # --- Persist (upsert) -------------------------------------------------
    await _persist_profile(run_id=run_id, profile=profile)

    await event_bus.emit(
        agent="product_researcher",
        message=f"stage 01 · {profile.brand_name}: {profile.one_liner}",
        kind="ok",
        meta={
            "stage": 1,
            "positioning_claims": len(profile.positioning_claims),
            "tone_inventory": len(profile.tone_inventory),
            "messaging_gaps": len(profile.messaging_gaps),
        },
    )

    return profile


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _host_for_serp(url: str) -> str:
    """Return the bare host for SERP queries (strip scheme, ``www.`` prefix)."""
    parsed = urlparse(url)
    host = (parsed.hostname or url).lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def _build_brief(
    *,
    product_url: str,
    domain: str,
    crawl_items: list[dict[str, Any]],
    serp_items: list[dict[str, Any]],
    brand_voice_guide: str | None,
) -> str:
    """Construct a structured research brief for the LLM.

    Top 10–15 crawled pages (URL + title + excerpt) and top ~20 SERP snippets
    (title + link + snippet). Kept as plain text so every model variant in the
    Kalibr path handles it identically.
    """
    crawl_section = _render_crawl(crawl_items, limit=15)
    serp_section = _render_serp(serp_items, limit=20)

    voice_block = (
        f"\nBRAND VOICE GUIDE (from user):\n{brand_voice_guide.strip()}\n"
        if brand_voice_guide
        else ""
    )

    return (
        "You are analysing a product to build a ProductProfile for a GTM\n"
        "strategy simulator. Synthesize the signals below into concrete,\n"
        "specific claims grounded in the evidence — do not invent.\n"
        "\n"
        f"PRODUCT URL: {product_url}\n"
        f"DOMAIN: {domain}\n"
        f"{voice_block}"
        "\n"
        "=== CRAWLED PAGES (top by relevance) ===\n"
        f"{crawl_section}\n"
        "\n"
        "=== GOOGLE SERP DISCOURSE (brand + reviews + alternatives) ===\n"
        f"{serp_section}\n"
        "\n"
        "Deliver a ProductProfile with:\n"
        "- brand_name: the product or company name as it markets itself.\n"
        "- one_liner: ≤140-char elevator pitch in the brand's own voice.\n"
        "- category: the single-best market category (e.g. 'project "
        "management software').\n"
        "- positioning_claims: 5–10 distinct claims the brand makes about "
        "itself, each a short sentence.\n"
        "- implicit_audience: 1–3 paragraphs describing the ICP the brand "
        "clearly targets, grounded in the crawl copy.\n"
        "- tone_inventory: 4–10 style descriptors (e.g. 'confident', "
        "'developer-native', 'minimalist').\n"
        "- messaging_gaps: topics competitors/reviewers raise that the "
        "brand's own site does NOT address — each a short sentence.\n"
        "Respond with JSON matching the schema exactly."
    )


def _render_crawl(items: list[dict[str, Any]], *, limit: int) -> str:
    if not items:
        return "(no crawl results)"

    # Rank: prefer longer, richer pages first — the homepage-style
    # marketing copy matters more than a thin docs link.
    def _score(item: dict[str, Any]) -> int:
        text = item.get("text") or item.get("markdown") or ""
        return len(text) if isinstance(text, str) else 0

    ordered = sorted(items, key=_score, reverse=True)[:limit]
    lines: list[str] = []
    for idx, item in enumerate(ordered, start=1):
        url = item.get("url") or item.get("loadedUrl") or "(no url)"
        title = (item.get("title") or item.get("metadata", {}).get("title") or "").strip()
        raw_text = item.get("text") or item.get("markdown") or ""
        if not isinstance(raw_text, str):
            raw_text = str(raw_text)
        excerpt = _clean_excerpt(raw_text, max_chars=1200)
        lines.append(f"[{idx}] {title or '(untitled)'} — {url}\n{excerpt}")
    return "\n\n".join(lines)


def _render_serp(items: list[dict[str, Any]], *, limit: int) -> str:
    """SERP actors return one doc per query with a nested `organicResults` list."""
    if not items:
        return "(no SERP results)"

    flattened: list[dict[str, Any]] = []
    for doc in items:
        query = doc.get("searchQuery", {}).get("term") or doc.get("query") or ""
        organic = doc.get("organicResults") or doc.get("results") or []
        if not isinstance(organic, list):
            continue
        for r in organic:
            if not isinstance(r, dict):
                continue
            flattened.append({**r, "_query": query})
        # Very defensive: some actors emit each organic result as its own doc.
        if not organic and ("title" in doc or "link" in doc or "url" in doc):
            flattened.append(doc)

    top = flattened[:limit]
    if not top:
        return "(no SERP organic results)"

    lines: list[str] = []
    for idx, r in enumerate(top, start=1):
        title = (r.get("title") or "").strip()
        link = r.get("url") or r.get("link") or ""
        snippet = (r.get("description") or r.get("snippet") or "").strip()
        query = r.get("_query") or ""
        header = f"[{idx}] {title} — {link}"
        if query:
            header += f"  (query: {query})"
        snippet = _clean_excerpt(snippet, max_chars=400)
        lines.append(f"{header}\n{snippet}")
    return "\n\n".join(lines)


def _clean_excerpt(text: str, *, max_chars: int) -> str:
    # Collapse whitespace without pulling in regex churn.
    collapsed = " ".join(text.split())
    if len(collapsed) <= max_chars:
        return collapsed
    return collapsed[:max_chars].rstrip() + "…"


def _best_effort_trace_id(kalibr: "KalibrRouter") -> str | None:
    """Extract the latest Kalibr trace_id if the router exposes one."""
    try:
        events = kalibr.events()
    except Exception:  # pragma: no cover — telemetry should never break us
        return None
    for ev in reversed(events or []):
        tid = getattr(ev, "trace_id", None)
        if tid:
            return str(tid)
    return None


async def _persist_profile(*, run_id: str, profile: ProductProfile) -> None:
    """Upsert a `ProductProfile` into `product_profiles` keyed by `run_id`."""
    async with get_session() as session:
        existing = await session.get(ProductProfileRow, run_id)
        if existing is None:
            row = ProductProfileRow(
                run_id=run_id,
                brand_name=profile.brand_name,
                one_liner=profile.one_liner,
                category=profile.category,
                positioning_claims=list(profile.positioning_claims),
                implicit_audience=profile.implicit_audience,
                tone_inventory=list(profile.tone_inventory),
                messaging_gaps=list(profile.messaging_gaps),
                kalibr_trace_id=profile.kalibr_trace_id,
            )
            session.add(row)
        else:
            existing.brand_name = profile.brand_name
            existing.one_liner = profile.one_liner
            existing.category = profile.category
            existing.positioning_claims = list(profile.positioning_claims)
            existing.implicit_audience = profile.implicit_audience
            existing.tone_inventory = list(profile.tone_inventory)
            existing.messaging_gaps = list(profile.messaging_gaps)
            existing.kalibr_trace_id = profile.kalibr_trace_id


__all__ = ["run"]
