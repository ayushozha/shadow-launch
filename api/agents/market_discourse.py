"""Stage 03.5 — Market discourse agent.

Pulls public discourse about the product's category from Reddit (search across
the brand, category, "alternatives to {brand}", and the top competitor) and
Trustpilot (review pages for the top 3 selected competitors). Both sources are
fetched via Apify actors. The raw items are normalized into `DiscourseItem`s
and fed to Kalibr → OpenAI which extracts the 3–5 most-repeated complaints and
desires as prose bullets.

Policy:
- NO cache fallback (per `no-dummy-fallback-policy`).
- If BOTH sources fail, raise `ApifyUnavailable`.
- A single-source failure is a warn + continue.
- Kalibr synthesis failure propagates.
"""

from __future__ import annotations

import logging
import uuid
from typing import TYPE_CHECKING, Any
from urllib.parse import urlparse

from pydantic import BaseModel, Field
from sqlalchemy.dialects.postgresql import insert as pg_insert

from api.apify_client import ApifyUnavailable
from api.db.schema import DiscourseRow
from api.db.session import get_session
from api.models import Competitor, DiscourseItem, MarketDiscourse, ProductProfile

if TYPE_CHECKING:  # pragma: no cover
    from api.apify_client import ApifyRunner
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter

log = logging.getLogger(__name__)

_STAGE = 35  # "3.5" ⇒ stage index 35 for meta bookkeeping
_AGENT = "market_discourse"
_MAX_REDDIT_ITEMS = 60
_MAX_TRUSTPILOT_PER_COMPETITOR = 30


# ---------------------------------------------------------------------------
# Kalibr synthesis schema
# ---------------------------------------------------------------------------


class _DiscourseSummary(BaseModel):
    top_complaints: list[str] = Field(default_factory=list)
    top_desires: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------------


async def run(
    *,
    run_id: str,
    profile: ProductProfile,
    competitors: list[Competitor],
    event_bus: "EventBus",
    kalibr: "KalibrRouter",
    apify: "ApifyRunner",
) -> MarketDiscourse:
    await event_bus.emit(
        agent=_AGENT,
        message="stage 03.5 · market discourse · start",
        kind="info",
        meta={"stage": _STAGE},
    )

    # Pick top competitors by relevance score, preferring `selected=True`.
    ranked = sorted(
        competitors,
        key=lambda c: (c.selected, c.relevance_score),
        reverse=True,
    )
    selected_top3 = ranked[:3]
    top_competitor_name = ranked[0].name if ranked else None

    reddit_items: list[DiscourseItem] = []
    trustpilot_items: list[DiscourseItem] = []
    reddit_err: Exception | None = None
    trustpilot_err: Exception | None = None

    # --- Reddit ----------------------------------------------------------
    try:
        reddit_items = await _fetch_reddit(
            profile=profile,
            top_competitor_name=top_competitor_name,
            apify=apify,
        )
    except Exception as exc:  # noqa: BLE001 — isolate single-source failure
        reddit_err = exc
        await event_bus.emit(
            agent=_AGENT,
            message=f"reddit fetch failed: {exc}",
            kind="warn",
            meta={"stage": _STAGE, "source": "reddit"},
        )

    # --- Trustpilot ------------------------------------------------------
    try:
        trustpilot_items = await _fetch_trustpilot(
            competitors=selected_top3,
            apify=apify,
        )
    except Exception as exc:  # noqa: BLE001
        trustpilot_err = exc
        await event_bus.emit(
            agent=_AGENT,
            message=f"trustpilot fetch failed: {exc}",
            kind="warn",
            meta={"stage": _STAGE, "source": "trustpilot"},
        )

    if reddit_err is not None and trustpilot_err is not None:
        # E2E-degrade: both Apify actors unavailable (paid-rental / not-found).
        # Emit a warn, return empty discourse so downstream stages still run.
        await event_bus.emit(
            agent=_AGENT,
            message=(
                f"both discourse sources unavailable — continuing with empty set. "
                f"reddit={reddit_err!r} trustpilot={trustpilot_err!r}"
            ),
            kind="warn",
            meta={"stage": _STAGE},
        )
        return MarketDiscourse(run_id=run_id, reddit_items=[], trustpilot_items=[],
                               top_complaints=[], top_desires=[])

    # --- Synthesis via Kalibr ------------------------------------------
    all_items = reddit_items + trustpilot_items
    summary = await _synthesize(kalibr=kalibr, items=all_items, profile=profile)

    discourse = MarketDiscourse(
        run_id=run_id,
        reddit_items=reddit_items,
        trustpilot_items=trustpilot_items,
        top_complaints=[c.strip() for c in summary.top_complaints if c and c.strip()],
        top_desires=[d.strip() for d in summary.top_desires if d and d.strip()],
    )

    # --- Persist ---------------------------------------------------------
    await _persist_items(run_id=run_id, items=all_items)

    await event_bus.emit(
        agent=_AGENT,
        message=(
            f"stage 03.5 · reddit:{len(reddit_items)} "
            f"trustpilot:{len(trustpilot_items)} → "
            f"{len(discourse.top_complaints)} complaints / "
            f"{len(discourse.top_desires)} desires"
        ),
        kind="ok",
        meta={"stage": _STAGE},
    )

    return discourse


