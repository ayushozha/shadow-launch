"""LinkedIn company scraper adapter (Stage 03).

Company details actor: `harvestapi/linkedin-company`
Company posts actor:   `harvestapi/linkedin-company-posts`

Both actors are pay-per-event and work on the Free Apify plan. The company
record comes with `followerCount` + `employeeCount`; posts come from a second
call keyed by `targetUrls`. We fan out both calls then merge the output.

Actor input shapes:
    company:  {"companies": ["<linkedin-company-url>"]}
    posts:    {"targetUrls": ["<linkedin-company-url>"], "maxPosts": 30}
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from api.apify_client import ApifyRunner
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

    # harvestapi's two actors accept either a slug or a full URL; we pass the
    # canonical URL so the actor doesn't have to guess.
    company_url = f"https://www.linkedin.com/company/{handle}"
    company_input: dict[str, Any] = {"companies": [company_url]}
    posts_input: dict[str, Any] = {
        "targetUrls": [company_url],
        "maxPosts": 30,
    }

    async def _safe_run(key: str, run_input: dict[str, Any]) -> list[dict[str, Any]]:
        try:
            return await apify.run(
                key, run_input, actor_label=f"linkedin:{key}:{handle}", stage=3
            )
        except Exception:  # noqa: BLE001 — partial results still usable
            return []

    # Fan out both calls concurrently; the runner has its own semaphore so we
    # don't need one here.
    company_items, post_items = await asyncio.gather(
        _safe_run("social_linkedin_company", company_input),
        _safe_run("social_linkedin_posts", posts_input),
        return_exceptions=False,
    )

    if not company_items and not post_items:
        # Both failed (or both returned nothing) — surface as a clean error so
        # the orchestrator can propagate per the no-dummy-fallback policy.
        return SocialSnapshot(
            **snapshot_base,
            handle=handle,
            status="error",
            error_detail="linkedin: both company + posts actors returned empty",
        )

    # Normalize the company record.
    company_rec: dict[str, Any] | None = None
    for item in company_items:
        if isinstance(item, dict) and any(
            k in item for k in ("followerCount", "followersCount", "employeeCount")
        ):
            company_rec = item
            break

    # Normalize posts (harvestapi returns them as top-level records).
    raw_posts: list[dict[str, Any]] = [
        p for p in post_items if isinstance(p, dict)
    ]

    followers = safe_int(
        pick_first(company_rec, ("followerCount", "followersCount", "followers"))
    )

    # Normalize post shape for metric computation. harvestapi emits an
    # `engagement` subdict with `likes`, `comments`, `shares`, `reactions`.
    norm_posts = []
    for p in raw_posts:
        eng_obj = p.get("engagement") if isinstance(p.get("engagement"), dict) else {}
        likes = safe_int(
            pick_first(eng_obj, ("likes", "reactions"))
            or pick_first(p, ("numLikes", "likes", "reactionsCount", "totalReactions", "likesCount"))
        ) or 0
        comments = safe_int(
            pick_first(eng_obj, ("comments",))
            or pick_first(p, ("numComments", "comments", "commentsCount"))
        ) or 0
        shares = safe_int(
            pick_first(eng_obj, ("shares", "reposts"))
            or pick_first(p, ("numShares", "shares", "shareCount", "reposts"))
        ) or 0
        # harvestapi uses `content` for the post body.
        content = pick_first(p, ("content", "text", "postText", "commentary"))
        posted_at = pick_first(p, ("postedAt", "publishedAt", "timestamp", "date"))
        engagement = likes + 2 * comments + shares
        enriched = dict(p)
        enriched.update(
            content=content,
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
