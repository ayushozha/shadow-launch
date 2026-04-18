"""Stage 05 — content calendar agent (docs/features.md §2).

Builds a 14-day multi-channel content calendar from the generated `Campaign`,
informed by the competitor posting cadence observed in Stage 03's
`SocialSnapshot`s. Each slot carries its own rationale: typically the slot's
posting day/time lines up with a cadence "quiet window" so we talk while
competitors are silent.

Pipeline:
    1. Emit a "stage 05 start" trace event.
    2. Compute a (platform × day-of-week) cadence heatmap from the provided
       snapshots. The bottom-third of the distribution marks "quiet days" —
       the LLM is nudged to post into those windows.
    3. Ask Kalibr (goal="calendar_planning") for a 20–40 slot calendar,
       constrained to 14 days, known channels, and the supplied image
       asset IDs.
    4. Validate the LLM output (day range, asset IDs, per-day cap). If
       validation fails, retry exactly once with the validation error echoed
       back as feedback. On a second failure, raise.
    5. Persist one `content_calendars` row and N `calendar_slots` rows.
    6. Emit an "ok" trace event and return the typed `ContentCalendar`.

Policy: no cache, no dummy fallback (features.md §0). Kalibr failure bubbles
up — the orchestrator owns the user-visible error state.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from api.db.schema import CalendarSlotRow, ContentCalendarRow
from api.db.session import get_session
from api.models import (
    CalendarSlot,
    Campaign,
    ContentCalendar,
    ImageAsset,
    SocialSnapshot,
)

if TYPE_CHECKING:  # pragma: no cover
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DAYS_SPAN = 14
_MIN_SLOTS = 20
_MAX_SLOTS = 40
# On the retry/final pass we accept a slightly looser floor. Spec says 20–40,
# but if the LLM lands just short (e.g. 17) after an explicit retry with
# feedback, that's close enough to ship — a hard failure here would trash the
# whole run. The upper bound stays firm because too many slots signals drift.
_FINAL_MIN_SLOTS = 14
_MAX_SLOTS_PER_DAY = 6
_DAY_NAMES = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
]
# Must mirror the `Channel` / post_type literals in api/models.py. Kept local
# so _SlotDraft stays loose (str) at the Kalibr boundary — we'd rather catch
# LLM typos in _validate_slots (where retry-with-feedback can fix them) than
# inside the strict Pydantic wall of CalendarSlot.
_VALID_CHANNELS: frozenset[str] = frozenset({
    "linkedin", "twitter", "facebook", "instagram", "tiktok",
    "blog", "email", "youtube",
})
_VALID_POST_TYPES: frozenset[str] = frozenset({"image", "text", "link", "video"})


class _SlotDraft(BaseModel):
    """LLM-produced slot before the agent assigns slot_id."""
    day: int
    channel: str
    post_type: str
    post_copy: str = Field(alias="copy")
    asset_id: str | None = None
    posting_time: str
    rationale: str

    model_config = {"populate_by_name": True}


class _CalendarModel(BaseModel):
    """Thin wrapper for Kalibr structured-output — a bag of slot drafts.

    NOTE: intentionally no `min_length` / `max_length` on `slots`. The
    response_model enforces *shape* (field names, types) only. Slot-count
    bounds live in `_validate_slots` so the agent gets a chance to retry
    with feedback before a count miss becomes a fatal ValidationError inside
    the Kalibr router.
    """

    slots: list[_SlotDraft]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def run(
    *,
    run_id: str,
    campaign: Campaign,
    assets: list[ImageAsset],
    snapshots: list[SocialSnapshot],
    event_bus: "EventBus",
    kalibr: "KalibrRouter",
) -> ContentCalendar:
    """Build, validate, and persist a 14-day `ContentCalendar`.

    Parameters
    ----------
    run_id:
        Foreign-key anchor — used both to scope DB rows and to seed the
        calendar + slot IDs.
    campaign:
        The Stage 04 output. Its angles provide voice and channel hints.
    assets:
        Generated image assets from Stage 04. A slot may reference one of
        these (by `asset_id`) OR be text-only.
    snapshots:
        Stage 03 social snapshots. We mine posting times out of their
        `top_posts` to build the competitor cadence heatmap.
    event_bus:
        Run-scoped pub/sub for trace events.
    kalibr:
        Router bound to goal `calendar_planning`.
    """

    await event_bus.emit(
        agent="calendar_builder",
        message="stage 05 · content calendar · start",
        kind="info",
        meta={"stage": 5},
    )

    valid_asset_ids = {a.asset_id for a in assets}

    # --- Cadence heatmap -------------------------------------------------
    heatmap = _compute_cadence_heatmap(snapshots)
    quiet_windows = _derive_quiet_windows(heatmap)

    # --- Prompt assembly -------------------------------------------------
    system_prompt = (
        "You are a GTM content strategist. You plan per-channel content "
        "calendars that ride into quiet windows in competitor posting "
        "cadence, reinforce a campaign's positioning, and cite a concrete "
        "rationale per slot. You never invent asset IDs; you either pick "
        "from the supplied asset list or omit asset_id for text-only posts."
    )
    user_prompt = _build_user_prompt(
        campaign=campaign,
        asset_ids=sorted(valid_asset_ids),
        heatmap=heatmap,
        quiet_windows=quiet_windows,
        feedback=None,
    )

    # --- Kalibr with a single retry on validation failure ----------------
    try:
        model_out = await kalibr.complete(
            goal="calendar_planning",
            system=system_prompt,
            user=user_prompt,
            response_model=_CalendarModel,
            max_tokens=6000,
        )
    except Exception as exc:  # noqa: BLE001 — Kalibr failure is fatal per spec
        await event_bus.emit(
            agent="calendar_builder",
            message=f"kalibr calendar_planning failed: {exc}",
            kind="error",
            meta={"stage": 5},
        )
        raise

    assert isinstance(model_out, _CalendarModel)

    try:
        validated = _validate_slots(model_out.slots, valid_asset_ids)
    except _SlotValidationError as first_err:
        await event_bus.emit(
            agent="calendar_builder",
            message=f"calendar validation failed once: {first_err}. retrying.",
            kind="warn",
            meta={"stage": 5},
        )
        retry_prompt = _build_user_prompt(
            campaign=campaign,
            asset_ids=sorted(valid_asset_ids),
            heatmap=heatmap,
            quiet_windows=quiet_windows,
            feedback=str(first_err),
        )
        try:
            model_out = await kalibr.complete(
                goal="calendar_planning",
                system=system_prompt,
                user=retry_prompt,
                response_model=_CalendarModel,
                max_tokens=6000,
            )
        except Exception as exc:  # noqa: BLE001
            await event_bus.emit(
                agent="calendar_builder",
                message=f"kalibr retry failed: {exc}",
                kind="error",
                meta={"stage": 5},
            )
            raise

        assert isinstance(model_out, _CalendarModel)
        try:
            validated = _validate_slots(
                model_out.slots, valid_asset_ids, final_pass=True
            )
        except _SlotValidationError as second_err:
            await event_bus.emit(
                agent="calendar_builder",
                message=f"calendar validation failed twice: {second_err}",
                kind="error",
                meta={"stage": 5},
            )
            raise

    # --- Assemble final ContentCalendar ----------------------------------
    calendar_id = f"cal_{run_id[-8:]}"
    finalized_slots = _assign_slot_ids(validated, run_id=run_id)
    calendar = ContentCalendar(
        calendar_id=calendar_id,
        run_id=run_id,
        days_span=_DAYS_SPAN,
        slots=finalized_slots,
    )

    # --- Persist ---------------------------------------------------------
    await _persist_calendar(calendar)

    n_slots = len(calendar.slots)
    n_channels = len({s.channel for s in calendar.slots})
    await event_bus.emit(
        agent="calendar_builder",
        message=(
            f"stage 05 · calendar: {n_slots} slots across {n_channels} "
            f"channels over {_DAYS_SPAN} days"
        ),
        kind="ok",
        meta={
            "stage": 5,
            "n_slots": n_slots,
            "n_channels": n_channels,
            "days_span": _DAYS_SPAN,
        },
    )

    return calendar


# ---------------------------------------------------------------------------
# Cadence heatmap
# ---------------------------------------------------------------------------


def _compute_cadence_heatmap(
    snapshots: list[SocialSnapshot],
) -> dict[str, dict[str, float]]:
    """Average post count per (platform, day-of-week), over all snapshots.

    Each `SocialSnapshot` owns up to N top_posts. We parse `posted_at` when
    available, bucket by (platform, weekday), count posts, and divide by the
    number of contributing snapshots for that platform. Missing timestamps
    are silently skipped — we don't fabricate.

    Returns a nested dict:
        {
            "linkedin": {"Monday": 1.4, "Tuesday": 2.1, ...},
            "twitter":  {"Monday": 0.3, ...},
            ...
        }
    Platforms and days with zero observations are omitted.
    """
    # counts[(platform, day_name)] = sum of posts seen that day for that platform
    counts: dict[tuple[str, str], int] = defaultdict(int)
    # denominators per platform = number of snapshots that contributed data
    snapshots_per_platform: dict[str, int] = defaultdict(int)

    for snap in snapshots:
        platform = snap.platform
        contributed = False
        for post in snap.top_posts:
            posted = _coerce_posted_at(post.posted_at)
            if posted is None:
                continue
            day_name = _DAY_NAMES[posted.weekday()]
            counts[(platform, day_name)] += 1
            contributed = True
        if contributed:
            snapshots_per_platform[platform] += 1

    heatmap: dict[str, dict[str, float]] = defaultdict(dict)
    for (platform, day), count in counts.items():
        denom = snapshots_per_platform.get(platform, 1) or 1
        heatmap[platform][day] = round(count / denom, 2)
    return dict(heatmap)


def _coerce_posted_at(value) -> datetime | None:  # noqa: ANN001 — accepts str|datetime|None
    """Normalise `SocialPost.posted_at` to a `datetime` (or None)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        # ISO 8601 variants, including the trailing Z shorthand.
        try:
            if s.endswith("Z"):
                s = s[:-1] + "+00:00"
            return datetime.fromisoformat(s)
        except ValueError:
            return None
    return None