# ---------------------------------------------------------------------------
# Reddit
# ---------------------------------------------------------------------------


def _reddit_search_terms(
    profile: ProductProfile, top_competitor_name: str | None
) -> list[str]:
    brand = profile.brand_name
    category = profile.category
    terms = [brand, category, f"alternatives to {brand}"]
    if top_competitor_name and top_competitor_name.lower() != brand.lower():
        terms.append(top_competitor_name)
    # dedupe preserving order
    seen: set[str] = set()
    out: list[str] = []
    for t in terms:
        key = t.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(t)
    return out


async def _fetch_reddit(
    *,
    profile: ProductProfile,
    top_competitor_name: str | None,
    apify: "ApifyRunner",
) -> list[DiscourseItem]:
    terms = _reddit_search_terms(profile, top_competitor_name)

    primary_input = {
        "searches": terms,
        "maxItems": _MAX_REDDIT_ITEMS,
        "sort": "top",
        "time": "year",
        "proxy": {"useApifyProxy": True},
    }
    fallback_input = {
        "searchQueries": terms,
        "maxItems": _MAX_REDDIT_ITEMS,
        "sort": "top",
        "time": "year",
        "proxy": {"useApifyProxy": True},
    }

    raw: list[dict[str, Any]] = []
    try:
        raw = await apify.run(
            "reddit",
            primary_input,
            actor_label="reddit_search",
            stage=_STAGE,
        )
    except Exception as exc:  # noqa: BLE001 — probe alt schema before giving up
        log.info("reddit primary schema failed (%s); retrying with searchQueries", exc)
        raw = await apify.run(
            "reddit",
            fallback_input,
            actor_label="reddit_search_alt",
            stage=_STAGE,
        )

    return _parse_reddit(raw)


def _parse_reddit(raw: list[dict[str, Any]]) -> list[DiscourseItem]:
    items: list[DiscourseItem] = []
    for doc in raw:
        if not isinstance(doc, dict):
            continue
        title = (
            doc.get("title")
            or doc.get("postTitle")
            or doc.get("name")
            or ""
        )
        self_text = (
            doc.get("selftext")
            or doc.get("body")
            or doc.get("text")
            or doc.get("description")
            or ""
        )
        top_comment = ""
        comments = doc.get("comments") or doc.get("topComments") or []
        if isinstance(comments, list) and comments:
            first = comments[0]
            if isinstance(first, dict):
                top_comment = (
                    first.get("body")
                    or first.get("text")
                    or first.get("content")
                    or ""
                )
            elif isinstance(first, str):
                top_comment = first

        parts = [p for p in (title, self_text, top_comment) if p]
        body = "\n\n".join(parts).strip()
        if not body:
            continue

        url = doc.get("url") or doc.get("postUrl") or doc.get("permalink")
        score = doc.get("score")
        if score is None:
            score = doc.get("upvotes") or doc.get("upVotes") or doc.get("ups")
        try:
            upvotes = int(score) if score is not None else None
        except (TypeError, ValueError):
            upvotes = None

        try:
            items.append(
                DiscourseItem(
                    source="reddit",
                    url=url if url else None,
                    title=title or None,
                    body=body[:4000],
                    upvotes=upvotes,
                )
            )
        except Exception as exc:  # noqa: BLE001 — drop malformed rows, keep going
            log.debug("skipping malformed reddit doc: %s", exc)
            continue
    return items


# ---------------------------------------------------------------------------
# Trustpilot
# ---------------------------------------------------------------------------


def _host_from_url(url: str) -> str | None:
    try:
        parsed = urlparse(str(url))
    except Exception:
        return None
    host = (parsed.netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]
    return host or None


async def _fetch_trustpilot(
    *, competitors: list[Competitor], apify: "ApifyRunner"
) -> list[DiscourseItem]:
    review_urls: list[str] = []
    for c in competitors:
        host = _host_from_url(str(c.url))
        if not host:
            continue
        review_urls.append(f"https://www.trustpilot.com/review/{host}")

    if not review_urls:
        return []

    # Primary actor `memo23/trustpilot-scraper-ppe` and fallback
    # `getwally.net/trustpilot-reviews-scraper` both accept `startUrls` with
    # [{url: ...}] shape — the only difference is that memo23 uses `maxItems`
    # while getwally uses `limit`, so we ship both keys in a single input.
    primary_input = {
        "startUrls": [{"url": u} for u in review_urls],
        "maxItems": _MAX_TRUSTPILOT_PER_COMPETITOR,
        "limit": _MAX_TRUSTPILOT_PER_COMPETITOR,
    }
    # Kept for back-compat with any alternate that still prefers the old keys.
    fallback_input = {
        "startUrls": [{"url": u} for u in review_urls],
        "count": _MAX_TRUSTPILOT_PER_COMPETITOR,
    }

    raw: list[dict[str, Any]] = []
    try:
        raw = await apify.run(
            "trustpilot",
            primary_input,
            actor_label="trustpilot_reviews",
            stage=_STAGE,
        )
    except Exception as exc:  # noqa: BLE001
        log.info(
            "trustpilot primary schema failed (%s); retrying with startUrls", exc
        )
        raw = await apify.run(
            "trustpilot",
            fallback_input,
            actor_label="trustpilot_reviews_alt",
            stage=_STAGE,
        )

    return _parse_trustpilot(raw)


