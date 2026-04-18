"""Stage 03 coordinator — social scraping fan-out.

For each selected Competitor (top 5), fire all 5 platform adapters in
parallel. The global `ApifyRunner` semaphore (cap = 8) keeps the 25-way
fan-out within the Apify concurrency budget.

Per-platform failures do NOT abort the stage — they just become
`SocialSnapshot(status="error")` rows. Only if literally every one of the 25
invocations fails do we raise `ApifyUnavailable` so the orchestrator can
surface a real error state to the user (per the no-dummy-fallback policy).

Persistence
-----------
Every snapshot (ok / error / not_found) is written to `social_snapshots`.
Errors become rows too — the Results page needs the full 5×5 matrix to render
"platform missing" cells, and debugging a run is much easier when the DB
mirrors what was attempted, not just what succeeded.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Awaitable, Callable

from sqlalchemy.dialects.postgresql import insert as pg_insert

from api.apify_client import ApifyRunner, ApifyUnavailable
from api.db.schema import SocialSnapshotRow
from api.db.session import get_session
from api.models import Competitor, Platform, SocialSnapshot

from api.agents.social import facebook, instagram, linkedin, tiktok, twitter

if TYPE_CHECKING:  # pragma: no cover
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter

log = logging.getLogger(__name__)


_ADAPTER: dict[Platform, Callable[..., Awaitable[SocialSnapshot]]] = {
    "linkedin": linkedin.scrape,
    "twitter": twitter.scrape,
    "facebook": facebook.scrape,
    "instagram": instagram.scrape,
    "tiktok": tiktok.scrape,
}

_PLATFORMS: tuple[Platform, ...] = (
    "linkedin", "twitter", "facebook", "instagram", "tiktok",
)


async def run(
    *,
    run_id: str,
    competitors: list[Competitor],
    event_bus: "EventBus",
    kalibr: "KalibrRouter",  # noqa: ARG001 — stage 03 is Apify-only today
    apify: ApifyRunner,
) -> list[SocialSnapshot]:
    selected = [c for c in competitors if c.selected]
    if not selected:
        await event_bus.emit(
            agent="social_scraper",
            message="stage 03 · no selected competitors — skipping",
            kind="warn",
        )
        return []

    # Keep exactly the top 5 — the rest of the spec assumes 5×5 = 25.
    top = selected[:5]
    expected = len(top) * len(_PLATFORMS)

    await event_bus.emit(
        agent="social_scraper",
        message=(
            f"stage 03 · fan-out {len(top)} competitors × "
            f"{len(_PLATFORMS)} platforms = {expected} adapter calls"
        ),
        kind="info",
    )

    tasks: list[asyncio.Task[SocialSnapshot]] = []
    task_meta: list[tuple[Competitor, Platform]] = []
    for competitor in top:
        for platform in _PLATFORMS:
            adapter = _ADAPTER[platform]
            coro = adapter(
                competitor=competitor, apify=apify, event_bus=event_bus
            )
            tasks.append(asyncio.create_task(coro))
            task_meta.append((competitor, platform))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    snapshots: list[SocialSnapshot] = []
    n_ok = 0
    n_err = 0
    n_not_found = 0
    for idx, (raw, (competitor, platform)) in enumerate(zip(results, task_meta)):
        if isinstance(raw, BaseException):
            # Adapter contract says never raise; treat as error snapshot.
            snap = SocialSnapshot(
                snapshot_id="",
                competitor_id=competitor.competitor_id,
                platform=platform,
                last_scraped_at=datetime.now(timezone.utc),
                status="error",
                error_detail=f"adapter crashed: {raw}"[:500],
            )
        else:
            snap = raw

        snap_id = f"s_{run_id[-8:]}_{platform}_{idx:02d}"
        snap = snap.model_copy(update={"snapshot_id": snap_id})
        snapshots.append(snap)

        if snap.status == "ok":
            n_ok += 1
        elif snap.status == "not_found":
            n_not_found += 1
            await event_bus.emit(
                agent="social_scraper",
                message=(
                    f"{competitor.name} / {platform}: handle not found "
                    f"(handle={snap.handle})"
                ),
                kind="warn",
            )
        else:
            n_err += 1
            await event_bus.emit(
                agent="social_scraper",
                message=(
                    f"{competitor.name} / {platform}: error — "
                    f"{snap.error_detail or 'unknown'}"
                ),
                kind="warn",
            )

    # If every single attempt failed hard (no ok, no not_found), surface to the
    # orchestrator. not_found counts as "we tried and the platform said no",
    # which is still acceptable coverage.
    if expected > 0 and n_ok == 0 and n_not_found == 0:
        raise ApifyUnavailable(
            f"stage 03 · all {expected} social adapter calls failed"
        )

    # Persist every snapshot. Run is atomic inside one session.
    await _persist(run_id=run_id, snapshots=snapshots, event_bus=event_bus)

    await event_bus.emit(
        agent="social_scraper",
        message=(
            f"stage 03 · {n_ok}/{expected} snapshots ok, "
            f"{n_err} errors"
            + (f", {n_not_found} not_found" if n_not_found else "")
        ),
        kind="ok",
    )

    return snapshots


async def _persist(
    *,
    run_id: str,
    snapshots: list[SocialSnapshot],
    event_bus: "EventBus",
) -> None:
    if not snapshots:
        return
    try:
        async with get_session() as session:
            for snap in snapshots:
                top_posts_json = [
                    p.model_dump(mode="json", exclude_none=False)
                    for p in snap.top_posts
                ]
                values = dict(
                    snapshot_id=snap.snapshot_id,
                    run_id=run_id,
                    competitor_id=snap.competitor_id,
                    platform=snap.platform,
                    handle=snap.handle,
                    followers=snap.followers,
                    avg_engagement_rate=snap.avg_engagement_rate,
                    posting_cadence_per_week=snap.posting_cadence_per_week,
                    top_posts=top_posts_json,
                    last_scraped_at=snap.last_scraped_at,
                    status=snap.status,
                    error_detail=snap.error_detail,
                )
                stmt = pg_insert(SocialSnapshotRow).values(**values)
                # Idempotent upsert on the (competitor_id, platform) unique constraint.
                stmt = stmt.on_conflict_do_update(
                    index_elements=["competitor_id", "platform"],
                    set_={
                        k: v for k, v in values.items()
                        if k not in {"snapshot_id", "run_id", "competitor_id", "platform"}
                    },
                )
                await session.execute(stmt)
    except Exception as exc:  # noqa: BLE001
        # Persistence failure shouldn't nuke in-memory results the rest of the
        # pipeline depends on, but it MUST be loudly visible.
        log.exception("failed to persist social snapshots: %s", exc)
        await event_bus.emit(
            agent="social_scraper",
            message=f"persist failed: {exc}",
            kind="error",
        )


__all__ = ["run"]
