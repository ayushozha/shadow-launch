"""Live smoke test for Stage 03.5 — market discourse agent.

Runs against real Apify + real Kalibr + real Postgres (via SSH tunnel).
Skipped unless every prerequisite is present so CI-without-secrets stays green.
"""

from __future__ import annotations

import asyncio
import os
import socket
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# Env loading + gates
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
    if not _key_looks_real("APIFY_TOKEN"):
        pytest.skip("APIFY_TOKEN not set (or placeholder)")
    if not os.getenv("KALIBR_API_KEY") or not os.getenv("KALIBR_TENANT_ID"):
        pytest.skip("KALIBR_API_KEY / KALIBR_TENANT_ID not set")
    if not (_key_looks_real("ANTHROPIC_API_KEY") or _key_looks_real("OPENAI_API_KEY")):
        pytest.skip("No real model API key available for Kalibr fallback route")
    if not os.getenv("DATABASE_URL"):
        pytest.skip("DATABASE_URL not set")
    if not _tunnel_up():
        pytest.skip("SSH tunnel to Postgres (127.0.0.1:5433) is not up")


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------


@pytest.mark.timeout(90)
def test_market_discourse_live():
    _skip_unless_live()

    # Deferred imports so the module loads cleanly without secrets.
    from api.agents.market_discourse import run
    from api.apify_client import ApifyRunner
    from api.db.schema import Base, RunRow
    from api.db.session import get_engine, get_session
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter
    from api.models import Competitor, ProductProfile

    run_id = f"md-live-{uuid.uuid4().hex[:10]}"

    profile = ProductProfile(
        product_url="https://linear.app",
        brand_name="Linear",
        one_liner="The issue tracker built for modern software teams.",
        category="project management software",
        positioning_claims=[
            "Purpose-built for product teams",
            "Keyboard-driven workflow",
            "Opinionated defaults",
        ],
        implicit_audience=(
            "Engineering and product teams at high-growth startups who find Jira "
            "heavyweight and want a fast, keyboard-first issue tracker."
        ),
        tone_inventory=["minimalist", "confident", "technical"],
        messaging_gaps=[],
    )
    competitors = [
        Competitor(
            competitor_id="c-jira",
            url="https://www.atlassian.com/software/jira",
            name="Jira",
            positioning="Configurable issue and project tracking for every team.",
            relevance_score=0.9,
            discovery_source="google_serp",
            selected=True,
        ),
        Competitor(
            competitor_id="c-asana",
            url="https://asana.com",
            name="Asana",
            positioning="Work management for teams of any size.",
            relevance_score=0.7,
            discovery_source="google_serp",
            selected=True,
        ),
    ]

    async def _go():
        # Ensure tables exist + a parent run row (FK target).
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with get_session() as session:
            session.add(
                RunRow(
                    run_id=run_id,
                    product_url=str(profile.product_url),
                    status="running",
                )
            )

        bus = EventBus(run_id)
        kalibr = KalibrRouter(event_bus=bus)
        apify = ApifyRunner(event_bus=bus)

        discourse = await run(
            run_id=run_id,
            profile=profile,
            competitors=competitors,
            event_bus=bus,
            kalibr=kalibr,
            apify=apify,
        )
        return discourse

    discourse = asyncio.run(_go())

    # Hard acceptance asserts.
    assert len(discourse.top_complaints) >= 2, (
        f"expected >=2 complaints, got {discourse.top_complaints!r}"
    )
    assert (
        len(discourse.reddit_items) > 0 or len(discourse.trustpilot_items) > 0
    ), "expected at least one source to return non-empty items"

    print(
        f"\n[discourse live] reddit={len(discourse.reddit_items)} "
        f"trustpilot={len(discourse.trustpilot_items)} "
        f"complaints={len(discourse.top_complaints)} "
        f"desires={len(discourse.top_desires)}"
    )
    print(f"[discourse live] top_complaints={discourse.top_complaints}")
    print(f"[discourse live] top_desires={discourse.top_desires}")
