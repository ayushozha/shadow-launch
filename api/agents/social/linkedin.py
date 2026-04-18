"""LinkedIn company scraper adapter (Stage 03).

Primary actor: `apify/linkedin-company-scraper`
Alternate:    `curious_coder/linkedin-company-scraper`

Actor input shape (approximate — ApifyRunner probes alternates on 404):
    {"companies": ["<slug-or-url>"], "postsLimit": 30}
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from api.apify_client import ApifyRunner, ApifyUnavailable
from api.models import Competitor, SocialPost, SocialSnapshot

from . import compute_metrics, derive_brand_slug, pick_first, safe_int

if TYPE_CHECKING:  # pragma: no cover
    from api.events import EventBus


_PLATFORM = "linkedin"
_NOW = lambda: datetime.now(timezone.utc)  # noqa: E731


async def scrape(
    *,
    competitor: Competitor,
    apify: ApifyRunner,
    event_bus: "EventBus",  # noqa: ARG001 — bus comes in via apify runner
) -> SocialSnapshot:
    snapshot_base = dict(
        snapshot_id="",  # coordinator overwrites
        competitor_id=competitor.competitor_id,
        platform=_PLATFORM,
        last_scraped_at=_NOW(),
    )

    handle = derive_brand_slug(str(competitor.url), competitor.name)
    if not handle:
        return SocialSnapshot(**snapshot_base, status="not_found", handle=None)

    # LinkedIn company URL is the most reliable identifier for this actor.
    company_url = f"https://www.linkedin.com/company/{handle}"
    run_input: dict[str, Any] = {
        "companies": [company_url],
        "postsLimit": 30,
        "includePosts": True,
    }

    try:
        items = await apify.run(
            "social_linkedin",
            run_input,
            actor_label=f"linkedin:{handle}",
            stage=3,
        )
    except ApifyUnavailable as exc:
        return SocialSnapshot(
            **snapshot_base,
            handle=handle,
            status="error",
            error_detail=str(exc)[:500],
        )
    except Exception as exc:  # noqa: BLE001
        return SocialSnapshot(
            **snapshot_base,
            handle=handle,
            status="error",
            error_detail=f"unexpected: {exc}"[:500],
        )

    if not items:
        return SocialSnapshot(**snapshot_base, handle=handle, status="not_found")

    # Actor emits one company record plus optional post records, or a single
    # company record that bundles posts under "posts"/"updates".
    company_rec: dict[str, Any] | None = None
    raw_posts: list[dict[str, Any]] = []

    for item in items:
        if not isinstance(item, dict):
            continue
        if any(k in item for k in ("followersCount", "followers", "employeeCount")):
            company_rec = item
            nested = pick_first(item, ("posts", "updates", "recentPosts")) or []
            if isinstance(nested, list):
                raw_posts.extend(x for x in nested if isinstance(x, dict))
        elif any(k in item for k in ("text", "postText", "content", "commentary")):
            raw_posts.append(item)

    # If we didn't find a company record, treat the whole list as posts.
    if company_rec is None:
        for item in items:
            if isinstance(item, dict) and "text" in item:
                raw_posts.append(item)

    followers = safe_int(
        pick_first(company_rec, ("followersCount", "followers", "followerCount"))
    )

    # Normalize post shape for metric computation.
    norm_posts = []
    for p in raw_posts:
        likes = safe_int(
            pick_first(p, ("numLikes", "likes", "reactionsCount", "totalReactions", "likesCount"))
        ) or 0
        comments = safe_int(
            pick_first(p, ("numComments", "comments", "commentsCount"))
        ) or 0
        shares = safe_int(
            pick_first(p, ("numShares", "shares", "shareCount", "reposts"))
        ) or 0
        posted_at = pick_first(p, ("postedAt", "publishedAt", "timestamp", "date"))
        engagement = likes + 2 * comments + shares
        enriched = dict(p)
        enriched.update(
            likes=likes,
            comments=comments,
            shares=shares,
            posted_at=posted_at,
            engagement=engagement,
        )
        norm_posts.append(enriched)

    avg_er, cadence = compute_metrics(
        norm_posts, followers=followers,
    )

    top_posts_data = sorted(
        norm_posts, key=lambda x: x.get("engagement", 0) or 0, reverse=True
    )[:10]
    top_posts = [SocialPost.model_validate(p) for p in top_posts_data]

    return SocialSnapshot(
        **snapshot_base,
        handle=handle,
        followers=followers,
        avg_engagement_rate=avg_er,
        posting_cadence_per_week=cadence,
        top_posts=top_posts,
        status="ok",
    )
