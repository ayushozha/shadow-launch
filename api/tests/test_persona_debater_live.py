"""Live smoke test for Stage 06 — persona debater agent.

Runs against real Minds AI + real Kalibr + real Postgres (via SSH tunnel).
Skipped unless every prerequisite is present so CI-without-secrets stays green.

Cost notice
-----------
A single invocation of this test spends real Minds plan quota: ≥6 Round-1
reactions per target (6 sparks × 4 targets = 24 reactions minimum) plus
optionally 6 Round-2 spark completions per target if `MINDS_ROUND_2=1`.
Gate behind `SHADOW_LAUNCH_EXPENSIVE=1` to avoid accidental quota burn.
"""

from __future__ import annotations

import asyncio
import os
import socket
import uuid
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# Env bootstrap + gates
# ---------------------------------------------------------------------------


def _load_dotenv_if_present() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def _key_looks_real(name: str) -> bool:
    val = os.environ.get(name) or ""
    if not val:
        return False
    if val.endswith("...") or val.lower() in {"changeme", "todo", "placeholder"}:
        return False
    return len(val) >= 20


def _tunnel_up(host: str = "127.0.0.1", port: int = 5433, timeout: float = 1.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


@pytest.fixture(autouse=True)
def _env():
    _load_dotenv_if_present()
    yield


def _skip_unless_live() -> None:
    for var in ("MINDS_API_KEY", "DATABASE_URL"):
        if not _key_looks_real(var):
            pytest.skip(f"{var} not set / looks like a placeholder")
    if not _tunnel_up():
        pytest.skip("SSH tunnel to 127.0.0.1:5433 is not up")
    if os.getenv("SHADOW_LAUNCH_EXPENSIVE") != "1":
        pytest.skip(
            "SHADOW_LAUNCH_EXPENSIVE=1 required — this test spends real "
            "Minds plan quota."
        )


# ---------------------------------------------------------------------------
# Test
# ---------------------------------------------------------------------------


def test_persona_debater_live_minimal():
    """Hand-built minimal inputs; assert 6-per-target reactions + verdicts."""
    _skip_unless_live()

    from sqlalchemy import select

    from api.agents.persona_debater import run as debate_run
    from api.db.schema import Base, MindsSparkRow, RunRow
    from api.db.session import get_engine, get_session
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter
    from api.models import (
        CalendarSlot,
        Campaign,
        CampaignAngle,
        ContentCalendar,
        ImageAsset,
    )

    run_id = f"test-debate-{uuid.uuid4().hex[:8]}"

    angle = CampaignAngle(
        angle_id=f"angle-{uuid.uuid4().hex[:8]}",
        hook="The planner your PMs already wanted.",
        positioning="A lightweight alternative to heavyweight roadmap tools.",
        channel_mix=["linkedin", "twitter"],
        rationale="Competitors oversell enterprise tooling; SMBs want simple.",
        evidence_competitor_ids=[],
        asset_ids=[],
    )
    slot_one = CalendarSlot(
        slot_id=f"slot-{uuid.uuid4().hex[:8]}",
        day=2,
        channel="linkedin",
        post_type="text",
        copy=(
            "Why 80% of roadmap tools overshoot SMB needs — and the four "
            "features most teams actually use."
        ),
        posting_time="09:00 PT",
        rationale="Monday morning thought-leadership window; competitors quiet.",
    )
    slot_two = CalendarSlot(
        slot_id=f"slot-{uuid.uuid4().hex[:8]}",
        day=5,
        channel="twitter",
        post_type="text",
        copy="Roadmap fatigue is real. Here's what we cut to ship faster.",
        posting_time="14:00 PT",
        rationale="Mid-week engagement peak on dev-twitter.",
    )
    asset = ImageAsset(
        asset_id=f"asset-{uuid.uuid4().hex[:8]}",
        campaign_angle_id=angle.angle_id,
        prompt=(
            "A minimalist product screenshot of a project planner with four "
            "clearly-labeled tasks and a calm, paper-like aesthetic."
        ),
        model="gpt-image-1",
    )

    campaign = Campaign(
        campaign_id=f"campaign-{uuid.uuid4().hex[:8]}",
        run_id=run_id,
        angles=[angle],
    )
    calendar = ContentCalendar(
        calendar_id=f"calendar-{uuid.uuid4().hex[:8]}",
        run_id=run_id,
        days_span=14,
        slots=[slot_one, slot_two],
    )
    assets = [asset]

    async def _exec():
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Seed runs row so FK-backed reaction/verdict inserts land.
        async with get_session() as session:
            session.add(
                RunRow(
                    run_id=run_id,
                    product_url="https://example.shadowlaunch.test",
                    status="running",
                )
            )

        bus = EventBus(run_id)
        kalibr = KalibrRouter(event_bus=bus)

        try:
            reactions, verdicts = await debate_run(
                run_id=run_id,
                campaign=campaign,
                calendar=calendar,
                assets=assets,
                event_bus=bus,
                kalibr=kalibr,
            )
        finally:
            await bus.close()

        # Also return spark rows for assertion below.
        async with get_session() as session:
            result = await session.execute(select(MindsSparkRow))
            spark_rows = list(result.scalars().all())
        return reactions, verdicts, spark_rows

    reactions, verdicts, spark_rows = asyncio.run(
        asyncio.wait_for(_exec(), timeout=600)
    )

    # --- Assertions -------------------------------------------------------
    # 4 targets (1 angle + 2 slots + 1 asset) × 6 personas = 24 round-1 reactions.
    expected_targets = 4
    round1 = [r for r in reactions if r.round == 1]
    assert len(round1) == expected_targets * 6, (
        f"expected {expected_targets * 6} round-1 reactions, got {len(round1)} "
        f"(total reactions={len(reactions)})"
    )

    # Each target should have a verdict.
    assert len(verdicts) == expected_targets, (
        f"expected {expected_targets} verdicts, got {len(verdicts)}"
    )
    target_ids = {v.target_id for v in verdicts}
    assert angle.angle_id in target_ids
    assert slot_one.slot_id in target_ids
    assert slot_two.slot_id in target_ids
    assert asset.asset_id in target_ids

    # Consensus must be bounded, `why` must be non-empty.
    for v in verdicts:
        assert -1.0 <= v.consensus_score <= 1.0
        assert v.why.strip()

    # All 6 personas cached in minds_sparks with a panel_id attached.
    persona_ids = {row.persona_id for row in spark_rows}
    assert persona_ids == {
        "marketing_vp",
        "cfo_skeptic",
        "engineering_lead",
        "target_end_user",
        "social_media_manager",
        "pr_brand_authority",
    }, f"unexpected personas in minds_sparks: {persona_ids}"
    panel_ids = {row.panel_id for row in spark_rows if row.panel_id}
    assert len(panel_ids) == 1, (
        f"expected exactly one panel_id cached across personas, got {panel_ids}"
    )
