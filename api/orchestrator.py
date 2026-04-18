"""Shadow Launch v2 pipeline orchestrator (see docs/features.md §3 and §2).

The pipeline graph
------------------
A single pipeline run threads seven stage nodes (6 primary + 1 parallel
market-discourse side-car) against a shared ``EventBus`` and ``KalibrRouter``.

    Stage 01  product_researcher      (Apify + Kalibr)   -> ProductProfile
    Stage 02  competitor_discoverer   (Apify + Kalibr)   -> list[Competitor]
    Stage 03  social_scraper          (Apify)            -> list[SocialSnapshot]
    Stage 03.5 market_discourse       (Apify + Kalibr)   -> MarketDiscourse
         ^^^ stages 03 and 03.5 execute concurrently via asyncio.gather
    Stage 04  campaign_generator      (Kalibr + Images)  -> (Campaign, [ImageAsset])
    Stage 05  calendar_builder        (Kalibr)           -> ContentCalendar
    Stage 06  persona_debater         (Minds AI)         -> ([PersonaReaction], [Verdict])

Each stage agent is responsible for its own DB writes — the orchestrator
only touches the ``runs`` row (to flip ``status``, persist ``cost_usd_total``,
stamp ``completed_at``, and best-effort capture ``kalibr_trace_capsule_id``).

Lazy-import policy
------------------
Sibling stage modules are developed in parallel. To keep ``from
api.orchestrator import run_pipeline`` viable even while they are still being
written, every agent module is imported inside ``run_pipeline``'s body rather
than at module scope. The only module-level dependencies are ``api.models``,
``api.db`` and ``api.apify_client`` — all of which land before the agents.

Failure policy
--------------
Any stage-level exception marks the run ``failed``, stores ``error_detail``,
and re-raises. There are no cache fallbacks or partial-success modes — callers
(``api/main.py``) translate the raised exception into an HTTP error surface.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import func, select

from .apify_client import ApifyRunner
from .db.schema import KalibrEventRow, RunRow, TraceEventRow
from .db.session import get_session
from .models import (
    Campaign,
    Competitor,
    ContentCalendar,
    ImageAsset,
    KalibrEvent,
    MarketDiscourse,
    PersonaReaction,
    ProductProfile,
    Run,
    RunInput,
    SocialSnapshot,
    TraceEvent,
    Verdict,
)

if TYPE_CHECKING:  # pragma: no cover — type-only imports
    from .events import EventBus
    from .kalibr_router import KalibrRouter


log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# DB helpers — the orchestrator only touches the `runs` row. Every other
# table is owned by the stage agent that produced it.
# ---------------------------------------------------------------------------


async def _set_run_status(run_id: str, status: str) -> None:
    async with get_session() as session:
        row = await session.get(RunRow, run_id)
        if row is None:
            log.warning("runs row missing for %s while setting status=%s", run_id, status)
            return
        row.status = status


async def _mark_run_completed(
    run_id: str,
    *,
    cost_usd_total: float,
    kalibr_trace_capsule_id: str | None,
) -> None:
    async with get_session() as session:
        row = await session.get(RunRow, run_id)
        if row is None:
            log.warning("runs row missing for %s at completion", run_id)
            return
        row.status = "completed"
        row.completed_at = datetime.now(timezone.utc)
        row.cost_usd_total = float(cost_usd_total)
        if kalibr_trace_capsule_id is not None:
            row.kalibr_trace_capsule_id = kalibr_trace_capsule_id


async def _mark_run_failed(run_id: str, *, error_detail: str) -> None:
    async with get_session() as session:
        row = await session.get(RunRow, run_id)
        if row is None:
            log.warning("runs row missing for %s at failure mark", run_id)
            return
        row.status = "failed"
        row.error_detail = error_detail[:4000]


async def _load_run_created_at(run_id: str) -> datetime:
    """Best-effort fetch of the persisted `created_at`; fall back to now()."""
    try:
        async with get_session() as session:
            stmt = select(RunRow.created_at).where(RunRow.run_id == run_id)
            result = await session.execute(stmt)
            created_at = result.scalar_one_or_none()
            if created_at is not None:
                return created_at
    except Exception as exc:  # pragma: no cover — DB hiccup shouldn't kill the run
        log.debug("could not load created_at for %s: %s", run_id, exc)
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Cost aggregation
# ---------------------------------------------------------------------------


async def _aggregate_cost(
    *,
    run_id: str,
    trace: list[TraceEvent],
    kalibr_events: list[KalibrEvent],
) -> float:
    """Sum every dollar delta we can observe during the run.

    Source of truth is the DB: we SUM ``trace_events.kalibr_cost_delta_usd``
    and ``kalibr_events.cost_usd_delta`` for this run. Both tables are
    populated independently — text-gen routes through the bus's persist tap
    (Kalibr router attaches cost on the success emit), image-gen writes
    directly to ``kalibr_events`` AND emits a trace-event with the same
    dollar figure. Summing across both tables double-counts image-gen by
    design: see the reconciliation below.

    We avoid the double-count by only summing trace rows whose agent is the
    Kalibr router itself (``agent='kalibr'``) for the trace-side total. That
    leaves ``kalibr_events`` as the single authority for image-gen dollars,
    while ``trace_events`` covers text-gen dollars.

    Fallback: if the DB is unreachable we sum the in-memory lists, which is
    the pre-DB behaviour and keeps the run from failing over a cost-ticker
    hiccup.
    """
    try:
        async with get_session() as session:
            trace_stmt = (
                select(func.coalesce(func.sum(TraceEventRow.kalibr_cost_delta_usd), 0.0))
                .where(TraceEventRow.run_id == run_id)
                .where(TraceEventRow.kalibr_cost_delta_usd.is_not(None))
                .where(TraceEventRow.agent == "kalibr")
            )
            kalibr_stmt = (
                select(func.coalesce(func.sum(KalibrEventRow.cost_usd_delta), 0.0))
                .where(KalibrEventRow.run_id == run_id)
                .where(KalibrEventRow.cost_usd_delta.is_not(None))
            )
            trace_total = float((await session.execute(trace_stmt)).scalar_one() or 0.0)
            kalibr_total = float((await session.execute(kalibr_stmt)).scalar_one() or 0.0)
            return trace_total + kalibr_total
    except Exception as exc:  # noqa: BLE001 — fall back to in-memory on any DB issue
        log.warning(
            "cost aggregation DB query failed for run %s (%s); falling back to in-memory",
            run_id,
            exc,
        )

    total = 0.0
    for ev in kalibr_events:
        delta = getattr(ev, "cost_usd_delta", None)
        if delta is not None:
            total += float(delta)
    for ev in trace:
        if getattr(ev, "agent", None) != "kalibr":
            continue
        delta = getattr(ev, "kalibr_cost_delta_usd", None)
        if delta is not None:
            total += float(delta)
    return total


def _best_effort_capsule_id(kalibr: "KalibrRouter") -> str | None:
    """Pull a Kalibr trace-capsule id off the router if the SDK exposes one."""
    for attr in ("trace_capsule_id", "capsule_id", "trace_id"):
        accessor = getattr(kalibr, attr, None)
        if accessor is None:
            continue
        try:
            value = accessor() if callable(accessor) else accessor
        except Exception:  # noqa: BLE001 — telemetry best-effort
            continue
        if value:
            return str(value)
    return None


# ---------------------------------------------------------------------------
# Stage wrapper — emits a standardized error trace on failure and re-raises.
# ---------------------------------------------------------------------------


async def _run_stage(
    stage_label: str,
    coro,
    *,
    event_bus: "EventBus",
):
    try:
        return await coro
    except Exception as exc:
        await event_bus.emit(
            agent="orchestrator",
            message=f"stage {stage_label} failed: {exc}",
            kind="error",
        )
        raise


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


async def run_pipeline(
    inputs: RunInput,
    *,
    event_bus: "EventBus",
    kalibr: "KalibrRouter",
    run_id: str,
) -> Run:
    """Thread the 6-stage (+Stage 03.5) pipeline for one run.

    See module docstring for the stage graph. The returned ``Run`` object is
    a fully-hydrated Pydantic view assembled from every stage's return value
    plus the final ``event_bus.history()`` and ``kalibr.events()``.
    """
    # Lazy imports — agents are being developed in parallel and some may not
    # exist yet at module load time. Importing inside the function keeps
    # `from api.orchestrator import run_pipeline` working regardless.
    from .agents import (  # noqa: PLC0415 — intentional lazy import
        calendar_builder,
        campaign_generator,
        competitor_discoverer,
        market_discourse,
        persona_debater,
        product_researcher,
        social_scraper,
    )

    started_monotonic = time.monotonic()
    created_at = await _load_run_created_at(run_id)

    await event_bus.emit(
        agent="orchestrator",
        message=f"pipeline start · run_id={run_id}",
        kind="info",
    )

    try:
        await _set_run_status(run_id, "running")
    except Exception as exc:  # pragma: no cover — surface DB issues loudly
        await event_bus.emit(
            agent="orchestrator",
            message=f"could not flip runs.status to running: {exc}",
            kind="warn",
        )

    # Single Apify runner for the whole pipeline so concurrency and tracing
    # are bounded consistently.
    apify = ApifyRunner(event_bus=event_bus)

    # Placeholders so the Run assembly can still run on the failure path
    # (the handler below re-raises before we touch these, but the types stay
    # explicit for the reader).
    profile: ProductProfile | None = None
    competitors: list[Competitor] = []
    snapshots: list[SocialSnapshot] = []
    discourse: MarketDiscourse | None = None
    campaign: Campaign | None = None
    assets: list[ImageAsset] = []
    calendar: ContentCalendar | None = None
    reactions: list[PersonaReaction] = []
    verdicts: list[Verdict] = []

    try:
        # ---------------- Stage 01 — Product research ---------------------
        profile = await _run_stage(
            "01 product_researcher",
            product_researcher.run(
                run_id=run_id,
                inputs=inputs,
                event_bus=event_bus,
                kalibr=kalibr,
                apify=apify,
            ),
            event_bus=event_bus,
        )

        # ---------------- Stage 02 — Competitor discovery -----------------
        competitors = await _run_stage(
            "02 competitor_discoverer",
            competitor_discoverer.run(
                run_id=run_id,
                profile=profile,
                event_bus=event_bus,
                kalibr=kalibr,
                apify=apify,
            ),
            event_bus=event_bus,
        )

        # ---------------- Stages 03 + 03.5 (parallel) ---------------------
        social_coro = _run_stage(
            "03 social_scraper",
            social_scraper.run(
                run_id=run_id,
                competitors=competitors,
                event_bus=event_bus,
                kalibr=kalibr,
                apify=apify,
            ),
            event_bus=event_bus,
        )
        discourse_coro = _run_stage(
            "03.5 market_discourse",
            market_discourse.run(
                run_id=run_id,
                profile=profile,
                competitors=competitors,
                event_bus=event_bus,
                kalibr=kalibr,
                apify=apify,
            ),
            event_bus=event_bus,
        )
        snapshots, discourse = await asyncio.gather(social_coro, discourse_coro)

        # ---------------- Stage 04 — Campaign generation ------------------
        campaign_result: tuple[Campaign, list[ImageAsset]] = await _run_stage(
            "04 campaign_generator",
            campaign_generator.run(
                run_id=run_id,
                profile=profile,
                competitors=competitors,
                snapshots=snapshots,
                discourse=discourse,
                event_bus=event_bus,
                kalibr=kalibr,
            ),
            event_bus=event_bus,
        )
        campaign, assets = campaign_result

        # ---------------- Stage 05 — Calendar ------------------------------
        calendar = await _run_stage(
            "05 calendar_builder",
            calendar_builder.run(
                run_id=run_id,
                campaign=campaign,
                assets=assets,
                snapshots=snapshots,
                event_bus=event_bus,
                kalibr=kalibr,
            ),
            event_bus=event_bus,
        )

        # ---------------- Stage 06 — Persona debate ------------------------
        debate_result: tuple[list[PersonaReaction], list[Verdict]] = await _run_stage(
            "06 persona_debater",
            persona_debater.run(
                run_id=run_id,
                campaign=campaign,
                calendar=calendar,
                assets=assets,
                event_bus=event_bus,
                kalibr=kalibr,
            ),
            event_bus=event_bus,
        )
        reactions, verdicts = debate_result

    except Exception as exc:
        try:
            await _mark_run_failed(run_id, error_detail=str(exc))
        except Exception as inner:  # pragma: no cover
            log.warning("failed to mark run %s failed after error: %s", run_id, inner)
        await event_bus.emit(
            agent="orchestrator",
            message=f"pipeline failed · {exc}",
            kind="error",
        )
        raise

    # ---------------- Success: aggregate + persist + emit -----------------
    trace_history = event_bus.history()
    kalibr_events = kalibr.events()
    # Give the fire-and-forget trace persistence tasks a brief window to
    # flush before we query trace_events. Without this the final cost sum
    # can miss the last few emits that were scheduled just before we got
    # here. 100ms is plenty for the asyncpg writes in this demo.
    await asyncio.sleep(0.1)
    cost_total = await _aggregate_cost(
        run_id=run_id, trace=trace_history, kalibr_events=kalibr_events
    )
    capsule_id = _best_effort_capsule_id(kalibr)

    try:
        await _mark_run_completed(
            run_id,
            cost_usd_total=cost_total,
            kalibr_trace_capsule_id=capsule_id,
        )
    except Exception as exc:  # pragma: no cover
        await event_bus.emit(
            agent="orchestrator",
            message=f"runs row update (completed) failed: {exc}",
            kind="warn",
        )

    duration_s = time.monotonic() - started_monotonic
    await event_bus.emit(
        agent="orchestrator",
        message=f"pipeline complete · cost=${cost_total:.2f} · duration={duration_s:.0f}s",
        kind="ok",
    )

    # Refresh history so the pipeline-complete event is part of the Run.
    trace_history = event_bus.history()
    completed_at = datetime.now(timezone.utc)

    return Run(
        run_id=run_id,
        status="completed",
        created_at=created_at,
        completed_at=completed_at,
        cost_usd_total=cost_total,
        kalibr_trace_capsule_id=capsule_id,
        input=inputs,
        product_profile=profile,
        competitors=competitors,
        social_snapshots=snapshots,
        discourse=discourse,
        campaign=campaign,
        calendar=calendar,
        reactions=reactions,
        verdicts=verdicts,
        trace=trace_history,
        kalibr_events=kalibr_events,
    )


__all__ = ["run_pipeline"]
