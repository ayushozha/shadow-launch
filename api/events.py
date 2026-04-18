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
* `emit()` also schedules a fire-and-forget DB insert into `trace_events`
  when `persist_to_db=True` (the default). Persistence failures are logged
  and swallowed — the bus must never break the run just because the DB is
  unreachable. Tests pass `persist_to_db=False` to stay DB-free.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from .models import TraceEvent, TraceKind

logger = logging.getLogger(__name__)

# Sentinel placed on subscriber queues by `close()` to terminate `stream()`.
_CLOSE_SENTINEL: object = object()


class EventBus:
    """Run-scoped pub/sub with replayable history."""

    def __init__(self, run_id: str, *, persist_to_db: bool = True) -> None:
        self._run_id = run_id
        self._history: list[TraceEvent] = []
        self._subscribers: list[asyncio.Queue] = []
        self._closed = False
        self._persist_to_db = persist_to_db
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
        kalibr_model: str | None = None,
        kalibr_cost_delta_usd: float | None = None,
    ) -> None:
        """Append to history and fan out to all current subscribers.

        `meta` is accepted for forward compatibility (Kalibr reroute payloads,
        tool-call details). If present and non-empty it is folded into the
        message suffix so it still reaches the UI, and it is also stored
        verbatim on the TraceEvent.

        `kalibr_model` / `kalibr_cost_delta_usd` are first-class so cost
        aggregation can read them off the trace without string-parsing.
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
            kalibr_model=kalibr_model,
            kalibr_cost_delta_usd=kalibr_cost_delta_usd,
            meta=meta,
        )

        async with self._lock:
            self._history.append(event)
            subscribers = list(self._subscribers)

        payload = event.model_dump(mode="json")
        for q in subscribers:
            # Unbounded queue -> put_nowait never raises QueueFull in practice.
            q.put_nowait(payload)

        # Fire-and-forget DB persistence. We don't await this — a slow DB
        # must not stall agent code paths — but we DO schedule it so a
        # `trace_events` row lands for every bus emit.
        if self._persist_to_db:
            try:
                asyncio.create_task(self._persist(event))
            except RuntimeError:
                # No running loop (e.g. sync test context). Drop silently —
                # persistence is opt-in best-effort, not a contract.
                logger.debug("trace persist skipped: no running loop")

    async def _persist(self, evt: TraceEvent) -> None:
        """Insert one `trace_events` row. Never raises into the bus."""
        try:
            from api.db.schema import TraceEventRow
            from api.db.session import get_session

            async with get_session() as s:
                s.add(
                    TraceEventRow(
                        run_id=self._run_id,
                        t=evt.t,
                        stage=evt.stage,
                        agent=evt.agent,
                        message=evt.message,
                        kind=evt.kind,
                        kalibr_model=evt.kalibr_model,
                        kalibr_cost_delta_usd=evt.kalibr_cost_delta_usd,
                        meta=evt.meta,
                    )
                )
        except Exception as e:  # noqa: BLE001 — persistence failures must not break the bus
            logger.warning("trace persist failed: %s", e)

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
