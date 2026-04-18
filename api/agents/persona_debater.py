"""Stage 06 — persona debater agent (docs/features.md §2 Stage 06, §3, §6).

Runs a 6-persona Minds AI panel against every deliberation target the
upstream stages produced (campaign angles, calendar slots, image assets).
Round 1 is a broadside ask to the panel; Round 2 (gated behind
`MINDS_ROUND_2=1`) rebuts each persona's peers. Per-target consensus is
computed with the `PERSONA_WEIGHTS` from `api/models.py`; assets where
≥3 personas score <0 are flagged `action_required=true`.

No cache fallback. If a spark/panel can't be created the run fails up.
Per-target failures degrade into a synthetic neutral verdict with a trace
warning, so one bad SSE read doesn't nuke the whole debate.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import uuid
from collections import defaultdict
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from api.db.schema import MindsSparkRow, PersonaReactionRow, VerdictRow
from api.db.session import get_session
from api.minds_client import MindsClient, MindsError
from api.models import (
    PERSONA_WEIGHTS,
    CalendarSlot,
    Campaign,
    CampaignAngle,
    ContentCalendar,
    ImageAsset,
    PersonaId,
    PersonaReaction,
    TargetType,
    Verdict,
)

if TYPE_CHECKING:  # pragma: no cover
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Persona briefs — composite archetypes, NOT named individuals (per §11).
# ---------------------------------------------------------------------------

PERSONA_BRIEFS: dict[PersonaId, str] = {
    "marketing_vp": (
        "You are a composite Marketing VP at a 200–2000 person B2B SaaS "
        "company. You own the GTM budget and the brand. You weigh every "
        "campaign against CAC, pipeline contribution, and category "
        "positioning. You reward fresh angles that break from tired "
        "category cliches and you are quick to reject ideas that feel "
        "derivative, vague, or would tank a brand narrative. Respond in "
        "character — terse, commercially literate, ROI-minded."
    ),
    "cfo_skeptic": (
        "You are a composite CFO of a mid-market SaaS company. You signed "
        "the check for this GTM experiment and you demand payback math. "
        "You are skeptical of vanity metrics, brand-first spending without "
        "a measurable funnel, and any timeline that front-loads cost "
        "without a clear sales trigger. You endorse ideas with clean "
        "unit economics and cut anything that smells speculative."
    ),
    "engineering_lead": (
        "You are a composite Engineering Lead — staff+ IC, hands-on, "
        "opinionated. You are the technical-credibility filter: you veto "
        "tone-deaf copy, hand-wavy capability claims, and buzzword soup. "
        "You favor honest, specific, builder-respecting messaging. When a "
        "claim won't survive a dev-Twitter thread, you say so bluntly."
    ),
    "target_end_user": (
        "You are a composite Target End-User — the exact ICP this product "
        "is built for. You don't care about GTM theater; you care whether "
        "the pitch describes your day, your pain, your workflow. You "
        "endorse copy and creative that makes you say 'finally, someone "
        "gets it' and you reject anything that sounds like it was written "
        "for an analyst not a practitioner."
    ),
    "social_media_manager": (
        "You are a composite Social Media Manager who will actually ship "
        "this calendar. You judge posts by: is the cadence doable? is the "
        "copy platform-native? is the hook strong enough to stop a thumb? "
        "You flag unworkable scheduling, off-voice creative, and "
        "one-size-fits-all posts that obviously weren't tuned per channel."
    ),
    "pr_brand_authority": (
        "You are a composite PR / Brand Authority advisor. Your job is to "
        "protect the brand from risk and hype-drift. You flag claims that "
        "could blow up on-record, tone that punches sideways at "
        "competitors in a reputation-costly way, and any creative that "
        "feels inconsistent with the product's stated values."
    ),
}

_PERSONA_DISCIPLINES: dict[PersonaId, str] = {
    "marketing_vp": "Marketing",
    "cfo_skeptic": "Finance",
    "engineering_lead": "Engineering",
    "target_end_user": "Product",
    "social_media_manager": "Marketing",
    "pr_brand_authority": "Communications",
}

_PERSONA_ORDER: list[PersonaId] = list(PERSONA_BRIEFS.keys())

# Structural caps (see docs/features.md §10 cost-control notes).
_MAX_TARGETS = 30
_MAX_TOP_SLOTS = 10
_MAX_TOP_ASSETS = 10
_CONCURRENCY = 4


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def run(
    *,
    run_id: str,
    campaign: Campaign,
    calendar: ContentCalendar,
    assets: list[ImageAsset],
    event_bus: "EventBus",
    kalibr: "KalibrRouter",
) -> tuple[list[PersonaReaction], list[Verdict]]:
    """Execute Stage 06 and return `(reactions, verdicts)`.

    Side effects
    ------------
    - Creates (or reuses cached) 6 Minds Sparks + one panel.
    - Persists `PersonaReactionRow` rows for Round 1 (+ Round 2 if enabled).
    - Persists a `VerdictRow` per target.
    """
    await event_bus.emit(
        agent="persona_debater",
        message="stage 06 · persona debate · instantiating 6 sparks",
        kind="info",
        meta={"stage": 6, "personas": _PERSONA_ORDER},
    )

    minds = MindsClient()
    try:
        # --- Spark + panel reuse-or-create -------------------------------
        spark_ids = await _load_or_create_sparks(minds=minds, bus=event_bus)
        panel_id = await _load_or_create_panel(
            minds=minds, spark_ids=spark_ids, bus=event_bus
        )

        spark_to_persona = {spark_ids[p]: p for p in _PERSONA_ORDER}

        # --- Select deliberation targets ---------------------------------
        targets = _select_targets(
            campaign=campaign,
            calendar=calendar,
            assets=assets,
        )
        await event_bus.emit(
            agent="persona_debater",
            message=(
                f"stage 06 · selected {len(targets)} targets "
                f"(angles={_count_kind(targets, 'angle')}, "
                f"slots={_count_kind(targets, 'slot')}, "
                f"assets={_count_kind(targets, 'asset')})"
            ),
            kind="info",
            meta={"stage": 6, "selection_cap": _MAX_TARGETS},
        )

        # --- Round 1 -----------------------------------------------------
        round1_by_target: dict[str, list[PersonaReaction]] = {}
        sem = asyncio.Semaphore(_CONCURRENCY)

        async def _r1(target: _Target) -> tuple[str, list[PersonaReaction]]:
            async with sem:
                return target.target_id, await _round1_for_target(
                    minds=minds,
                    panel_id=panel_id,
                    spark_ids=spark_ids,
                    spark_to_persona=spark_to_persona,
                    target=target,
                    run_id=run_id,
                    bus=event_bus,
                )

        r1_results = await asyncio.gather(
            *(_r1(t) for t in targets), return_exceptions=False
        )
        for target_id, reactions in r1_results:
            round1_by_target[target_id] = reactions

        # --- Round 2 (gated) --------------------------------------------
        round2_reactions: list[PersonaReaction] = []
        if os.getenv("MINDS_ROUND_2") == "1":
            await event_bus.emit(
                agent="persona_debater",
                message="stage 06 · round 2 rebuttals enabled",
                kind="info",
                meta={"stage": 6},
            )

            async def _r2(target: _Target) -> list[PersonaReaction]:
                async with sem:
                    return await _round2_for_target(
                        minds=minds,
                        spark_ids=spark_ids,
                        target=target,
                        run_id=run_id,
                        round1=round1_by_target.get(target.target_id, []),
                        bus=event_bus,
                    )

            r2_results = await asyncio.gather(
                *(_r2(t) for t in targets), return_exceptions=False
            )
            for bucket in r2_results:
                round2_reactions.extend(bucket)

        # --- Verdicts (computed from Round 1 consensus) ------------------
        verdicts: list[Verdict] = []
        action_required_count = 0
        for target in targets:
            reactions = round1_by_target.get(target.target_id, [])
            verdict = await _verdict_for(
                run_id=run_id,
                target=target,
                reactions=reactions,
                kalibr=kalibr,
                bus=event_bus,
            )
            verdicts.append(verdict)
            if verdict.action_required:
                action_required_count += 1

        all_reactions: list[PersonaReaction] = []
        for bucket in round1_by_target.values():
            all_reactions.extend(bucket)
        all_reactions.extend(round2_reactions)

        await _persist(run_id=run_id, reactions=all_reactions, verdicts=verdicts)

        await event_bus.emit(
            agent="persona_debater",
            message=(
                f"stage 06 · {len(all_reactions)} reactions, "
                f"{len(verdicts)} verdicts, {action_required_count} flagged"
            ),
            kind="ok",
            meta={
                "stage": 6,
                "round1": sum(1 for r in all_reactions if r.round == 1),
                "round2": sum(1 for r in all_reactions if r.round == 2),
                "action_required": action_required_count,
            },
        )

        return all_reactions, verdicts
    finally:
        await minds.aclose()


# ---------------------------------------------------------------------------
# Target selection
# ---------------------------------------------------------------------------


class _Target:
    """Internal deliberation target carrying enough context to serialize."""

    __slots__ = ("target_type", "target_id", "payload", "summary")

    def __init__(
        self,
        *,
        target_type: TargetType,
        target_id: str,
        payload: dict[str, Any],
        summary: str,
    ) -> None:
        self.target_type: TargetType = target_type
        self.target_id = target_id
        self.payload = payload
        self.summary = summary


def _select_targets(
    *,
    campaign: Campaign,
    calendar: ContentCalendar,
    assets: list[ImageAsset],
) -> list[_Target]:
    """Pick all angles + top N slots (by channel diversity) + top N assets
    (by angle diversity), capped at `_MAX_TARGETS`."""
    targets: list[_Target] = []

    # All campaign angles.
    for angle in campaign.angles:
        targets.append(_target_from_angle(angle))

    # Top slots by channel-diversity-first round-robin.
    slots_by_channel: dict[str, list[CalendarSlot]] = defaultdict(list)
    for slot in calendar.slots:
        slots_by_channel[slot.channel].append(slot)
    # Within each channel, prefer earlier days so the calendar is front-tested.
    for channel in slots_by_channel:
        slots_by_channel[channel].sort(key=lambda s: (s.day, s.slot_id))

    picked_slots: list[CalendarSlot] = []
    channels = sorted(slots_by_channel.keys())
    channel_cursors = {c: 0 for c in channels}
    while len(picked_slots) < _MAX_TOP_SLOTS and channels:
        progressed = False
        for c in list(channels):
            idx = channel_cursors[c]
            bucket = slots_by_channel[c]
            if idx < len(bucket):
                picked_slots.append(bucket[idx])
                channel_cursors[c] = idx + 1
                progressed = True
                if len(picked_slots) >= _MAX_TOP_SLOTS:
                    break
        if not progressed:
            break
    for slot in picked_slots:
        targets.append(_target_from_slot(slot))

    # Top assets — up to 2 per angle until the cap.
    assets_by_angle: dict[str, list[ImageAsset]] = defaultdict(list)
    for a in assets:
        assets_by_angle[a.campaign_angle_id].append(a)
    picked_assets: list[ImageAsset] = []
    per_angle_cap = 2
    for angle in campaign.angles:
        bucket = assets_by_angle.get(angle.angle_id, [])
        for a in bucket[:per_angle_cap]:
            picked_assets.append(a)
            if len(picked_assets) >= _MAX_TOP_ASSETS:
                break
        if len(picked_assets) >= _MAX_TOP_ASSETS:
            break
    # Backfill with any remaining assets if we're still under cap.
    if len(picked_assets) < _MAX_TOP_ASSETS:
        remaining = [a for a in assets if a not in picked_assets]
        picked_assets.extend(remaining[: _MAX_TOP_ASSETS - len(picked_assets)])
    for a in picked_assets:
        targets.append(_target_from_asset(a))

    # Enforce global cap. Keep angles first (highest signal), then slots, then assets.
    if len(targets) > _MAX_TARGETS:
        targets = targets[:_MAX_TARGETS]
    return targets


def _target_from_angle(angle: CampaignAngle) -> _Target:
    payload = {
        "kind": "campaign_angle",
        "angle_id": angle.angle_id,
        "hook": angle.hook,
        "positioning": angle.positioning,
        "channel_mix": angle.channel_mix,
        "rationale": angle.rationale,
    }
    summary = (
        f"Campaign angle — hook: {angle.hook}\n"
        f"positioning: {angle.positioning}\n"
        f"channels: {', '.join(angle.channel_mix)}\n"
        f"rationale: {angle.rationale}"
    )
    return _Target(
        target_type="angle",
        target_id=angle.angle_id,
        payload=payload,
        summary=summary,
    )


def _target_from_slot(slot: CalendarSlot) -> _Target:
    payload = {
        "kind": "calendar_slot",
        "slot_id": slot.slot_id,
        "day": slot.day,
        "channel": slot.channel,
        "post_type": slot.post_type,
        "copy": slot.post_copy,
        "posting_time": slot.posting_time,
        "rationale": slot.rationale,
    }
    summary = (
        f"Calendar slot — day {slot.day} at {slot.posting_time} on "
        f"{slot.channel} ({slot.post_type})\n"
        f"copy: {slot.post_copy}\n"
        f"rationale: {slot.rationale}"
    )
    return _Target(
        target_type="slot",
        target_id=slot.slot_id,
        payload=payload,
        summary=summary,
    )


def _target_from_asset(asset: ImageAsset) -> _Target:
    payload = {
        "kind": "image_asset",
        "asset_id": asset.asset_id,
        "campaign_angle_id": asset.campaign_angle_id,
        "prompt": asset.prompt,
        "model": asset.model,
    }
    summary = (
        f"Image asset for angle {asset.campaign_angle_id} — "
        f"generated by {asset.model}\n"
        f"prompt: {asset.prompt}"
    )
    return _Target(
        target_type="asset",
        target_id=asset.asset_id,
        payload=payload,
        summary=summary,
    )


def _count_kind(targets: list[_Target], kind: TargetType) -> int:
    return sum(1 for t in targets if t.target_type == kind)


# ---------------------------------------------------------------------------
# Spark + panel load-or-create
# ---------------------------------------------------------------------------


def _brief_hash(brief: str) -> str:
    return hashlib.sha256(brief.encode("utf-8")).hexdigest()[:32]


async def _load_or_create_sparks(
    *,
    minds: MindsClient,
    bus: "EventBus",
) -> dict[PersonaId, str]:
    """Return the persona→spark_id mapping, creating any missing sparks."""
    async with get_session() as session:
        result = await session.execute(select(MindsSparkRow))
        cached = {row.persona_id: row for row in result.scalars().all()}

    spark_ids: dict[PersonaId, str] = {}
    to_persist: list[tuple[PersonaId, str, str]] = []  # (persona, spark_id, hash)

    for persona in _PERSONA_ORDER:
        brief = PERSONA_BRIEFS[persona]
        brief_h = _brief_hash(brief)
        row = cached.get(persona)
        if row and row.system_prompt_hash == brief_h:
            spark_ids[persona] = row.spark_id
            continue
        # Missing or brief has been updated — create a fresh spark.
        try:
            spark_id = await minds.create_spark(
                name=f"shadowlaunch:{persona}",
                system_prompt=brief,
                discipline=_PERSONA_DISCIPLINES[persona],
            )
        except MindsError as exc:
            await bus.emit(
                agent="persona_debater",
                message=(
                    f"minds spark create failed for {persona}: {exc}. "
                    "Requires Premium+ plan tier to support 6 Sparks."
                ),
                kind="error",
                meta={"stage": 6, "persona": persona},
            )
            raise
        spark_ids[persona] = spark_id
        to_persist.append((persona, spark_id, brief_h))

    if to_persist:
        async with get_session() as session:
            for persona, spark_id, brief_h in to_persist:
                existing = await session.get(MindsSparkRow, persona)
                if existing is None:
                    session.add(
                        MindsSparkRow(
                            persona_id=persona,
                            spark_id=spark_id,
                            panel_id=None,
                            system_prompt_hash=brief_h,
                        )
                    )
                else:
                    existing.spark_id = spark_id
                    existing.system_prompt_hash = brief_h
                    existing.panel_id = None  # panel must be recreated when sparks change
    return spark_ids


async def _load_or_create_panel(
    *,
    minds: MindsClient,
    spark_ids: dict[PersonaId, str],
    bus: "EventBus",
) -> str:
    """Return a panel_id containing all 6 sparks, creating one if needed."""
    async with get_session() as session:
        result = await session.execute(select(MindsSparkRow))
        rows = result.scalars().all()

    existing_panel_ids = {r.panel_id for r in rows if r.panel_id}
    if len(existing_panel_ids) == 1:
        # Consistent cached panel across every persona row.
        (panel_id,) = existing_panel_ids
        if panel_id:
            return panel_id

    try:
        panel_id = await minds.create_panel(
            name="shadowlaunch-6-persona-panel",
            spark_ids=list(spark_ids.values()),
        )
    except MindsError as exc:
        await bus.emit(
            agent="persona_debater",
            message=(
                f"minds panel create failed: {exc}. "
                "Requires Premium+ plan tier to support a 6-Spark panel."
            ),
            kind="error",
            meta={"stage": 6},
        )
        raise

    async with get_session() as session:
        result = await session.execute(select(MindsSparkRow))
        for row in result.scalars().all():
            row.panel_id = panel_id
    return panel_id


# ---------------------------------------------------------------------------
# Round 1 — panel ask
# ---------------------------------------------------------------------------


_ROUND1_QUESTION_TEMPLATE = (
    "You are one of six synthetic buyer personas pressure-testing a GTM "
    "plan. Stay ruthlessly in character — your persona brief is your "
    "system prompt. React to the following target:\n\n"
    "TARGET ({target_type}):\n{summary}\n\n"
    "Respond with ONLY a single JSON object — no prose, no fences — of "
    "the form:\n"
    '{{"score": <float in [-1.0, +1.0]>, '
    '"quote": "<1–2 sentence in-character reaction>", '
    '"top_objection": "<one sentence, or empty string if endorsement>"}}\n'
    "score: -1 = reject outright, 0 = ambivalent, +1 = endorse enthusiastically."
)


async def _round1_for_target(
    *,
    minds: MindsClient,
    panel_id: str,
    spark_ids: dict[PersonaId, str],
    spark_to_persona: dict[str, PersonaId],
    target: _Target,
    run_id: str,
    bus: "EventBus",
) -> list[PersonaReaction]:
    """Ask the panel and return one `PersonaReaction` per persona."""
    question = _ROUND1_QUESTION_TEMPLATE.format(
        target_type=target.target_type,
        summary=target.summary,
    )

    try:
        events = await minds.ask_panel(panel_id=panel_id, question=question)
    except MindsError as exc:
        await bus.emit(
            agent="persona_debater",
            message=f"panel ask failed for {target.target_type}:{target.target_id}: {exc}",
            kind="warn",
            meta={"stage": 6, "target_id": target.target_id},
        )
        events = []

    reactions_by_persona = _reactions_from_sse(
        events=events,
        spark_to_persona=spark_to_persona,
        target=target,
        run_id=run_id,
    )

    # Fallback: for any persona that didn't parse cleanly, fire a single
    # spark_complete against their spark directly.
    for persona in _PERSONA_ORDER:
        if persona in reactions_by_persona:
            continue
        try:
            text = await minds.spark_complete(
                spark_id=spark_ids[persona],
                user_msg=question,
            )
        except MindsError as exc:
            await bus.emit(
                agent="persona_debater",
                message=(
                    f"per-spark fallback failed for {persona} on "
                    f"{target.target_id}: {exc}"
                ),
                kind="warn",
                meta={"stage": 6, "persona": persona},
            )
            reactions_by_persona[persona] = _neutral_reaction(
                run_id=run_id,
                persona=persona,
                target=target,
                reason="spark completion failed",
            )
            continue
        reaction = _parse_reaction_text(
            text=str(text),
            persona=persona,
            target=target,
            run_id=run_id,
        )
        reactions_by_persona[persona] = reaction

    return [reactions_by_persona[p] for p in _PERSONA_ORDER]


def _reactions_from_sse(
    *,
    events: list[dict],
    spark_to_persona: dict[str, PersonaId],
    target: _Target,
    run_id: str,
) -> dict[PersonaId, PersonaReaction]:
    """Extract one reaction per persona from the SSE payload list."""
    out: dict[PersonaId, PersonaReaction] = {}
    for event in events:
        spark_id = (
            event.get("spark_id")
            or event.get("sparkId")
            or (event.get("spark") or {}).get("id")
            or event.get("id")
        )
        persona = spark_to_persona.get(str(spark_id)) if spark_id else None
        content = _sse_content(event)
        if persona is None or not content:
            continue
        if persona in out:
            # First response per persona wins; later chunks are usually deltas.
            continue
        reaction = _parse_reaction_text(
            text=content,
            persona=persona,
            target=target,
            run_id=run_id,
        )
        out[persona] = reaction
    return out


def _sse_content(event: dict) -> str:
    for key in ("content", "text", "delta", "message", "response"):
        val = event.get(key)
        if isinstance(val, str) and val.strip():
            return val
        if isinstance(val, dict):
            nested = _sse_content(val)
            if nested:
                return nested
    return ""


def _parse_reaction_text(
    *,
    text: str,
    persona: PersonaId,
    target: _Target,
    run_id: str,
) -> PersonaReaction:
    """Best-effort parse a JSON reaction out of free text into a PersonaReaction."""
    score: float | None = None
    quote: str = ""
    top_objection: str | None = None

    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.lower().startswith("json"):
            stripped = stripped[4:].lstrip()
    if "{" in stripped and "}" in stripped:
        start = stripped.find("{")
        end = stripped.rfind("}")
        candidate = stripped[start : end + 1]
        try:
            obj = json.loads(candidate)
            if isinstance(obj, dict):
                raw_score = obj.get("score")
                if isinstance(raw_score, (int, float)):
                    score = float(raw_score)
                raw_quote = obj.get("quote")
                if isinstance(raw_quote, str):
                    quote = raw_quote.strip()
                raw_obj = obj.get("top_objection")
                if isinstance(raw_obj, str) and raw_obj.strip():
                    top_objection = raw_obj.strip()
        except json.JSONDecodeError:
            pass

    # Clamp score.
    if score is None:
        score = 0.0
    score = max(-1.0, min(1.0, score))

    if not quote:
        # Fall back to the raw text so the reaction still carries signal.
        quote = text.strip()[:240] or f"(no response from {persona})"

    return PersonaReaction(
        reaction_id=f"reaction-{uuid.uuid4().hex[:12]}",
        run_id=run_id,
        persona_id=persona,
        target_type=target.target_type,
        target_id=target.target_id,
        round=1,
        score=score,
        quote=quote,
        top_objection=top_objection,
    )


def _neutral_reaction(
    *,
    run_id: str,
    persona: PersonaId,
    target: _Target,
    reason: str,
) -> PersonaReaction:
    return PersonaReaction(
        reaction_id=f"reaction-{uuid.uuid4().hex[:12]}",
        run_id=run_id,
        persona_id=persona,
        target_type=target.target_type,
        target_id=target.target_id,
        round=1,
        score=0.0,
        quote=f"(no usable response — {reason})",
        top_objection=None,
    )


# ---------------------------------------------------------------------------
# Round 2 — per-spark rebuttals
# ---------------------------------------------------------------------------


async def _round2_for_target(
    *,
    minds: MindsClient,
    spark_ids: dict[PersonaId, str],
    target: _Target,
    run_id: str,
    round1: list[PersonaReaction],
    bus: "EventBus",
) -> list[PersonaReaction]:
    """For each persona, hand them the other 5's reactions and get a rebuttal."""
    by_persona = {r.persona_id: r for r in round1}
    rebuttals: list[PersonaReaction] = []

    async def _one(persona: PersonaId) -> PersonaReaction | None:
        others = [r for r in round1 if r.persona_id != persona]
        if not others:
            return None
        peer_summary = "\n".join(
            f"- {r.persona_id} (score={r.score:+.2f}): {r.quote}"
            + (f" // objection: {r.top_objection}" if r.top_objection else "")
            for r in others
        )
        self_reaction = by_persona.get(persona)
        self_block = (
            f"Your own round-1 reaction: score={self_reaction.score:+.2f} — "
            f"{self_reaction.quote}"
            if self_reaction
            else "Your own round-1 reaction was unavailable."
        )

        # Pick the most negative peer as the primary rebuttal target.
        negative_peers = [r for r in others if r.score < 0]
        rebuts_target: PersonaId | None = None
        if negative_peers:
            rebuts_target = min(negative_peers, key=lambda r: r.score).persona_id

        prompt = (
            "Round 2 rebuttal. You have already reacted to this target. Here "
            "is what the other five personas said. Respond — agree, push back, "
            "or refine — IN CHARACTER.\n\n"
            f"TARGET ({target.target_type}):\n{target.summary}\n\n"
            f"{self_block}\n\n"
            "OTHER PERSONAS' ROUND-1 REACTIONS:\n"
            f"{peer_summary}\n\n"
            "Respond with ONLY a single JSON object:\n"
            '{"score": <float in [-1.0, +1.0]>, '
            '"quote": "<1–2 sentence rebuttal or refinement>", '
            '"top_objection": "<one sentence, or empty string>"}'
        )

        try:
            text = await minds.spark_complete(
                spark_id=spark_ids[persona],
                user_msg=prompt,
            )
        except MindsError as exc:
            await bus.emit(
                agent="persona_debater",
                message=f"round-2 {persona} failed on {target.target_id}: {exc}",
                kind="warn",
                meta={"stage": 6, "persona": persona, "target_id": target.target_id},
            )
            return None

        reaction = _parse_reaction_text(
            text=str(text),
            persona=persona,
            target=target,
            run_id=run_id,
        )
        # Override round + rebuts metadata.
        return reaction.model_copy(
            update={"round": 2, "rebuts_persona_id": rebuts_target}
        )

    results = await asyncio.gather(*(_one(p) for p in _PERSONA_ORDER))
    for r in results:
        if r is not None:
            rebuttals.append(r)
    return rebuttals


