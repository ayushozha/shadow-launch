"""Live smoke test for `agent-competitor-discoverer` (Stage 02).

Skipped unless:
- APIFY_TOKEN is set and not a placeholder.
- KALIBR_API_KEY + KALIBR_TENANT_ID are set (or OPENAI/ANTHROPIC keys are
  real enough for the Kalibr fallback path).
- DATABASE_URL is set AND a TCP connection to that host:port succeeds
  (we assume the SSH tunnel to the shared VPS is up).

When all three preconditions hold, we hand-build a `ProductProfile` for
Linear, run the agent, and assert the advertised contract:
  - 5–8 competitors returned
  - no duplicate canonical hosts
  - ≥5 `selected=True`
"""

from __future__ import annotations

import asyncio
import os
import socket
import uuid
from pathlib import Path
from urllib.parse import urlparse

import pytest


# ---------------------------------------------------------------------------
# Env plumbing
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
    if val.endswith("..."):
        return False
    if val.lower() in {"changeme", "todo", "placeholder"}:
        return False
    return len(val) >= 20


def _db_reachable(url: str, timeout: float = 1.5) -> bool:
    """Cheap TCP check on the DATABASE_URL host/port."""
    try:
        # SQLAlchemy URLs look like postgresql+asyncpg://user:pw@host:port/db
        # urlparse handles this directly.
        parsed = urlparse(url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 5432
    except Exception:
        return False
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


@pytest.fixture(autouse=True)
def _env():
    _load_dotenv_if_present()
    yield


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------


def test_discovers_linear_competitors_live() -> None:
    if not _key_looks_real("APIFY_TOKEN"):
        pytest.skip("APIFY_TOKEN not set or placeholder")
    if not (os.getenv("KALIBR_API_KEY") and os.getenv("KALIBR_TENANT_ID")):
        if not (_key_looks_real("OPENAI_API_KEY") or _key_looks_real("ANTHROPIC_API_KEY")):
            pytest.skip(
                "neither Kalibr env nor a real OpenAI/Anthropic key present — "
                "cannot reach a live model"
            )
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        pytest.skip("DATABASE_URL not set")
    if not _db_reachable(db_url):
        pytest.skip(
            "DATABASE_URL host:port unreachable — start the SSH tunnel to "
            "72.62.82.57 before running the live smoke test"
        )

    # Imports deferred so test collection doesn't explode on bare envs.
    from api.agents.competitor_discoverer import run as discover_run
    from api.apify_client import ApifyRunner
    from api.db.schema import Base
    from api.db.session import get_engine, get_session
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter
    from api.models import ProductProfile
    from sqlalchemy import insert
    from api.db.schema import RunRow

    async def _go() -> None:
        run_id = f"smoke-{uuid.uuid4().hex[:10]}"

        # Ensure schema exists + a run row to satisfy the FK.
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with get_session() as s:
            await s.execute(
                insert(RunRow).values(
                    run_id=run_id,
                    product_url="https://linear.app",
                    status="running",
                )
            )

        bus = EventBus(run_id)
        kalibr = KalibrRouter(event_bus=bus)
        apify = ApifyRunner(event_bus=bus)

        profile = ProductProfile(
            product_url="https://linear.app",
            brand_name="Linear",
            one_liner="The issue tracker you'll enjoy using.",
            category="project management software",
            positioning_claims=[
                "Purpose-built for modern software teams",
                "Fast, keyboard-driven interface",
                "Opinionated workflow replacing Jira complexity",
            ],
            implicit_audience=(
                "Engineering leaders and product managers at Series A–C "
                "startups who want Jira's power without its friction."
            ),
            tone_inventory=["minimal", "confident", "technical"],
            messaging_gaps=[],
        )

        competitors = await discover_run(
            run_id=run_id,
            profile=profile,
            event_bus=bus,
            kalibr=kalibr,
            apify=apify,
        )

        # Contract: 5–8 returned.
        assert 5 <= len(competitors) <= 8, f"expected 5–8, got {len(competitors)}"

        # Contract: no duplicate canonical hosts.
        hosts: list[str] = []
        for c in competitors:
            h = urlparse(str(c.url)).netloc.lower()
            if h.startswith("www."):
                h = h[4:]
            hosts.append(h)
        assert len(set(hosts)) == len(hosts), f"duplicate hosts: {hosts}"

        # Contract: ≥5 selected.
        selected = [c for c in competitors if c.selected]
        assert len(selected) >= 5, f"expected ≥5 selected, got {len(selected)}"

        # Surface useful detail in CI logs.
        print(f"\n[competitor_discoverer live] run_id={run_id}")
        for c in competitors:
            marker = "*" if c.selected else " "
            print(
                f"  {marker} {c.name:<30} {c.relevance_score:.2f}  "
                f"{c.discovery_source:<13} {c.url}"
            )

    asyncio.run(_go())