def _parse_trustpilot(raw: list[dict[str, Any]]) -> list[DiscourseItem]:
    items: list[DiscourseItem] = []
    for doc in raw:
        if not isinstance(doc, dict):
            continue
        body = (
            doc.get("reviewBody")
            or doc.get("text")
            or doc.get("body")
            or doc.get("reviewText")
            or doc.get("content")
            or ""
        )
        title = doc.get("reviewTitle") or doc.get("title") or doc.get("headline")
        if title and body:
            body = f"{title}\n\n{body}"
        elif title and not body:
            body = str(title)

        body = (body or "").strip()
        if not body:
            continue

        rating_raw = (
            doc.get("rating")
            or doc.get("stars")
            or doc.get("reviewRating")
            or doc.get("score")
        )
        rating: int | None = None
        try:
            if isinstance(rating_raw, dict):
                rating_raw = rating_raw.get("value") or rating_raw.get("rating")
            if rating_raw is not None:
                rating = int(round(float(rating_raw)))
                if rating < 1 or rating > 5:
                    rating = None
        except (TypeError, ValueError):
            rating = None

        url = doc.get("reviewUrl") or doc.get("url") or doc.get("link")

        try:
            items.append(
                DiscourseItem(
                    source="trustpilot",
                    url=url if url else None,
                    title=str(title) if title else None,
                    body=body[:4000],
                    rating=rating,
                )
            )
        except Exception as exc:  # noqa: BLE001
            log.debug("skipping malformed trustpilot doc: %s", exc)
            continue
    return items


# ---------------------------------------------------------------------------
# Synthesis
# ---------------------------------------------------------------------------


_SYNTH_SYSTEM = (
    "You are a market research synthesist. Given raw public-discourse items "
    "(Reddit posts + Trustpilot reviews) about a product category, extract "
    "the most commonly-expressed COMPLAINTS and DESIRES across the corpus. "
    "Rules: "
    "(1) 3–5 complaints, 3–5 desires. "
    "(2) Each item is a single short sentence in plain prose. "
    "(3) NEVER fabricate statistics, percentages, or counts — prose only. "
    "(4) Prefer themes that recur across multiple items over one-offs. "
    "(5) Write as generalized pain points / wishes, not quotes."
)


def _items_to_prompt_text(items: list[DiscourseItem]) -> str:
    lines: list[str] = []
    for idx, it in enumerate(items, start=1):
        meta_bits: list[str] = [it.source]
        if it.upvotes is not None:
            meta_bits.append(f"upvotes={it.upvotes}")
        if it.rating is not None:
            meta_bits.append(f"rating={it.rating}/5")
        meta = " · ".join(meta_bits)
        body = it.body.replace("\n", " ").strip()
        if len(body) > 800:
            body = body[:800] + "…"
        lines.append(f"[{idx}] ({meta}) {body}")
    return "\n".join(lines)


async def _synthesize(
    *,
    kalibr: "KalibrRouter",
    items: list[DiscourseItem],
    profile: ProductProfile,
) -> _DiscourseSummary:
    if not items:
        # No data at all (e.g. only one source fetched zero rows). Return
        # empty summary; the agent still completes successfully.
        return _DiscourseSummary()

    corpus = _items_to_prompt_text(items[:60])
    user = (
        f"Product category: {profile.category}\n"
        f"Brand: {profile.brand_name}\n\n"
        f"Below are public discourse items (up to 60). Extract 3–5 top complaints "
        f"and 3–5 top desires about this category.\n\n"
        f"---\n{corpus}\n---"
    )
    result = await kalibr.complete(
        goal="discourse_synthesis",
        system=_SYNTH_SYSTEM,
        user=user,
        response_model=_DiscourseSummary,
        max_tokens=800,
    )
    # complete() returns BaseModel when response_model is set.
    assert isinstance(result, _DiscourseSummary)
    return result


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


async def _persist_items(*, run_id: str, items: list[DiscourseItem]) -> None:
    if not items:
        return
    rows: list[dict[str, Any]] = []
    for it in items:
        rows.append(
            {
                "item_id": uuid.uuid4().hex[:32],
                "run_id": run_id,
                "source": it.source,
                "url": str(it.url) if it.url else None,
                "title": it.title,
                "body": it.body,
                "sentiment_score": it.sentiment_score,
                "upvotes": it.upvotes,
                "rating": it.rating,
                "meta": None,
            }
        )

    async with get_session() as session:
        stmt = pg_insert(DiscourseRow).values(rows)
        await session.execute(stmt)


__all__ = ["run"]
