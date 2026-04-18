"""Live smoke test for Stage 05 — `agent-calendar-builder`.

Skips unless both `OPENAI_API_KEY` and `DATABASE_URL` are configured. We hit
a real LLM via Kalibr and write real rows into the `content_calendars` +
`calendar_slots` tables using the SSH-tunneled Postgres on the shared VPS.

What we assert (per the Stage 05 contract in docs/features.md §2):
- 20 ≤ len(slots) ≤ 40
- every slot has non-empty `post_copy` and `rationale`
- every slot's `asset_id` is either None or in the provided asset set
- every slot.day is in 1..14
"""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest


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
    if not val or val.endswith("...") or val.lower() in {"changeme", "todo", "placeholder"}:
        return False
    return len(val) >= 20


@pytest.fixture(autouse=True)
def _env():
    _load_dotenv_if_present()
    yield


def test_calendar_builder_live_smoke():
    if not _key_looks_real("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY not set / looks like a placeholder")
    if not os.getenv("DATABASE_URL"):
        pytest.skip("DATABASE_URL not set")

    # Deferred imports so the module loads even without SDKs installed.
    from api.agents.calendar_builder import run as calendar_run
    from api.db.schema import Base, RunRow
    from api.db.session import get_engine, get_session
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter
    from api.models import (
        Campaign,
        CampaignAngle,
        ImageAsset,
        SocialPost,
        SocialSnapshot,
    )

    run_id = f"run_caltest_{uuid.uuid4().hex[:8]}"

    # --- Hand-built fixtures -----------------------------------------------
    angles = [
        CampaignAngle(
            angle_id="angle_01",
            hook="Ship in minutes, not meetings",
            positioning="The fastest workflow automation for lean GTM teams",
            channel_mix=["linkedin", "twitter", "blog", "email"],
            rationale="Competitors talk about enterprise; we own speed.",
            evidence_competitor_ids=["c1", "c2"],
            asset_ids=["asset_caltest_01"],
        ),
        CampaignAngle(
            angle_id="angle_02",
            hook="Your growth loop, visualized",
            positioning="See every dollar's path from ad to revenue",
            channel_mix=["linkedin", "instagram", "youtube"],
            rationale="Nobody in the space shows the full attribution picture.",
            evidence_competitor_ids=["c3"],
            asset_ids=["asset_caltest_02"],
        ),
    ]
    campaign = Campaign(
        campaign_id=f"camp_{run_id[-8:]}",
        run_id=run_id,
        angles=angles,
    )

    assets = [
        ImageAsset(
            asset_id="asset_caltest_01",
            campaign_angle_id="angle_01",
            prompt="A minimalist dashboard over a pale background",
            model="gpt-image-1",
        ),
        ImageAsset(
            asset_id="asset_caltest_02",
            campaign_angle_id="angle_02",
            prompt="An abstract growth loop diagram",
            model="gpt-image-1",
        ),
    ]
    asset_ids = {a.asset_id for a in assets}

    # 10 snapshots across 5 platforms × 2 competitors, each with a few
    # timestamped top_posts so the cadence heatmap has real signal.
    snapshots: list[SocialSnapshot] = []
    base = datetime.now(timezone.utc) - timedelta(days=30)
    platforms = ["linkedin", "twitter", "facebook", "instagram", "tiktok"]
    for comp_idx in range(2):
        comp_id = f"comp_{comp_idx:02d}"
        for p_idx, platform in enumerate(platforms):
            top_posts = [
                SocialPost(
                    post_id=f"p_{comp_idx}_{p_idx}_{i}",
                    content=f"sample post {i} from {comp_id} on {platform}",
                    posted_at=(base + timedelta(days=i * 3 + p_idx)).isoformat(),
                    likes=50 + i * 10,
                    comments=5 + i,
                )
                for i in range(6)
            ]
            snapshots.append(
                SocialSnapshot(
                    snapshot_id=f"snap_{comp_id}_{platform}",
                    competitor_id=comp_id,
                    platform=platform,
                    handle=f"@{comp_id}_{platform}",
                    followers=10000 + comp_idx * 2500,
                    avg_engagement_rate=0.03,
                    posting_cadence_per_week=4.5,
                    top_posts=top_posts,
                    last_scraped_at=datetime.now(timezone.utc),
                    status="ok",
                )
            )
    assert len(snapshots) == 10

    bus = EventBus(run_id)
    router = KalibrRouter(event_bus=bus)

    async def _main():
        # Tables + parent `runs` row must exist before we write a calendar
        # (FK to runs.run_id).
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with get_session() as session:
            if await session.get(RunRow, run_id) is None:
                session.add(
                    RunRow(
                        run_id=run_id,
                        product_url="https://example.test/calendar-smoke",
                        status="running",
                    )
                )

        return await calendar_run(
            run_id=run_id,
            campaign=campaign,
            assets=assets,
            snapshots=snapshots,
            event_bus=bus,
            kalibr=router,
        )

    calendar = asyncio.run(_main())

    # --- Assertions --------------------------------------------------------
    assert calendar.run_id == run_id
    assert calendar.days_span == 14
    n = len(calendar.slots)
    assert 20 <= n <= 40, f"expected 20..40 slots, got {n}"

    days = set()
    channels = set()
    for slot in calendar.slots:
        assert slot.post_copy.strip(), f"empty copy on {slot.slot_id}"
        assert slot.rationale.strip(), f"empty rationale on {slot.slot_id}"
        assert 1 <= slot.day <= 14, f"bad day {slot.day} on {slot.slot_id}"
        assert slot.asset_id is None or slot.asset_id in asset_ids, (
            f"{slot.slot_id} references unknown asset {slot.asset_id!r}"
        )
        assert slot.posting_time.strip(), f"empty posting_time on {slot.slot_id}"
        days.add(slot.day)
        channels.add(slot.channel)

    print(
        f"\n[calendar live] slots={n} channels={sorted(channels)} "
        f"days_touched={len(days)}"
    )
