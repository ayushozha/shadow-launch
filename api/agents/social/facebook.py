"""Facebook pages scraper adapter (Stage 03).

Primary actor: `apify/facebook-pages-scraper`

Actor input shape (approximate):
    {"startUrls": [{"url": "https://facebook.com/<handle>"}], "resultsLimit": 30}
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from api.apify_client import ApifyRunner, ApifyUnavailable
from api.models import Competitor, SocialPost, SocialSnapshot

from . import compute_metrics, derive_brand_slug, pick_first, safe_int

if TYPE_CHECKING:  # pragma: no cover
    from api.events import EventBus


_PLATFORM = "facebook"
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

    page_url = f"https://www.facebook.com/{handle}"
    run_input: dict[str, Any] = {
        "startUrls": [{"url": page_url}],
        "resultsLimit": 30,
    }

    try:
        items = await apify.run(
            "social_facebook",
            run_input,
            actor_label=f"facebook:{handle}",
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

    # Schema: first item tends to be the page (with `likes`/`followers`), the
    # rest are posts. Some actor versions return page + nested `posts`.
    page_rec: dict[str, Any] | None = None
    raw_posts: list[dict[str, Any]] = []

    for item in items:
        if not isinstance(item, dict):
            continue
        if any(k in item for k in ("likes", "followers", "fansCount", "pageId", "pageName")):
            if page_rec is None:
                page_rec = item
            nested = pick_first(item, ("posts", "latestPosts")) or []
            if isinstance(nested, list):
                raw_posts.extend(x for x in nested if isinstance(x, dict))
            # Item itself is sometimes also a post.
            if any(k in item for k in ("text", "message", "postText")):
                raw_posts.append(item)
        elif any(k in item for k in ("text", "message", "postText", "postUrl")):
            raw_posts.append(item)

    followers = safe_int(
        pick_first(page_rec, ("followers", "fansCount", "followersCount", "likes"))
    )

    norm_posts = []
    for p in raw_posts:
        likes = safe_int(
            pick_first(p, ("likesCount", "likes", "reactions", "reactionsCount"))
        ) or 0
        comments = safe_int(
            pick_first(p, ("commentsCount", "comments"))
        ) or 0
        shares = safe_int(pick_first(p, ("sharesCount", "shares"))) or 0
        posted_at = pick_first(p, ("time", "publishedAt", "date", "postedAt"))
        content = pick_first(p, ("text", "message", "postText", "content"))
        engagement = likes + 2 * comments + shares
        enriched = dict(p)
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
