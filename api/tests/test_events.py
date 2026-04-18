"""Tests for api.events — per-run event bus."""

from __future__ import annotations

import asyncio

import pytest

from api.events import EventBus, drop_bus, get_or_create_bus
from api.models import TraceEvent


@pytest.mark.asyncio
async def test_history_accumulates_trace_events() -> None:
    bus = EventBus("run-hist")
    await bus.emit(agent="scout", message="starting crawl")
    await bus.emit(agent="scout", message="fetched competitor A", kind="ok")
    await bus.emit(agent="cartographer", message="mapping", kind="info")

    history = bus.history()
    assert len(history) == 3
    assert all(isinstance(e, TraceEvent) for e in history)
    assert [e.agent for e in history] == ["scout", "scout", "cartographer"]
    assert history[1].kind == "ok"


@pytest.mark.asyncio
async def test_two_concurrent_subscribers_both_receive_all() -> None:
    bus = EventBus("run-fanout")

    async def collect(n: int) -> list[dict]:
        out: list[dict] = []
        async for ev in bus.stream():
            out.append(ev)
            if len(out) == n:
                return out
        return out

    # Start two subscribers before any emits.
    t1 = asyncio.create_task(collect(3))
    t2 = asyncio.create_task(collect(3))

    # Give subscribers a tick to register their queues.
    await asyncio.sleep(0.01)

    await bus.emit(agent="scout", message="a")
    await bus.emit(agent="scout", message="b")
    await bus.emit(agent="scout", message="c")

    r1, r2 = await asyncio.wait_for(asyncio.gather(t1, t2), timeout=1.0)
    assert [e["message"] for e in r1] == ["a", "b", "c"]
    assert [e["message"] for e in r2] == ["a", "b", "c"]


@pytest.mark.asyncio
async def test_late_subscriber_gets_replayed_history() -> None:
    bus = EventBus("run-replay")
    await bus.emit(agent="scout", message="one")
    await bus.emit(agent="scout", message="two")

    async def collect(n: int) -> list[dict]:
        out: list[dict] = []
        async for ev in bus.stream():
            out.append(ev)
            if len(out) == n:
                return out
        return out

    late = asyncio.create_task(collect(3))
    await asyncio.sleep(0.01)
    await bus.emit(agent="scout", message="three")

    got = await asyncio.wait_for(late, timeout=1.0)
    assert [e["message"] for e in got] == ["one", "two", "three"]


@pytest.mark.asyncio
async def test_close_ends_open_streams_quickly() -> None:
    bus = EventBus("run-close")

    async def drain() -> list[dict]:
        return [ev async for ev in bus.stream()]

    t = asyncio.create_task(drain())
    await asyncio.sleep(0.01)  # ensure subscribed
    await bus.emit(agent="scout", message="hello")

    # close() must terminate the stream within 500ms.
    await bus.close()
    result = await asyncio.wait_for(t, timeout=0.5)
    assert [e["message"] for e in result] == ["hello"]


@pytest.mark.asyncio
async def test_emit_after_close_is_noop() -> None:
    bus = EventBus("run-post-close")
    await bus.emit(agent="scout", message="pre")
    await bus.close()
    await bus.emit(agent="scout", message="post")  # should not raise
    assert [e.message for e in bus.history()] == ["pre"]


def test_registry_roundtrip() -> None:
    b1 = get_or_create_bus("abc")
    b2 = get_or_create_bus("abc")
    assert b1 is b2
    assert b1.run_id == "abc"

    drop_bus("abc")
    b3 = get_or_create_bus("abc")
    assert b3 is not b1
    drop_bus("abc")


@pytest.mark.asyncio
async def test_meta_is_folded_into_message() -> None:
    bus = EventBus("run-meta")
    await bus.emit(agent="kalibr", message="reroute", meta={"from": "x", "to": "y"})
    [event] = bus.history()
    assert "reroute" in event.message
    assert "from" in event.message and "to" in event.message
