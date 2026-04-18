"""Live smoke test for Stage 03 (social scraper).

Skips unless APIFY_TOKEN + DATABASE_URL are set. Invokes adapters directly
against 2 hand-built Competitors (Asana + Jira) with selected=True and
asserts at least 5/10 snapshots return status='ok'.

Run with:
    APIFY_TOKEN=... DATABASE_URL=... pytest -k social_scraper_live -s
"""

from __future__ import annotations

import os

import pytest

from api.agents.social_scraper import run as social_run
from api.apify_client import ApifyRunner
from api.events import EventBus
from api.kalibr_router import KalibrRouter
from api.models import Competitor


pytestmark = pytest.mark.asyncio


def _skip_if_offline() -> None:
    missing = [
        k for k in ("APIFY_TOKEN", "DATABASE_URL")
        if not os.getenv(k)
    ]
    if missing:
        pytest.skip(f"live test requires env: {', '.join(missing)}")


async def test_stage_03_live_smoke() -> None:
    _skip_if_offline()

    competitors = [
        Competitor(
            competitor_id="c_asana",
            url="https://asana.com/",  # type: ignore[arg-type]
            name="Asana",
            positioning="Team work management",
            relevance_score=0.9,
            discovery_source="manual",
            selected=True,
        ),
        Competitor(
            competitor_id="c_jira",
            url="https://www.atlassian.com/software/jira",  # type: ignore[arg-type]
            name="Jira",
            positioning="Issue + project tracking",
            relevance_score=0.85,
            discovery_source="manual",
            selected=True,
        ),
    ]

    bus = EventBus("smoke-run-social")
    try:
        apify = ApifyRunner(event_bus=bus)
        kalibr = KalibrRouter(event_bus=bus)

        # Use a run_id that ALMOST-certainly isn't in the DB already.
        # Persistence path is best-effort — we tolerate its failure in this
        # smoke test so environments without the schema still see coverage.
        import uuid
        run_id = f"smoke_{uuid.uuid4().hex[:16]}"

        snapshots = await social_run(
            run_id=run_id,
            competitors=competitors,
            event_bus=bus,
            kalibr=kalibr,
            apify=apify,
        )

        assert len(snapshots) == 10, f"expected 10 snapshots, got {len(snapshots)}"
        ok_count = sum(1 for s in snapshots if s.status == "ok")
        # Lenient threshold: some platforms (Facebook, TikTok) are notoriously
        # flaky and handle derivation for Atlassian-owned Jira won't match all
        # platforms. 5/10 is the contractual minimum.
        assert ok_count >= 5, (
            f"expected >=5 ok snapshots, got {ok_count} — "
            f"statuses={[s.status for s in snapshots]}"
        )
    finally:
        await bus.close()
