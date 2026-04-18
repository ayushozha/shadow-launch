"""TikTok profile scraper adapter (Stage 03).

Primary actor: `clockworks/tiktok-scraper`

Actor input shape (approximate):
    {"profiles": ["<handle>"], "resultsPerPage": 30, "shouldDownloadVideos": false}
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from api.apify_client import ApifyRunner, ApifyUnavailable
from api.models import Competitor, SocialPost, SocialSnapshot

from . import compute_metrics, derive_brand_slug, pick_first, safe_int

if TYPE_CHECKING:  # pragma: no cover
    from api.events import EventBus


_PLATFORM = "tiktok"
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
        "profiles": [handle],
        "resultsPerPage": 30,
        "shouldDownloadVideos": False,
        "shouldDownloadCovers": False,
        "shouldDownloadSubtitles": False,
    }

    try:
        items = await apify.run(
            "social_tiktok",
            run_input,
            actor_label=f"tiktok:@{handle}",
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

    # clockworks/tiktok-scraper returns one item per video; each has a
    # nested `authorMeta` with follower stats.
    followers: int | None = None
    for item in items:
        if not isinstance(item, dict):
            continue
        author = item.get("authorMeta") or item.get("author") or {}
        if isinstance(author, dict):
            f = safe_int(pick_first(author, ("fans", "followers", "followerCount")))
            if f is not None:
                followers = f
                break
        f = safe_int(pick_first(item, ("fans", "followerCount", "followers")))
        if f is not None:
            followers = f
            break

    norm_posts = []
    for item in items:
        if not isinstance(item, dict):
            continue
        # Some actors include a pure profile row with no text.
        text = pick_first(item, ("text", "desc", "description", "caption"))
        if text is None and "diggCount" not in item and "playCount" not in item:
            continue
        likes = safe_int(pick_first(item, ("diggCount", "likeCount", "likes"))) or 0
        comments = safe_int(pick_first(item, ("commentCount", "comments"))) or 0
        shares = safe_int(pick_first(item, ("shareCount", "shares"))) or 0
        views = safe_int(pick_first(item, ("playCount", "views", "viewCount")))
        posted_at = pick_first(item, ("createTimeISO", "createTime", "createdAt", "timestamp"))
        engagement = likes + 2 * comments + shares
        enriched = dict(item)
        enriched.update(
            content=text, likes=likes, comments=comments, shares=shares,
            views=views, posted_at=posted_at, engagement=engagement,
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
