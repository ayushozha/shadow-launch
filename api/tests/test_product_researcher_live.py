"""Live smoke test for the Stage 01 product researcher agent.

Skips unless:
- `OPENAI_API_KEY`, `APIFY_TOKEN`, and `DATABASE_URL` are all set, AND
- a TCP probe to 127.0.0.1:5433 succeeds (SSH tunnel to the shared VPS is up).

When it runs, it executes the agent end-to-end against https://linear.app and
asserts the returned `ProductProfile` has ≥3 positioning claims plus a
non-empty implicit_audience.
"""

from __future__ import annotations

import asyncio
import os
import socket
import uuid
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# Environment bootstrap — best-effort .env loader (no python-dotenv dep).
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


def _tunnel_up(host: str = "127.0.0.1", port: int = 5433, timeout: float = 0.75) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _looks_real(name: str) -> bool:
    val = os.environ.get(name) or ""
    if not val:
        return False
    if val.endswith("...") or val.lower() in {"changeme", "todo", "placeholder"}:
        return False
    return len(val) >= 20


@pytest.fixture(autouse=True)
def _env():
    _load_dotenv_if_present()
    yield


def _skip_unless_live() -> None:
    for var in ("OPENAI_API_KEY", "APIFY_TOKEN", "DATABASE_URL"):
        if not _looks_real(var):
            pytest.skip(f"{var} not set / looks like a placeholder")
    if not _tunnel_up():
        pytest.skip("SSH tunnel to 127.0.0.1:5433 is not up")


def test_product_researcher_live_linear():
    """Run Stage 01 against linear.app and assert the profile is well-formed."""
    _skip_unless_live()

    # Imports are deferred so the file is importable even when sponsor SDKs
    # (apify-client, kalibr) aren't fully configured in the host environment.
    from api.agents.product_researcher import run as product_research_run
    from api.apify_client import ApifyRunner
    from api.db.schema import Base, RunRow
    from api.db.session import get_engine, get_session
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter
    from api.models import RunInput

    run_id = f"test-linear-{uuid.uuid4().hex[:8]}"

    async def _exec():
        # Make sure the schema exists so the FK-bound insert can land. On a
        # clean shadowlaunch DB this is a no-op after the first run.
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Seed a runs row — ProductProfileRow has a FK to runs.run_id.
        async with get_session() as session:
            session.add(
                RunRow(
                    run_id=run_id,
                    product_url="https://linear.app",
                    status="running",
                )
            )

        bus = EventBus(run_id)
        kalibr = KalibrRouter(event_bus=bus)
        apify = ApifyRunner(event_bus=bus)

        inputs = RunInput(product_url="https://linear.app")
        try:
            return await product_research_run(
                run_id=run_id,
                inputs=inputs,
                event_bus=bus,
                kalibr=kalibr,
                apify=apify,
            )
        finally:
            await bus.close()

    profile = asyncio.run(asyncio.wait_for(_exec(), timeout=60))

    assert profile is not None
    assert str(profile.product_url).startswith("https://linear.app")
    assert len(profile.positioning_claims) >= 3, (
        f"expected >=3 positioning claims, got {profile.positioning_claims!r}"
    )
    assert profile.implicit_audience and profile.implicit_audience.strip(), (
        "implicit_audience must be non-empty"
    )
    assert profile.brand_name.strip()
    assert profile.one_liner.strip()
