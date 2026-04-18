"""Shared async wrapper around the Apify client for the v2 research agents.

All agents that need Apify (`agent-product-researcher`, `agent-competitor-
discoverer`, `agent-social-scraper`, `agent-market-discourse`) use
`ApifyRunner.run(actor_id, run_input, ...)`. The wrapper:

- Enforces a global concurrency cap (default 8 in flight).
- Records per-actor timings + doc counts as TraceEvents on the event bus.
- Raises `ApifyUnavailable` on any non-recoverable failure. Per policy
  (`no-dummy-fallback-policy`), there is NO cache fallback here — the agent
  propagates the error and the orchestrator surfaces it to the user.

Actor identifiers are kept in `ACTORS`. Each entry has a canonical slug plus
optional alternates that we will probe at runtime if the canonical fails.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any, TYPE_CHECKING

from apify_client import ApifyClientAsync

if TYPE_CHECKING:  # pragma: no cover
    from api.events import EventBus

logger = logging.getLogger(__name__)


class ApifyUnavailable(RuntimeError):
    """Raised when an Apify actor can't be invoked or returns no data."""


# ---------------------------------------------------------------------------
# Canonical actor slugs + alternates.
# Keep the MOST-RELIABLE actor first; alternates are tried on 404/unavailable.
# ---------------------------------------------------------------------------


ACTORS: dict[str, list[str]] = {
    # Stage 01 — product research
    "website_content": ["apify/website-content-crawler"],
    "google_serp": ["apify/google-search-scraper"],
    # Stage 02 — competitor discovery (Google SERP covers most; alternates are pluggable)
    "product_hunt": ["jaroslavhejlek/product-hunt"],
    "g2_reviews": ["pocesar/g2-crawler"],
    # Stage 03 — social (per platform)
    "social_linkedin": [
        "apify/linkedin-company-scraper",
        "curious_coder/linkedin-company-scraper",
    ],
    "social_twitter": [
        "apidojo/twitter-scraper-lite",
        "apify/twitter-scraper",
    ],
    "social_facebook": ["apify/facebook-pages-scraper"],
    "social_instagram": [
        "apify/instagram-profile-scraper",
        "apify/instagram-scraper",
    ],
    "social_tiktok": ["clockworks/tiktok-scraper"],
    # Stage 03.5 — market discourse
    "reddit": ["trudax/reddit-scraper"],
    "trustpilot": ["apify/trustpilot-scraper"],
}


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


class ApifyRunner:
    """Global-concurrency-capped Apify client. One instance per pipeline run."""

    def __init__(
        self,
        *,
        event_bus: "EventBus | None" = None,
        token: str | None = None,
        max_concurrency: int | None = None,
    ) -> None:
        self._token = token or os.getenv("APIFY_TOKEN")
        if not self._token:
            raise ApifyUnavailable(
                "APIFY_TOKEN is not set. Production agents require a real "
                "Apify token per the no-dummy-fallback policy."
            )
        self._client = ApifyClientAsync(self._token)
        self._event_bus = event_bus
        cap = max_concurrency or int(os.getenv("APIFY_CONCURRENCY", "8"))
        self._sem = asyncio.Semaphore(cap)

    # --- Public API -------------------------------------------------------

    async def run(
        self,
        slug_key: str,
        run_input: dict[str, Any],
        *,
        actor_label: str | None = None,
        stage: int | None = None,
        wait_secs: int = 240,
    ) -> list[dict[str, Any]]:
        """Invoke an Apify actor (by key in ACTORS) with concurrency control.

        Returns the dataset items. Tries alternate slugs on 404 until one
        succeeds. Raises `ApifyUnavailable` if every alternate fails.
        """
        slugs = ACTORS.get(slug_key)
        if not slugs:
            raise ApifyUnavailable(f"unknown Apify actor key: {slug_key}")

        label = actor_label or slug_key
        last_err: Exception | None = None
        async with self._sem:
            for slug in slugs:
                await self._emit(stage, label, f"apify {slug} → running", "info")
                started = time.monotonic()
                try:
                    items = await self._run_one(slug, run_input, wait_secs)
                    elapsed_ms = int((time.monotonic() - started) * 1000)
                    await self._emit(
                        stage,
                        label,
                        f"apify {slug} → {len(items)} docs ({elapsed_ms}ms)",
                        "ok",
                        meta={"actor": slug, "docs": len(items), "elapsed_ms": elapsed_ms},
                    )
                    return items
                except Exception as exc:  # noqa: BLE001 — probe alternates
                    last_err = exc
                    elapsed_ms = int((time.monotonic() - started) * 1000)
                    await self._emit(
                        stage,
                        label,
                        f"apify {slug} failed after {elapsed_ms}ms: {exc}",
                        "warn",
                        meta={"actor": slug, "error": str(exc)},
                    )
                    continue

        raise ApifyUnavailable(
            f"all Apify alternates for {slug_key!r} failed: {last_err}"
        )

    # --- Internals --------------------------------------------------------

    async def _run_one(
        self, slug: str, run_input: dict[str, Any], wait_secs: int
    ) -> list[dict[str, Any]]:
        # Cap per-actor memory so we fit several concurrent runs within Apify's
        # free-tier 8192MB total. Override via APIFY_ACTOR_MEMORY_MB.
        mem_mb = int(os.getenv("APIFY_ACTOR_MEMORY_MB", "1024"))
        call = await self._client.actor(slug).call(
            run_input=run_input, timeout_secs=wait_secs, memory_mbytes=mem_mb
        )
        if not call or "defaultDatasetId" not in call:
            raise ApifyUnavailable(f"actor {slug} returned no dataset")
        dataset = self._client.dataset(call["defaultDatasetId"])
        # list_items() returns a ListPage in apify-client>=2.5; .items is the list.
        page = await dataset.list_items()
        items = getattr(page, "items", page)
        if items is None:
            return []
        return list(items)

    async def _emit(
        self,
        stage: int | None,
        agent: str,
        message: str,
        kind: str,
        meta: dict | None = None,
    ) -> None:
        if self._event_bus is None:
            return
        try:
            await self._event_bus.emit(
                agent=agent,
                message=message,
                kind=kind,  # type: ignore[arg-type]
                meta=({"stage": stage, **(meta or {})} if stage else meta),
            )
        except Exception as e:  # noqa: BLE001 — trace must not break the run
            logger.warning("ApifyRunner.emit suppressed: %s", e)
