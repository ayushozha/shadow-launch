"""X / Twitter scraper adapter (Stage 03).

Primary actor: `kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest`

This actor is the only currently-verified pay-per-event Twitter scraper that
returns REAL tweet content on a Free-tier Apify plan. `apidojo/twitter-scraper-lite`
and even the full `apidojo/tweet-scraper` return a `{noResults: true}` placeholder
on the free plan.

Actor input shape:
    {"from": "<handle>", "maxItems": 30, "queryType": "Latest"}
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from api.apify_client import ApifyRunner, ApifyUnavailable
from api.models import Competitor, SocialPost, SocialSnapshot

from . import compute_metrics, derive_brand_slug, pick_first, safe_int

if TYPE_CHECKING:  # pragma: no cover
    from api.events import EventBus


_PLATFORM = "twitter"
_NOW = lambda: datetime.now(timezone.utc)  # noqa: E731


async def scrape(
    *,
    competitor: Competitor,
    apify: ApifyRunner,
    event_bus: "EventBus",  # noqa: ARG001
) -> SocialSnapshot:
    snapshot_base = dict(
        snapshot_id="",
        competitor_id=competitor.competitor_id,
        platform=_PLATFORM,
        last_scraped_at=_NOW(),
    )

    handle = derive_brand_slug(str(competitor.url), competitor.name)
    if not handle:
        return SocialSnapshot(**snapshot_base, status="not_found", handle=None)

    run_input: dict[str, Any] = {
        "from": handle,
        "maxItems": 30,
        "queryType": "Latest",
    }

    try:
        items = await apify.run(
            "social_twitter",
            run_input,
            actor_label=f"twitter:@{handle}",
            stage=3,
        )
    except ApifyUnavailable as exc:
        return SocialSnapshot(
            **snapshot_base, handle=handle,
            status="error", error_detail=str(exc)[:500],
        )
    except Exception as exc:  # noqa: BLE001
        return SocialSnapshot(
            **snapshot_base, handle=handle,
            status="error", error_detail=f"unexpected: {exc}"[:500],
        )

    if not items:
        return SocialSnapshot(**snapshot_base, handle=handle, status="not_found")

    # Most twitter scrapers return one tweet per item with an embedded author
    # sub-object. Pull followers off the first author record we see.
    followers: int | None = None
    for item in items:
        if not isinstance(item, dict):
            continue
        author = item.get("author") or item.get("user") or {}
        if isinstance(author, dict):
            f = safe_int(pick_first(author, (
                "followers", "followersCount", "followers_count",
            )))
            if f is not None:
                followers = f
                break
        f = safe_int(pick_first(item, ("followers", "followersCount")))
        if f is not None:
            followers = f
            break

    norm_posts: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        # Skip pure profile rows with no text.
        content = pick_first(item, ("text", "fullText", "full_text", "content"))
        if content is None:
            continue
        likes = safe_int(pick_first(item, ("likeCount", "favoriteCount", "likes", "favorites"))) or 0
        comments = safe_int(pick_first(item, ("replyCount", "replies", "comments"))) or 0
        shares = safe_int(pick_first(item, ("retweetCount", "retweets", "shares"))) or 0
        posted_at = pick_first(item, ("createdAt", "created_at", "date", "postedAt"))
        engagement = likes + 2 * comments + shares
        enriched = dict(item)
        enriched.update(
            content=content, likes=likes, comments=comments,
            shares=shares, posted_at=posted_at, engagement=engagement,
        )
        norm_posts.append(enriched)

    avg_er, cadence = compute_metrics(norm_posts, followers=followers)

    top = sorted(norm_posts, key=lambda x: x.get("engagement", 0) or 0, reverse=True)[:10]
    top_posts = [SocialPost.model_validate(p) for p in top]

    return SocialSnapshot(
        **snapshot_base,
        handle=handle,
        followers=followers,
        avg_engagement_rate=avg_er,
        posting_cadence_per_week=cadence,
        top_posts=top_posts,
        status="ok",
    )