# ---------------------------------------------------------------------------
# Verdict computation
# ---------------------------------------------------------------------------


async def _verdict_for(
    *,
    run_id: str,
    target: _Target,
    reactions: list[PersonaReaction],
    kalibr: "KalibrRouter",
    bus: "EventBus",
) -> Verdict:
    if not reactions:
        return Verdict(
            verdict_id=f"verdict-{uuid.uuid4().hex[:12]}",
            run_id=run_id,
            target_type=target.target_type,
            target_id=target.target_id,
            consensus_score=0.0,
            action_required=False,
            dissenting_personas=[],
            why="debate skipped due to platform error",
        )

    weight_sum = 0.0
    weighted_total = 0.0
    for r in reactions:
        w = PERSONA_WEIGHTS.get(r.persona_id, 0.0)
        weighted_total += r.score * w
        weight_sum += w
    consensus = weighted_total / weight_sum if weight_sum > 0 else 0.0
    consensus = max(-1.0, min(1.0, consensus))

    dissenting = [r.persona_id for r in reactions if r.score < 0]
    action_required = len(dissenting) >= 3

    why = await _synthesize_why(
        target=target,
        reactions=reactions,
        consensus=consensus,
        action_required=action_required,
        kalibr=kalibr,
        bus=bus,
    )

    return Verdict(
        verdict_id=f"verdict-{uuid.uuid4().hex[:12]}",
        run_id=run_id,
        target_type=target.target_type,
        target_id=target.target_id,
        consensus_score=consensus,
        action_required=action_required,
        dissenting_personas=dissenting,
        why=why,
    )


