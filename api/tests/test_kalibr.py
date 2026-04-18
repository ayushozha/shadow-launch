"""Live integration test for the Kalibr routing layer (specs §4.4).

We only skip when there is no plausible path to a real model call:
- `KALIBR_API_KEY` missing → Kalibr itself can't authenticate.
- Both Anthropic *and* OpenAI SDK keys look like dotenv placeholders (e.g.
  the `sk-ant-...` sentinel in `.env.example`) → whichever path Kalibr picks
  will 401 and there's no real smoke test to run.

When a real key IS present we hit the live Kalibr backend, let it route to a
real model, and assert we got a non-empty string back. The dispatched goal
is "summarization" so Kalibr should prefer claude-haiku-4-5 (cheap, fast).
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import pytest


def _load_dotenv_if_present() -> None:
    """Best-effort .env loader. We avoid the python-dotenv dependency so this
    file stays importable in a bare environment."""
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
    # Typical dotenv placeholders end in "..." or are empty / "changeme".
    if val.endswith("..."):
        return False
    if val.lower() in {"changeme", "todo", "placeholder"}:
        return False
    # Anthropic keys are ~100+ chars; OpenAI keys ~50+. A 5-char value is
    # almost certainly a dummy.
    return len(val) >= 20


@pytest.fixture(autouse=True)
def _env():
    _load_dotenv_if_present()
    yield


def test_live_roundtrip():
    """Hit the real Kalibr backend and prove the wrapper returns text."""
    if not os.getenv("KALIBR_API_KEY"):
        pytest.skip("KALIBR_API_KEY not set")
    if not os.getenv("KALIBR_TENANT_ID"):
        pytest.skip("KALIBR_TENANT_ID not set")
    if not (_key_looks_real("ANTHROPIC_API_KEY") or _key_looks_real("OPENAI_API_KEY")):
        pytest.skip(
            "Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY looks real — "
            "Kalibr would route to a key that 401s."
        )

    # Imports are deferred so the module loads cleanly even when the kalibr
    # package can't be imported (e.g. on a stripped-down CI runner).
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter

    bus = EventBus("test-kalibr-live")
    router = KalibrRouter(event_bus=bus)

    out = asyncio.run(
        router.complete(
            goal="summarization",
            system="You are concise. Answer with EXACTLY one word, no punctuation.",
            user="Summarize in one word: Shadow Launch is a synthetic market simulator.",
            max_tokens=50,
        )
    )

    assert isinstance(out, str)
    assert len(out.strip()) > 0, "router returned empty string"

    # Surface a bit of detail for the CI log — useful when debugging later.
    print(f"\n[kalibr live] output={out!r}")
    print(f"[kalibr live] events={router.events()}")


def test_fallback_when_kalibr_env_missing(monkeypatch):
    """Removing KALIBR_API_KEY must not crash at construction time.

    This guards the "graceful degradation" branch in the spec. We don't
    actually dispatch a completion (no real SDK keys in CI) — we only verify
    construction + event accounting work in fallback mode.
    """
    monkeypatch.delenv("KALIBR_API_KEY", raising=False)
    monkeypatch.delenv("KALIBR_TENANT_ID", raising=False)

    from api.events import EventBus
    from api.kalibr_router import KalibrRouter

    bus = EventBus("test-kalibr-fallback")
    router = KalibrRouter(event_bus=bus)

    # No calls made yet, events() should be an empty copy.
    assert router.events() == []
    assert router._kalibr_enabled is False  # noqa: SLF001 — white-box OK in a unit test
