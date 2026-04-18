"""Kalibr routing layer (specs.md §4.4).

Thin async wrapper around `kalibr.Router` that every LLM-touching agent in the
orchestrator graph calls through. The wrapper adds three things the raw SDK
doesn't:

1. **Goal-keyed default model paths.** Callers say what kind of work they're
   doing ("summarization", "reasoning", "creative") and the router picks the
   cheap/fast → expensive/smart ordering for us. This is where the "Haiku for
   summarization, Sonnet for reasoning" policy from the spec lives.
2. **Structured-output mode.** If `response_model=SomeBase` is passed we ask
   the underlying model for JSON conforming to that schema, parse it, and
   validate it via Pydantic — the agents want typed output, not raw strings.
3. **First-class observability.** Every retry / reroute / recover becomes
   both a `TraceEvent` (emitted to the run's `EventBus` so the UI shows it)
   AND a `KalibrEvent` in a private list `events()` returns for the final
   run artifact. The spec's §4.4 "Kalibr events count on the summary" comes
   from this list.

Graceful degradation
--------------------
If `KALIBR_API_KEY` or `KALIBR_TENANT_ID` is missing, we log a warning and
fall back to a direct Anthropic → OpenAI sweep using whatever SDK keys the
process has. The run still emits trace events, so the UI remains observable;
only the adaptive-routing half of the story is offline.

Unicode note
------------
The kalibr package prints emoji during import. On Windows `cp1252` consoles
that raises `UnicodeEncodeError`. We set `PYTHONIOENCODING=utf-8` defensively
before importing kalibr the first time; outside of interactive consoles
(e.g. running under pytest) this is a no-op.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from typing import TYPE_CHECKING, Any, Callable

from pydantic import BaseModel, ValidationError

from .models import KalibrEvent

if TYPE_CHECKING:
    from .events import EventBus

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Defensive UTF-8 configuration. Must happen *before* `import kalibr`.
# ---------------------------------------------------------------------------

os.environ.setdefault("PYTHONIOENCODING", "utf-8")
try:
    # Reconfigure stdout/stderr so that kalibr's banner emoji don't crash.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except Exception:
    # Older Python / non-TextIOWrapper streams: nothing to do.
    pass


# ---------------------------------------------------------------------------
# Goal → default model path policy.
#
# Paths are ordered cheapest/fastest first. Kalibr iterates in the given
# order and reports to its backend; the SDK uses success/failure feedback
# to learn its own ordering over time but always honors the initial list.
# ---------------------------------------------------------------------------

_DEFAULT_PATHS: dict[str, list[str]] = {
    "summarization": ["gpt-4o-mini", "gpt-4o"],
    "reasoning": ["gpt-4o", "gpt-4o-mini"],
    "creative": ["gpt-4o", "gpt-4o-mini"],
}
_FALLBACK_PATH: list[str] = ["gpt-4o-mini", "gpt-4o"]


def _paths_for(goal: str, override: list[str] | None) -> list[str]:
    if override:
        return list(override)
    return list(_DEFAULT_PATHS.get(goal, _FALLBACK_PATH))


# ---------------------------------------------------------------------------
# Lazy kalibr import — we only want the SDK's noisy banner to hit stdout once
# and only if somebody actually constructs the router. Tests that just import
# this module (e.g. for the soft-contract `KalibrRouter` symbol) shouldn't
# pay that cost.
# ---------------------------------------------------------------------------


def _import_kalibr():
    try:
        import kalibr  # noqa: F401
        from kalibr import Router

        return Router
    except Exception as exc:  # pragma: no cover — SDK import failures are fatal-ish
        log.warning("kalibr SDK import failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# KalibrRouter
# ---------------------------------------------------------------------------


class KalibrRouter:
    """Async-facing wrapper around `kalibr.Router` used by every agent."""

    def __init__(self, *, event_bus: "EventBus") -> None:
        self._bus = event_bus
        self._events: list[KalibrEvent] = []

        # Kalibr requires both the API key and the tenant ID to be present.
        # If either is missing we still function (via a direct-SDK fallback)
        # but we flag the degraded mode up front so debugging is obvious.
        self._kalibr_enabled = bool(os.getenv("KALIBR_API_KEY")) and bool(
            os.getenv("KALIBR_TENANT_ID")
        )
        if not self._kalibr_enabled:
            log.warning(
                "KALIBR_API_KEY or KALIBR_TENANT_ID missing — "
                "falling back to direct SDK calls (no adaptive routing)."
            )

        self._Router = _import_kalibr() if self._kalibr_enabled else None
        if self._kalibr_enabled and self._Router is None:
            # Import failed even though the env was set. Degrade gracefully.
            self._kalibr_enabled = False

    # ------------------------------------------------------------------ API

    def events(self) -> list[KalibrEvent]:
        """Copy of every reroute/retry/recover observed this run."""
        return list(self._events)

    async def complete(
        self,
        *,
        goal: str,
        system: str,
        user: str,
        paths: list[str] | None = None,
        response_model: type[BaseModel] | None = None,
        max_tokens: int = 2000,
        success_when: Callable[[str], bool] | None = None,
    ) -> str | BaseModel:
        """Run an LLM completion through Kalibr (or the fallback chain).

        Returns:
            - `str` if `response_model` is None
            - instance of `response_model` if set (parsed + validated)

        Raises:
            Propagates the final underlying exception if every model in `paths`
            fails. A final `error`-kind TraceEvent is emitted before re-raise.
        """
        model_paths = _paths_for(goal, paths)

        # Tag the system prompt with the schema when the caller wants structured
        # output. This is simpler and more portable than setting provider-
        # specific tool-use / response_format kwargs — Kalibr already dispatches
        # to three different SDKs and their schema-hinting APIs don't align.
        effective_system = _with_schema_instructions(system, response_model)

        messages = [
            {"role": "system", "content": effective_system},
            {"role": "user", "content": user},
        ]

        await self._bus.emit(
            agent="kalibr",
            message=f"dispatch goal={goal} paths={model_paths}",
            kind="info",
        )

        raw = await self._run_with_routing(
            goal=goal,
            messages=messages,
            paths=model_paths,
            success_when=success_when,
            max_tokens=max_tokens,
        )

        if response_model is None:
            return raw

        return _parse_response(raw, response_model)

    # --------------------------------------------------------------- internals

    async def _run_with_routing(
        self,
        *,
        goal: str,
        messages: list[dict[str, str]],
        paths: list[str],
        success_when: Callable[[str], bool] | None,
        max_tokens: int,
    ) -> str:
        """Dispatch through Kalibr if enabled, otherwise walk paths manually."""
        if self._kalibr_enabled:
            return await self._run_via_kalibr(
                goal=goal,
                messages=messages,
                paths=paths,
                success_when=success_when,
                max_tokens=max_tokens,
            )
        return await self._run_direct_fallback(
            messages=messages, paths=paths, max_tokens=max_tokens
        )

    async def _run_via_kalibr(
        self,
        *,
        goal: str,
        messages: list[dict[str, str]],
        paths: list[str],
        success_when: Callable[[str], bool] | None,
        max_tokens: int,
    ) -> str:
        """Iterate model paths in order; retry + reroute on exception."""
        last_exc: Exception | None = None
        # Track where we started so we can label a reroute accurately.
        first_path = paths[0]

        for idx, model_id in enumerate(paths):
            # Build a fresh Router per call so the SDK's per-goal learning
            # state gets flushed for each dispatch — the router is goal-scoped
            # not model-scoped, and we want predictable ordering during a
            # single complete() invocation.
            router = self._Router(  # type: ignore[misc]
                goal=goal,
                paths=paths[idx:],  # remaining models, in order
                success_when=success_when,
                auto_register=True,
            )

            try:
                # kalibr.Router.completion is sync; offload so we don't block
                # the event loop while it talks to OpenAI/Anthropic.
                response = await asyncio.to_thread(
                    router.completion,
                    messages=messages,
                    force_model=model_id,
                    max_tokens=max_tokens,
                )
            except Exception as exc:  # noqa: BLE001 — kalibr raises anything
                last_exc = exc
                next_model = paths[idx + 1] if idx + 1 < len(paths) else None
                await self._bus.emit(
                    agent="kalibr",
                    message=f"{model_id} failed: {exc}. "
                    + (f"rerouting to {next_model}" if next_model else "no more paths"),
                    kind="warn",
                )
                self._events.append(
                    KalibrEvent(
                        kind="retry",
                        from_model=model_id,
                        to_model=next_model,
                        reason=str(exc)[:500],
                        recovered=False,
                    )
                )
                continue

            # Success. Extract text, report, and maybe log a reroute.
            text = _extract_text(response)

            score = 1.0
            if success_when is not None:
                try:
                    score = 1.0 if success_when(text) else 0.5
                except Exception:  # success_when bugs shouldn't break the call
                    score = 0.5

            try:
                await asyncio.to_thread(router.report, success=True, score=score)
            except Exception as report_exc:  # pragma: no cover — telemetry best-effort
                log.debug("kalibr report failed (non-fatal): %s", report_exc)

            if model_id != first_path:
                # We recovered after at least one failure.
                self._events.append(
                    KalibrEvent(
                        kind="reroute",
                        from_model=first_path,
                        to_model=model_id,
                        reason="previous path failed",
                        recovered=True,
                    )
                )
                await self._bus.emit(
                    agent="kalibr",
                    message=f"recovered on {model_id} after reroute from {first_path}",
                    kind="ok",
                )
            else:
                await self._bus.emit(
                    agent="kalibr",
                    message=f"{model_id} ok (score={score})",
                    kind="ok",
                )

            return text

        # Every path failed.
        await self._bus.emit(
            agent="kalibr",
            message=f"all paths exhausted for goal={goal}: {last_exc}",
            kind="error",
        )
        assert last_exc is not None  # loop always runs at least once
        raise last_exc

    async def _run_direct_fallback(
        self,
        *,
        messages: list[dict[str, str]],
        paths: list[str],
        max_tokens: int,
    ) -> str:
        """No-Kalibr mode: call Anthropic or OpenAI directly, in order.

        We detect the provider by model-id prefix. Used when KALIBR_API_KEY /
        KALIBR_TENANT_ID is missing so the app can still run end-to-end.
        """
        last_exc: Exception | None = None
        first_path = paths[0]

        for idx, model_id in enumerate(paths):
            try:
                if model_id.startswith("claude"):
                    text = await asyncio.to_thread(
                        _call_anthropic_direct, model_id, messages, max_tokens
                    )
                else:
                    text = await asyncio.to_thread(
                        _call_openai_direct, model_id, messages, max_tokens
                    )
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                next_model = paths[idx + 1] if idx + 1 < len(paths) else None
                await self._bus.emit(
                    agent="kalibr",
                    message=f"[fallback] {model_id} failed: {exc}",
                    kind="warn",
                )
                self._events.append(
                    KalibrEvent(
                        kind="retry",
                        from_model=model_id,
                        to_model=next_model,
                        reason=str(exc)[:500],
                        recovered=False,
                    )
                )
                continue

            if model_id != first_path:
                self._events.append(
                    KalibrEvent(
                        kind="reroute",
                        from_model=first_path,
                        to_model=model_id,
                        reason="previous path failed (fallback mode)",
                        recovered=True,
                    )
                )
            await self._bus.emit(
                agent="kalibr",
                message=f"[fallback] {model_id} ok",
                kind="ok",
            )
            return text

        await self._bus.emit(
            agent="kalibr",
            message=f"[fallback] all paths exhausted: {last_exc}",
            kind="error",
        )
        assert last_exc is not None
        raise last_exc


# ---------------------------------------------------------------------------
# Helpers — direct SDK calls for fallback mode
# ---------------------------------------------------------------------------


def _call_anthropic_direct(
    model_id: str, messages: list[dict[str, str]], max_tokens: int
) -> str:
    import anthropic

    # Anthropic wants system as a top-level arg, not a message.
    system = next(
        (m["content"] for m in messages if m["role"] == "system"),
        "",
    )
    non_system = [m for m in messages if m["role"] != "system"]
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model=model_id,
        max_tokens=max_tokens,
        system=system,
        messages=non_system,
    )
    return "".join(
        block.text for block in resp.content if getattr(block, "type", None) == "text"
    )


def _call_openai_direct(
    model_id: str, messages: list[dict[str, str]], max_tokens: int
) -> str:
    from openai import OpenAI

    client = OpenAI()
    resp = client.chat.completions.create(
        model=model_id,
        messages=messages,  # type: ignore[arg-type]
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content or ""


# ---------------------------------------------------------------------------
# Helpers — response unwrapping and schema coercion
# ---------------------------------------------------------------------------


def _extract_text(response: Any) -> str:
    """Pull a plain string out of whatever Kalibr happened to return.

    Kalibr passes the underlying SDK's response object through untouched, so
    this function has to speak Anthropic's `Message`, OpenAI's
    `ChatCompletion`, and (defensively) a raw string.
    """
    if isinstance(response, str):
        return response

    # OpenAI ChatCompletion
    choices = getattr(response, "choices", None)
    if choices:
        try:
            return choices[0].message.content or ""
        except Exception:
            pass

    # Anthropic Message
    content = getattr(response, "content", None)
    if isinstance(content, list):
        parts = []
        for block in content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        if parts:
            return "".join(parts)

    # Last-resort stringification.
    return str(response)


def _with_schema_instructions(
    system: str, response_model: type[BaseModel] | None
) -> str:
    """Append JSON-schema guidance to the system prompt if needed."""
    if response_model is None:
        return system
    schema = response_model.model_json_schema()
    addendum = (
        "\n\n---\n"
        "Respond with a single JSON object matching this schema. "
        "Output ONLY the JSON object — no prose, no code fences.\n"
        f"SCHEMA:\n{json.dumps(schema, indent=2)}"
    )
    return (system or "") + addendum


def _parse_response(raw: str, response_model: type[BaseModel]) -> BaseModel:
    """Coerce a model's raw text into a validated Pydantic instance.

    Models occasionally wrap JSON in ```json fences or add leading prose. We
    do one best-effort unwrap before letting Pydantic raise.
    """
    text = raw.strip()
    # Strip code fences if present.
    if text.startswith("```"):
        text = text.strip("`")
        # After stripping backticks we may have "json\n{...}". Drop the
        # language tag if there's one.
        if text.lower().startswith("json"):
            text = text[4:].lstrip()
    # Locate the outermost JSON object — handles "Here you go: {...}" cases.
    if not text.startswith("{"):
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start : end + 1]
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"response_model={response_model.__name__} expected JSON, "
            f"got: {raw[:200]!r}"
        ) from exc
    try:
        return response_model.model_validate(data)
    except ValidationError as exc:
        raise ValueError(
            f"response_model={response_model.__name__} validation failed: {exc}"
        ) from exc


__all__ = ["KalibrRouter"]
