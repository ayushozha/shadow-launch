"""Stage 02 — Competitor discovery (docs/features.md §2).

Runs three parallel Google SERP queries plus best-effort Product Hunt + G2
fan-outs via Apify, aggregates candidate URLs, canonicalizes + dedupes by
host, then asks Kalibr to rank the remaining candidates against the input
`ProductProfile`. Top 5 are flagged `selected=True`.

Per `no-dummy-fallback-policy` this agent NEVER returns cached data:
- if all 3 Google SERP probes fail → raise `ApifyUnavailable`
- Product Hunt / G2 failures are non-blocking (warn + skip)
- Kalibr ranking failures → raise
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any, Iterable
from urllib.parse import urlparse, urlunparse

from pydantic import BaseModel, Field
from sqlalchemy import delete

from api.apify_client import ApifyUnavailable
from api.db.schema import CompetitorRow
from api.db.session import get_session
from api.models import Competitor, ProductProfile

if TYPE_CHECKING:  # pragma: no cover
    from api.apify_client import ApifyRunner
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Hosts we treat as aggregators / not a "competitor" in their own right.
_EXCLUDED_HOSTS: set[str] = {
    "producthunt.com",
    "www.producthunt.com",
    "g2.com",
    "www.g2.com",
    "capterra.com",
    "www.capterra.com",
    "reddit.com",
    "www.reddit.com",
    "old.reddit.com",
    "wikipedia.org",
    "www.wikipedia.org",
    "en.wikipedia.org",
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    # General social chatter, never a product homepage.
    "twitter.com",
    "www.twitter.com",
    "x.com",
    "www.x.com",
    "facebook.com",
    "www.facebook.com",
    "linkedin.com",
    "www.linkedin.com",
    "medium.com",
    "www.medium.com",
    "github.com",
    "www.github.com",
}

# Tracking / campaign params stripped during canonicalization.
_TRACKING_PARAMS: set[str] = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "mc_cid", "mc_eid", "ref", "ref_src", "ref_url",
    "_hsenc", "_hsmi", "hsCtaTracking",
}

_NEWS_HOST_RE = re.compile(r"^.*\.news$", re.IGNORECASE)


class _RankedList(BaseModel):
    """Schema handed to Kalibr for structured output."""

    competitors: list[Competitor] = Field(min_length=5, max_length=8)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _canonicalize(raw: str | None) -> str | None:
    """Normalize a URL: lowercase host, strip tracking params + fragment.

    Returns None when the input is unparseable or obviously non-HTTP.
    """
    if not raw:
        return None
    try:
        parsed = urlparse(raw.strip())
    except Exception:
        return None
    if parsed.scheme not in {"http", "https"}:
        return None
    host = (parsed.netloc or "").lower().strip()
    if not host:
        return None
    # Drop port if it's the scheme default.
    if host.endswith(":80") and parsed.scheme == "http":
        host = host[:-3]
    if host.endswith(":443") and parsed.scheme == "https":
        host = host[:-4]

    # Filter tracking params while preserving order of the rest.
    if parsed.query:
        kept = []
        for chunk in parsed.query.split("&"):
            if not chunk:
                continue
            key, _, _val = chunk.partition("=")
            if key.lower() in _TRACKING_PARAMS:
                continue
            kept.append(chunk)
        query = "&".join(kept)
    else:
        query = ""

    path = parsed.path or "/"
    # Trim a lone trailing slash on non-root paths — keeps "/" on homepages.
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]

    return urlunparse((parsed.scheme, host, path, parsed.params, query, ""))


def _host_of(url: str) -> str:
    host = (urlparse(url).netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def _is_excluded_host(host: str) -> bool:
    if not host:
        return True
    if host in _EXCLUDED_HOSTS:
        return True
    # Bare host comparison (strip "www.").
    bare = host[4:] if host.startswith("www.") else host
    if bare in _EXCLUDED_HOSTS:
        return True
    if _NEWS_HOST_RE.match(host):
        return True
    return False


def _extract_urls_from_serp(items: Iterable[dict[str, Any]]) -> list[str]:
    """Pull organic result URLs out of a Google SERP actor response."""
    out: list[str] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        # Apify Google SERP actor: top-level has "organicResults": [{"url": ...}]
        organic = item.get("organicResults") or item.get("organic_results") or []
        for r in organic:
            if isinstance(r, dict):
                url = r.get("url") or r.get("link")
                if url:
                    out.append(url)
        # Some responses are flat result rows.
        direct = item.get("url") or item.get("link")
        if direct and not organic:
            out.append(direct)
    return out


def _extract_urls_from_product_hunt(items: Iterable[dict[str, Any]]) -> list[str]:
    out: list[str] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        # Common PH scraper fields.
        for key in ("website", "websiteUrl", "url", "productUrl", "homepageUrl"):
            url = item.get(key)
            if url:
                out.append(url)
    return out


def _extract_urls_from_g2(items: Iterable[dict[str, Any]]) -> list[str]:
    out: list[str] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        for key in ("websiteUrl", "website", "vendorWebsite", "productUrl", "url"):
            url = item.get(key)
            if url:
                out.append(url)
    return out


def _snippet_for(url: str, raw_items_by_source: dict[str, list[dict]]) -> str:
    """Best-effort 1-line context for a candidate URL, pulled from SERP rows."""
    target_host = _host_of(url)
    for source_items in raw_items_by_source.values():
        for item in source_items:
            if not isinstance(item, dict):
                continue
            organic = item.get("organicResults") or item.get("organic_results") or []
            for r in organic:
                if not isinstance(r, dict):
                    continue
                r_url = r.get("url") or r.get("link") or ""
                if _host_of(r_url) == target_host:
                    title = r.get("title") or ""
                    desc = r.get("description") or r.get("snippet") or ""
                    combined = f"{title} — {desc}".strip(" —")
                    if combined:
                        return combined[:240]
    return ""


# ---------------------------------------------------------------------------
# Main entrypoint
# ---------------------------------------------------------------------------


async def run(
    *,
    run_id: str,
    profile: ProductProfile,
    event_bus: "EventBus",
    kalibr: "KalibrRouter",
    apify: "ApifyRunner",
) -> list[Competitor]:
    """Discover 5–8 competitors for `profile` and persist them."""
    import asyncio

    await event_bus.emit(
        agent="competitor_discoverer",
        message="stage 02 · competitor discovery · start",
        kind="info",
        meta={"stage": 2, "brand": profile.brand_name},
    )

    brand = profile.brand_name
    category = profile.category

    serp_queries = [
        f"{brand} alternatives",
        f"{brand} vs",
        f"best {category} tools",
    ]

    async def _serp(q: str) -> list[dict]:
        return await apify.run(
            "google_serp",
            {"queries": q, "resultsPerPage": 10, "maxPagesPerQuery": 1},
            stage=2,
            actor_label=f"serp:{q[:40]}",
        )

    serp_results = await asyncio.gather(
        *[_serp(q) for q in serp_queries], return_exceptions=True
    )

    serp_success: list[list[dict]] = []
    for q, res in zip(serp_queries, serp_results):
        if isinstance(res, Exception):
            await event_bus.emit(
                agent="competitor_discoverer",
                message=f"serp failed for {q!r}: {res}",
                kind="warn",
                meta={"stage": 2},
            )
        else:
            serp_success.append(res)

    if not serp_success:
        raise ApifyUnavailable(
            "all 3 Google SERP probes failed; cannot discover competitors "
            "(no cached fallback by policy)"
        )

    # Best-effort secondary sources.
    ph_items: list[dict] = []
    try:
        ph_items = await apify.run(
            "product_hunt",
            {"query": brand, "limit": 10},
            stage=2,
            actor_label="product_hunt",
        )
    except Exception as exc:  # noqa: BLE001
        await event_bus.emit(
            agent="competitor_discoverer",
            message=f"product hunt unavailable, skipping: {exc}",
            kind="warn",
            meta={"stage": 2},
        )

    g2_items: list[dict] = []
    try:
        g2_items = await apify.run(
            "g2_reviews",
            {"startUrls": [{"url": f"https://www.g2.com/search?query={brand}"}]},
            stage=2,
            actor_label="g2_reviews",
        )
    except Exception as exc:  # noqa: BLE001
        await event_bus.emit(
            agent="competitor_discoverer",
            message=f"g2 unavailable, skipping: {exc}",
            kind="warn",
            meta={"stage": 2},
        )

    # ------------------------------------------------------------ aggregate
    raw_by_source = {
        "google_serp": [it for group in serp_success for it in group],
        "product_hunt": ph_items,
        "g2": g2_items,
    }

    source_of_candidate: dict[str, str] = {}  # canonical URL -> discovery source
    # Seed order matters: prefer google_serp labelling when a URL came from multiple.
    for url in _extract_urls_from_serp(raw_by_source["google_serp"]):
        c = _canonicalize(url)
        if c:
            source_of_candidate.setdefault(c, "google_serp")
    for url in _extract_urls_from_product_hunt(raw_by_source["product_hunt"]):
        c = _canonicalize(url)
        if c:
            source_of_candidate.setdefault(c, "product_hunt")
    for url in _extract_urls_from_g2(raw_by_source["g2"]):
        c = _canonicalize(url)
        if c:
            source_of_candidate.setdefault(c, "g2")

    # Exclude the product itself.
    self_host = _host_of(str(profile.product_url))

    # Filter + group by host (one candidate per host).
    by_host: dict[str, dict[str, str]] = {}
    for url, source in source_of_candidate.items():
        host = _host_of(url)
        if not host or host == self_host:
            continue
        if _is_excluded_host(host):
            continue
        # First-seen wins per host (keeps earlier-source preference).
        if host not in by_host:
            by_host[host] = {"url": url, "source": source}

    if len(by_host) < 5:
        raise ApifyUnavailable(
            f"only {len(by_host)} unique candidate hosts found after filtering — "
            "insufficient signal to rank 5+ competitors"
        )

    await event_bus.emit(
        agent="competitor_discoverer",
        message=f"aggregated {len(by_host)} unique candidate hosts",
        kind="info",
        meta={"stage": 2, "candidates": len(by_host)},
    )

    # ---------------------------------------------------------------- rank
    # Build a compact candidate dossier for Kalibr. Cap to the top ~25 hosts
    # so prompts stay small; ordering is insertion (google_serp-first).
    candidates_for_prompt: list[dict[str, str]] = []
    for host, payload in list(by_host.items())[:25]:
        candidates_for_prompt.append(
            {
                "host": host,
                "url": payload["url"],
                "discovery_source": payload["source"],
                "snippet": _snippet_for(payload["url"], raw_by_source),
            }
        )

    system_prompt = (
        "You are a senior GTM analyst ranking competitors for a B2B/SaaS "
        "product. Given the product profile and a list of candidate URLs, "
        "pick the 5 to 8 MOST RELEVANT direct competitors (same buyer, same "
        "job-to-be-done). Exclude aggregators, review sites, and adjacent "
        "categories. For each winner return: competitor_id (leave as empty "
        "string — the caller will assign it), url (use the candidate's url "
        "unchanged), name (real brand name), positioning (one sentence), "
        "relevance_score in [0,1] (1 = identical ICP), discovery_source "
        "(must be one of: google_serp, product_hunt, g2), and selected=false. "
        "Rank the list from most to least relevant."
    )

    user_prompt = _build_user_prompt(profile, candidates_for_prompt)

    ranked = await kalibr.complete(
        goal="competitor_ranking",
        system=system_prompt,
        user=user_prompt,
        response_model=_RankedList,
    )
    assert isinstance(ranked, _RankedList)

    competitors = list(ranked.competitors)

    # Defensive: clamp to 5–8 (Pydantic already enforces, but belt-and-suspenders
    # if an upstream validator is relaxed later).
    if len(competitors) < 5:
        raise ValueError(
            f"kalibr returned only {len(competitors)} competitors; expected 5–8"
        )
    competitors = competitors[:8]

    # Re-issue ids + selection flag deterministically from our side (the LLM
    # is not trusted to produce stable/unique IDs).
    competitors.sort(key=lambda c: c.relevance_score, reverse=True)
    finalized: list[Competitor] = []
    for i, c in enumerate(competitors, start=1):
        finalized.append(
            c.model_copy(
                update={
                    "competitor_id": f"c_{run_id[-8:]}_{i:02d}",
                    "selected": i <= 5,
                }
            )
        )

    # ------------------------------------------------------------- persist
    await _persist(run_id, finalized)

    top5_names = ", ".join(c.name for c in finalized if c.selected)
    await event_bus.emit(
        agent="competitor_discoverer",
        message=f"stage 02 · {len(finalized)} competitors · top: {top5_names}",
        kind="ok",
        meta={"stage": 2, "count": len(finalized)},
    )
    return finalized


def _build_user_prompt(profile: ProductProfile, candidates: list[dict[str, str]]) -> str:
    lines: list[str] = []
    lines.append("PRODUCT PROFILE")
    lines.append(f"  brand_name: {profile.brand_name}")
    lines.append(f"  product_url: {profile.product_url}")
    lines.append(f"  category: {profile.category}")
    lines.append(f"  one_liner: {profile.one_liner}")
    if profile.positioning_claims:
        lines.append("  positioning_claims:")
        for p in profile.positioning_claims:
            lines.append(f"    - {p}")
    lines.append(f"  implicit_audience: {profile.implicit_audience}")
    lines.append("")
    lines.append("CANDIDATES (host | url | discovery_source | snippet)")
    for c in candidates:
        lines.append(
            f"  - {c['host']} | {c['url']} | {c['discovery_source']} | "
            f"{c['snippet'] or '(no snippet)'}"
        )
    lines.append("")
    lines.append("Return JSON matching the provided schema. 5–8 entries.")
    return "\n".join(lines)


async def _persist(run_id: str, competitors: list[Competitor]) -> None:
    """Replace this run's competitor rows with the final set."""
    async with get_session() as session:
        # Clear any prior rows for this run (idempotent re-runs).
        await session.execute(delete(CompetitorRow).where(CompetitorRow.run_id == run_id))
        for c in competitors:
            session.add(
                CompetitorRow(
                    competitor_id=c.competitor_id,
                    run_id=run_id,
                    url=str(c.url),
                    name=c.name,
                    positioning=c.positioning,
                    relevance_score=c.relevance_score,
                    discovery_source=c.discovery_source,
                    selected=c.selected,
                )
            )


__all__ = ["run"]