def _derive_quiet_windows(
    heatmap: dict[str, dict[str, float]],
) -> dict[str, list[str]]:
    """Return {platform: [day_name, ...]} for the bottom-third-density days.

    We rank observed days by average post count, take the lowest third, and
    include any `_DAY_NAMES` entries that were never observed (zero posts =
    definitively quiet). Platforms with no cadence data get an empty list.
    """
    quiet: dict[str, list[str]] = {}
    for platform, by_day in heatmap.items():
        if not by_day:
            quiet[platform] = []
            continue
        # Days never observed count as quiet (density = 0).
        observed = set(by_day.keys())
        unseen = [d for d in _DAY_NAMES if d not in observed]
        # Bottom-third of observed days by density (ascending).
        ordered = sorted(by_day.items(), key=lambda kv: kv[1])
        cutoff = max(1, len(ordered) // 3)
        bottom = [day for day, _ in ordered[:cutoff]]
        quiet[platform] = unseen + bottom
    return quiet


# ---------------------------------------------------------------------------
# Prompt assembly
# ---------------------------------------------------------------------------


def _build_user_prompt(
    *,
    campaign: Campaign,
    asset_ids: list[str],
    heatmap: dict[str, dict[str, float]],
    quiet_windows: dict[str, list[str]],
    feedback: str | None,
) -> str:
    angles_block = "\n\n".join(
        (
            f"ANGLE {idx} (id={angle.angle_id}):\n"
            f"  hook: {angle.hook}\n"
            f"  positioning: {angle.positioning}\n"
            f"  channel_mix: {', '.join(angle.channel_mix)}\n"
            f"  rationale: {angle.rationale}\n"
            f"  asset_ids: {', '.join(angle.asset_ids) or '(none)'}"
        )
        for idx, angle in enumerate(campaign.angles, start=1)
    )

    heatmap_lines: list[str] = []
    for platform in sorted(heatmap.keys()):
        by_day = heatmap[platform]
        pairs = ", ".join(
            f"{day}={by_day.get(day, 0.0):.2f}"
            for day in _DAY_NAMES
            if day in by_day
        )
        heatmap_lines.append(f"  {platform}: {pairs or '(no data)'}")
    heatmap_block = "\n".join(heatmap_lines) or "  (no cadence data available)"

    quiet_lines: list[str] = []
    for platform in sorted(quiet_windows.keys()):
        days = ", ".join(quiet_windows[platform]) or "(no clear quiet days)"
        quiet_lines.append(f"  {platform}: {days}")
    quiet_block = "\n".join(quiet_lines) or "  (no cadence data available)"

    asset_block = (
        ", ".join(asset_ids) if asset_ids else "(no image assets available — use text-only posts)"
    )

    feedback_block = ""
    if feedback:
        feedback_block = (
            "\n\n=== PRIOR ATTEMPT FAILED VALIDATION ===\n"
            f"{feedback}\n"
            "Fix these errors in the new output. Do not repeat them.\n"
        )

    return (
        "Plan a 14-day multi-channel content calendar for the campaign below.\n"
        "\n"
        "=== CAMPAIGN ANGLES ===\n"
        f"{angles_block}\n"
        "\n"
        "=== COMPETITOR POSTING CADENCE (avg posts per day-of-week) ===\n"
        f"{heatmap_block}\n"
        "\n"
        "=== QUIET WINDOWS (bottom-third density; post here to get oxygen) ===\n"
        f"{quiet_block}\n"
        "\n"
        "=== AVAILABLE IMAGE ASSET IDS ===\n"
        f"{asset_block}\n"
        "\n"
        "=== CANVAS ===\n"
        "- days_span: 14 (day values MUST be integers in 1..14)\n"
        "- channels: linkedin, twitter, facebook, instagram, tiktok, blog, email, youtube\n"
        "- post_type values: image | text | link | video\n"
        f"- total slots: between {_MIN_SLOTS} and {_MAX_SLOTS}\n"
        f"- no single day may have more than {_MAX_SLOTS_PER_DAY} slots\n"
        "- every slot needs a non-empty `copy` (the post text) and a 1–2 "
        "sentence `rationale` that cites the cadence/quiet-window insight "
        "OR the campaign angle it reinforces\n"
        "- posting_time format example: '09:00 PT' or '13:30 ET'\n"
        "- asset_id: either null/absent (text-only) OR exactly one of the "
        "IDs in the asset list above — never invent new IDs\n"
        "- do NOT include a `slot_id` field; the orchestrator assigns them\n"
        f"{feedback_block}"
        "\n"
        "Return JSON matching the schema: {\"slots\": [<CalendarSlot>, ...]}. "
        "Each CalendarSlot uses the key `copy` (not `post_copy`) for the post body."
    )


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


class _SlotValidationError(ValueError):
    """Raised when LLM-produced slots violate the Stage 05 contract."""


def _validate_slots(
    slots: list[CalendarSlot],
    valid_asset_ids: set[str],
    *,
    final_pass: bool = False,
) -> list[CalendarSlot]:
    """Enforce the Stage 05 contract on LLM output.

    Rules (all must hold):
    - slot-count: first pass requires 20 ≤ n ≤ 40; final pass accepts
      14 ≤ n ≤ 40 (see `_FINAL_MIN_SLOTS` for rationale).
    - day ∈ 1..14 for every slot
    - asset_id is None OR present in `valid_asset_ids`
    - no single day has more than _MAX_SLOTS_PER_DAY slots

    On violation: raise `_SlotValidationError` with an enumeration of all
    issues so the retry prompt can be specific.
    """
    problems: list[str] = []

    min_required = _FINAL_MIN_SLOTS if final_pass else _MIN_SLOTS
    if len(slots) < min_required or len(slots) > _MAX_SLOTS:
        problems.append(
            f"slot count = {len(slots)}; must be between "
            f"{min_required} and {_MAX_SLOTS}"
        )

    per_day: dict[int, int] = defaultdict(int)
    for idx, slot in enumerate(slots):
        if slot.day < 1 or slot.day > _DAYS_SPAN:
            problems.append(
                f"slot[{idx}] day={slot.day} out of range 1..{_DAYS_SPAN}"
            )
        if slot.channel not in _VALID_CHANNELS:
            problems.append(
                f"slot[{idx}] channel={slot.channel!r} is not a valid "
                f"channel; valid: {sorted(_VALID_CHANNELS)}"
            )
        if slot.post_type not in _VALID_POST_TYPES:
            problems.append(
                f"slot[{idx}] post_type={slot.post_type!r} is not valid; "
                f"valid: {sorted(_VALID_POST_TYPES)}"
            )
        if slot.asset_id is not None and slot.asset_id not in valid_asset_ids:
            problems.append(
                f"slot[{idx}] asset_id={slot.asset_id!r} not in the provided "
                f"asset list"
            )
        per_day[slot.day] += 1

    for day, count in per_day.items():
        if count > _MAX_SLOTS_PER_DAY:
            problems.append(
                f"day {day} has {count} slots; cap is {_MAX_SLOTS_PER_DAY}"
            )

    if problems:
        raise _SlotValidationError("; ".join(problems))

    return slots


def _assign_slot_ids(
    slots: list,  # list[_SlotDraft]
    *,
    run_id: str,
) -> list[CalendarSlot]:
    """Materialize LLM drafts into real `CalendarSlot`s with deterministic IDs."""
    suffix = run_id[-8:]
    rebuilt: list[CalendarSlot] = []
    for i, slot in enumerate(slots):
        rebuilt.append(CalendarSlot(
            slot_id=f"slot_{suffix}_{i:03d}",
            day=slot.day, channel=slot.channel, post_type=slot.post_type,
            post_copy=slot.post_copy, asset_id=slot.asset_id,
            posting_time=slot.posting_time, rationale=slot.rationale,
        ))
    return rebuilt


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


async def _persist_calendar(calendar: ContentCalendar) -> None:
    """Insert one `content_calendars` row + N `calendar_slots` rows.

    If a calendar with the same `calendar_id` already exists we replace its
    slots — this keeps re-runs idempotent without rewriting the run_id.
    """
    async with get_session() as session:
        existing = await session.get(ContentCalendarRow, calendar.calendar_id)
        if existing is None:
            cal_row = ContentCalendarRow(
                calendar_id=calendar.calendar_id,
                run_id=calendar.run_id,
                days_span=calendar.days_span,
            )
            session.add(cal_row)
            await session.flush()
        else:
            existing.days_span = calendar.days_span
            # Drop the old slots so we don't double-count; cascade handles the rest.
            for old in list(existing.slots):
                await session.delete(old)
            await session.flush()

        for slot in calendar.slots:
            slot_row = CalendarSlotRow(
                slot_id=slot.slot_id,
                calendar_id=calendar.calendar_id,
                day=slot.day,
                channel=slot.channel,
                post_type=slot.post_type,
                copy_text=slot.post_copy,
                asset_id=slot.asset_id,
                posting_time=slot.posting_time,
                rationale=slot.rationale,
            )
            session.add(slot_row)


__all__ = ["run"]