async def _synthesize_why(
    *,
    target: _Target,
    reactions: list[PersonaReaction],
    consensus: float,
    action_required: bool,
    kalibr: "KalibrRouter",
    bus: "EventBus",
) -> str:
    """Ask Kalibr for a 1–2 sentence narrative synthesis of the debate."""
    reactions_block = "\n".join(
        f"- {r.persona_id} (score={r.score:+.2f}): {r.quote}"
        + (f" // objection: {r.top_objection}" if r.top_objection else "")
        for r in reactions
    )
    system = (
        "You are a GTM strategy synthesist. Summarize a persona debate into "
        "a 1–2 sentence verdict rationale. Plain prose, no bullets, no JSON."
    )
    user = (
        f"TARGET ({target.target_type}):\n{target.summary}\n\n"
        f"PERSONA REACTIONS:\n{reactions_block}\n\n"
        f"CONSENSUS SCORE: {consensus:+.2f}\n"
        f"ACTION REQUIRED: {action_required}\n\n"
        "Write 1–2 sentences explaining the verdict — cite the strongest "
        "endorsement or the most decisive objection. No preamble."
    )
    try:
        text = await kalibr.complete(
            goal="persona_facilitation",
            system=system,
            user=user,
            max_tokens=200,
        )
    except Exception as exc:  # noqa: BLE001 — Kalibr is best-effort here
        await bus.emit(
            agent="persona_debater",
            message=f"verdict synthesis (kalibr) failed: {exc}",
            kind="warn",
            meta={"stage": 6, "target_id": target.target_id},
        )
        return "weighted-score consensus only; LLM synthesis unavailable."
    rendered = str(text).strip()
    if not rendered:
        return "weighted-score consensus only; LLM synthesis unavailable."
    # Keep it compact.
    if len(rendered) > 500:
        rendered = rendered[:500].rstrip() + "…"
    return rendered


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


async def _persist(
    *,
    run_id: str,
    reactions: list[PersonaReaction],
    verdicts: list[Verdict],
) -> None:
    async with get_session() as session:
        for r in reactions:
            session.add(
                PersonaReactionRow(
                    reaction_id=r.reaction_id,
                    run_id=run_id,
                    persona_id=r.persona_id,
                    target_type=r.target_type,
                    target_id=r.target_id,
                    round=r.round,
                    score=r.score,
                    quote=r.quote,
                    top_objection=r.top_objection,
                    rebuts_persona_id=r.rebuts_persona_id,
                )
            )
        for v in verdicts:
            session.add(
                VerdictRow(
                    verdict_id=v.verdict_id,
                    run_id=run_id,
                    target_type=v.target_type,
                    target_id=v.target_id,
                    consensus_score=v.consensus_score,
                    action_required=v.action_required,
                    dissenting_personas=list(v.dissenting_personas),
                    why=v.why,
                )
            )


__all__ = ["PERSONA_BRIEFS", "run"]
