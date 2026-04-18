"""Per-run in-process event bus (specs.md §3.3, §6.2).

Each run has exactly one `EventBus`. Agents emit `TraceEvent`-shaped payloads;
the SSE endpoint subscribes via `stream()` and relays to the browser.

Design notes
------------
* Fan-out uses one `asyncio.Queue` per subscriber. `emit()` appends to the
  canonical `history` list and then non-blockingly hands the event to every
  live subscriber queue. The queues are unbounded: this is a short-lived demo
  (single run, single SSE consumer, <300 events per run), so the memory
  pressure of bounded/drop semantics is not worth the complexity. If we ever
  need backpressure we can swap to `Queue(maxsize=N)` with `put_nowait` +
  drop-oldest without touching callers.
* `stream()` replays the full history first, then tails the live queue. This
  makes late subscribers (e.g. the UI reconnecting mid-run) safe.
* `close()` publishes a sentinel (`None`) to every queue so pending `stream()`
  coroutines exit cleanly — no cancellation gymnastics in the SSE handler.
* `emit()` is declared `async` even though the body does no awaiting today.
  That keeps the call sites forward-compatible with a real broker (Redis
  pubsub, NATS, ...) without a breaking API change.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from .models import TraceEvent, TraceKind

# Sentinel placed on subscriber queues by `close()` to terminate `stream()`.
_CLOSE_SENTINEL: object = object()


class EventBus:
    """Run-scoped pub/sub with replayable history."""

    def __init__(self, run_id: str) -> None:
        self._run_id = run_id
        self._history: list[TraceEvent] = []
        self._subscribers: list[asyncio.Queue] = []
        self._closed = False
        # Protects mutations to _history and _subscribers. All public methods
        # are coroutines or cheap sync accessors, so contention is minimal.
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------ props

    @property
    def run_id(self) -> str:
        return self._run_id

    @property
    def closed(self) -> bool:
        return self._closed

    # ------------------------------------------------------------------ emit

    async def emit(
        self,
        *,
        agent: str,
        message: str,
        kind: TraceKind = "info",
        meta: dict | None = None,
    ) -> None:
        """Append to history and fan out to all current subscribers.

        `meta` is accepted for forward compatibility (Kalibr reroute payloads,
        tool-call details) but is not part of `TraceEvent` today. If present
        and non-empty it is folded into the message suffix so it still reaches
        the UI; this keeps the public API stable while the model catches up.
        """
        if self._closed:
            # Silently drop post-close emits; the orchestrator may race with
            # the SSE consumer disconnecting. A hard error here would only
            # surface as spurious traceback noise at shutdown.
            return

        if meta:
            # Keep message human-readable but preserve meta for debugging.
            rendered = f"{message} :: {meta}"
        else:
            rendered = message

        event = TraceEvent(
            t=datetime.now(timezone.utc),
            agent=agent,
            message=rendered,
            kind=kind,
        )

        async with self._lock:
            self._history.append(event)
            subscribers = list(self._subscribers)

        payload = event.model_dump(mode="json")
        for q in subscribers:
            # Unbounded queue -> put_nowait never raises QueueFull in practice.
            q.put_nowait(payload)

    # ---------------------------------------------------------------- stream

    async def stream(self) -> AsyncIterator[dict]:
        """Yield every event emitted for this run (history first, then live)."""
        queue: asyncio.Queue = asyncio.Queue()

        async with self._lock:
            # Snapshot history under the lock so we don't interleave with a
            # concurrent emit and duplicate an event.
            replay = [e.model_dump(mode="json") for e in self._history]
            if self._closed:
                # Bus was closed before we subscribed: replay-only, no live tail.
                for item in replay:
                    yield item
                return
            self._subscribers.append(queue)

        try:
            for item in replay:
                yield item

            while True:
                item = await queue.get()
                if item is _CLOSE_SENTINEL:
                    return
                yield item
        finally:
            # Best-effort unsubscribe so closed/cancelled consumers don't leak.
            async with self._lock:
                try:
                    self._subscribers.remove(queue)
                except ValueError:
                    pass

    # --------------------------------------------------------------- history

    def history(self) -> list[TraceEvent]:
        """Ordered list of everything emitted so far."""
        # Return a shallow copy so callers can't mutate our internal list.
        return list(self._history)

    # ----------------------------------------------------------------- close

    async def close(self) -> None:
        """End all open streams. Subsequent emits are dropped."""
        async with self._lock:
            if self._closed:
                return
            self._closed = True
            subscribers = list(self._subscribers)
            self._subscribers.clear()

        for q in subscribers:
            q.put_nowait(_CLOSE_SENTINEL)


# ---------------------------------------------------------------------------
# Module-level registry. `main.py` creates a bus at run-start and the
# orchestrator looks it up by run_id; the SSE route does the same on connect.
# ---------------------------------------------------------------------------

_REGISTRY: dict[str, EventBus] = {}


def get_or_create_bus(run_id: str) -> EventBus:
    """Return the existing bus for `run_id`, or create one if absent."""
    bus = _REGISTRY.get(run_id)
    if bus is None:
        bus = EventBus(run_id)
        _REGISTRY[run_id] = bus
    return bus


def drop_bus(run_id: str) -> None:
    """Remove a bus from the registry. Call after the run and SSE stream end."""
    _REGISTRY.pop(run_id, None)


__all__ = [
    "EventBus",
    "drop_bus",
    "get_or_create_bus",
]
