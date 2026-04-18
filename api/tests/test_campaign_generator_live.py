"""Live smoke test for api.agents.campaign_generator.

Expensive — each run produces ~6–9 images @ ~$0.04 each (~$0.24–$0.36). Opt in
via `SHADOW_LAUNCH_EXPENSIVE=1` so CI doesn't bill itself into the ground.

Skips when:
- `SHADOW_LAUNCH_EXPENSIVE` is not set (or not "1"/"true"/"yes")
- `OPENAI_API_KEY` is missing / placeholder
- `DATABASE_URL` is missing
- DB schema hasn't been created (we try a create_all as a best effort)
"""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# .env + key sanity helpers (mirrors test_kalibr.py)
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
    if not val or val.endswith("...") or val.lower() in {"changeme", "todo", "placeholder"}:
        return False
    return len(val) >= 20


def _opted_in() -> bool:
    flag = os.environ.get("SHADOW_LAUNCH_EXPENSIVE", "").strip().lower()
    return flag in {"1", "true", "yes", "on"}


@pytest.fixture(autouse=True)
def _env():
    _load_dotenv_if_present()
    yield


# ---------------------------------------------------------------------------
# Smoke
# ---------------------------------------------------------------------------


def test_live_campaign_generator_roundtrip():
    if not _opted_in():
        pytest.skip(
            "SHADOW_LAUNCH_EXPENSIVE not set — skipping expensive image-gen test "
            "(~$0.12–$0.40 per run)."
        )
    if not _key_looks_real("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY missing or placeholder")
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL not set")

    asyncio.run(_run_live())


async def _run_live() -> None:
    # Deferred imports so the module still imports in a bare environment.
    from sqlalchemy import select

    from api.agents.campaign_generator import run as campaign_run
    from api.db.schema import Base, CampaignRow, ImageAssetRow, RunRow
    from api.db.session import get_engine, get_session
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter
    from api.models import (
        Competitor,
        DiscourseItem,
        MarketDiscourse,
        ProductProfile,
        SocialPost,
        SocialSnapshot,
    )

    # Make sure tables exist on this DB (idempotent).
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    run_id = f"test_{uuid.uuid4().hex[:8]}"

    # Parent `runs` row is required by the FKs.
    async with get_session() as session:
        session.add(
            RunRow(
                run_id=run_id,
                product_url="https://example.com",
                status="running",
            )
        )

    profile = ProductProfile(
        product_url="https://linear.app",
        brand_name="Linear",
        one_liner="The issue tracker engineers actually want to use.",
        category="Project management",
        positioning_claims=[
            "Blazing-fast issue tracking built for modern engineering teams.",
            "Keyboard-first workflows that reward speed.",
            "Opinionated defaults that replace configuration sprawl.",
        ],
        implicit_audience=(
            "Early- and growth-stage SaaS engineering teams of 20–150 "
            "developers who are frustrated with Jira's heavyweight rituals."
        ),
        tone_inventory=["crisp", "confident", "design-led"],
        messaging_gaps=[
            "Most competitors talk to PMs; Linear's audience is ICs.",
        ],
    )
    competitors = [
        Competitor(
            competitor_id="comp_jira",
            url="https://atlassian.com/software/jira",
            name="Jira",
            positioning="Workflow-heavy issue tracker for scaled orgs.",
            relevance_score=0.92,
            discovery_source="google_serp",
            selected=True,
        ),
        Competitor(
            competitor_id="comp_shortcut",
            url="https://shortcut.com",
            name="Shortcut",
            positioning="Story-driven project management for product teams.",
            relevance_score=0.71,
            discovery_source="product_hunt",
            selected=True,
        ),
    ]
    snapshots = [
        SocialSnapshot(
            snapshot_id="snap_jira_li",
            competitor_id="comp_jira",
            platform="linkedin",
            handle="atlassian",
            followers=1_200_000,
            avg_engagement_rate=0.004,
            posting_cadence_per_week=5.0,
            top_posts=[SocialPost(content="Jira helps teams ship.", likes=420)],
            last_scraped_at=datetime.now(timezone.utc),
        ),
        SocialSnapshot(
            snapshot_id="snap_shortcut_li",
            competitor_id="comp_shortcut",
            platform="linkedin",
            handle="shortcut",
            followers=18_000,
            avg_engagement_rate=0.021,
            posting_cadence_per_week=3.0,
            top_posts=[SocialPost(content="How we plan sprints.", likes=90)],
            last_scraped_at=datetime.now(timezone.utc),
        ),
    ]
    discourse = MarketDiscourse(
        run_id=run_id,
        reddit_items=[
            DiscourseItem(
                source="reddit",
                body="Jira feels like it was designed by lawyers. Linear is a breath of fresh air.",
                sentiment_score=0.6,
                upvotes=140,
            ),
        ],
        trustpilot_items=[
            DiscourseItem(
                source="trustpilot",
                body="Linear is fast but I wish it had better roadmapping.",
                sentiment_score=0.1,
                rating=4,
            ),
        ],
        top_complaints=["Jira is slow and config-heavy", "Roadmap views too minimal"],
        top_desires=["Keyboard-first UX", "Less admin overhead"],
    )

    bus = EventBus(run_id)
    kalibr = KalibrRouter(event_bus=bus)

    campaign, assets = await campaign_run(
        run_id=run_id,
        profile=profile,
        competitors=competitors,
        snapshots=snapshots,
        discourse=discourse,
        event_bus=bus,
        kalibr=kalibr,
    )

    # --- Assertions on the in-memory return values ---------------------------
    assert 1 <= len(campaign.angles) <= 3
    assert len(assets) >= 3  # at least 3 total (≥1 per angle x 1–3 angles)
    for angle in campaign.angles:
        assert angle.asset_ids, f"angle {angle.angle_id} has no assets"
    for asset in assets:
        assert asset.model == "gpt-image-1"
        assert asset.width == 1024 and asset.height == 1024

    # --- Assertions on what landed in the database ---------------------------
    async with get_session() as session:
        crow = await session.get(CampaignRow, campaign.campaign_id)
        assert crow is not None
        assert len(crow.angles) == len(campaign.angles)

        rows = (
            await session.execute(
                select(ImageAssetRow).where(ImageAssetRow.run_id == run_id)
            )
        ).scalars().all()
        assert len(rows) == len(assets)
        for r in rows:
            assert r.bytes_ and len(r.bytes_) > 100  # real PNG, not zero bytes
            assert r.media_type == "image/png"
