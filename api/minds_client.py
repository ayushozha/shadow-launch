"""Shared Minds AI client (docs/features.md §6 · minds-panel-6-persona-debate).

Thin async wrapper around the Minds AI REST API (`https://getminds.ai/api/v1`).
One httpx.AsyncClient, bearer auth, explicit typed methods.

Endpoints covered
-----------------
- POST /sparks                       → create a persona Spark (system prompt).
- POST /panels                       → create a panel of Spark IDs.
- POST /panels/{id}/ask              → SSE stream of per-spark reactions.
- POST /sparks/{id}/completion       → single-spark completion (for Round 2
  rebuttals and SSE-parse fallbacks).

Response shapes vary slightly across the Minds platform as it evolves; this
client stays tolerant by returning `dict`s for SSE events and exposing the
raw text body for `spark_complete` when no `response_model` is given.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx
from pydantic import BaseModel, ValidationError

log = logging.getLogger(__name__)


_DEFAULT_BASE_URL = "https://getminds.ai/api/v1"
_DEFAULT_TIMEOUT = httpx.Timeout(60.0, read=120.0, connect=10.0)


class MindsError(RuntimeError):
    """Raised when the Minds API returns a non-2xx status or malformed body."""


class MindsClient:
    """Async wrapper around the Minds AI REST API.

    The client is reusable across calls. Prefer to instantiate once per agent
    invocation and dispose via `aclose()` (or `async with` semantics).
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: httpx.Timeout | None = None,
    ) -> None:
        key = api_key or os.getenv("MINDS_API_KEY")
        if not key:
            raise MindsError(
                "MINDS_API_KEY is not set. Obtain a Premium+ tier key so the "
                "6-persona panel can be instantiated (free/lite tiers cap at "
                "1–3 Sparks)."
            )
        self._api_key = key
        self._client = httpx.AsyncClient(
            base_url=base_url or _DEFAULT_BASE_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=timeout or _DEFAULT_TIMEOUT,
        )

    # ------------------------------------------------------------------ lifecycle

    async def __aenter__(self) -> "MindsClient":
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._client.aclose()

    # ------------------------------------------------------------------ sparks

    async def create_spark(
        self,
        *,
        name: str,
        system_prompt: str,
        discipline: str,
    ) -> str:
        """Create a Spark with a manual-mode persona brief. Returns spark_id."""
        payload = {
            "name": name,
            "mode": "manual",
            "discipline": discipline,
            "system_prompt": system_prompt,
        }
        data = await self._post_json("/sparks", payload)
        spark_id = (
            data.get("spark_id")
            or data.get("id")
            or (data.get("spark") or {}).get("id")
            or (data.get("data") or {}).get("id")
        )
        if not spark_id:
            raise MindsError(
                f"Minds /sparks response missing spark_id: {_truncate(data)}"
            )
        return str(spark_id)

    async def spark_complete(
        self,
        *,
        spark_id: str,
        user_msg: str,
        response_model: type[BaseModel] | None = None,
    ) -> str | BaseModel:
        """Single-spark completion. Returns text (or a parsed `response_model`).

        If `response_model` is set we append a short JSON-only instruction to
        the user message so the spark emits a parseable object.
        """
        effective = user_msg
        if response_model is not None:
            effective = (
                user_msg
                + "\n\n---\n"
                + "Respond with ONLY a single JSON object matching this schema. "
                + "No prose, no code fences.\nSCHEMA:\n"
                + json.dumps(response_model.model_json_schema(), indent=2)
            )
        payload = {"message": effective, "messages": [{"role": "user", "content": effective}]}
        data = await self._post_json(f"/sparks/{spark_id}/completion", payload)
        text = _extract_text(data)
        if response_model is None:
            return text
        return _parse_into(text, response_model)

    # ------------------------------------------------------------------ panels

    async def create_panel(
        self,
        *,
        name: str,
        spark_ids: list[str],
    ) -> str:
        """Create a panel containing the given Spark IDs. Returns panel_id."""
        payload = {"name": name, "spark_ids": spark_ids, "sparks": spark_ids}
        data = await self._post_json("/panels", payload)
        panel_id = (
            data.get("panel_id")
            or data.get("id")
            or (data.get("panel") or {}).get("id")
            or (data.get("data") or {}).get("id")
        )
        if not panel_id:
            raise MindsError(
                f"Minds /panels response missing panel_id: {_truncate(data)}"
            )
        return str(panel_id)

    async def ask_panel(
        self,
        *,
        panel_id: str,
        question: str,
    ) -> list[dict]:
        """Ask a panel and consume the SSE stream of per-spark responses.

        Returns a list of decoded SSE event payloads (typically one per
        Spark). Each element is a `dict` — the caller is responsible for
        pulling out `spark_id`, `content`, `score`, etc. according to the
        question framing.
        """
        payload = {"message": question, "question": question}
        events: list[dict] = []
        url = f"/panels/{panel_id}/ask"
        async with self._client.stream(
            "POST",
            url,
            json=payload,
            headers={"Accept": "text/event-stream"},
        ) as resp:
            if resp.status_code >= 400:
                body = (await resp.aread()).decode("utf-8", errors="replace")
                raise MindsError(
                    f"Minds {url} returned {resp.status_code}: {body[:400]}"
                )
            async for raw in resp.aiter_lines():
                if not raw:
                    continue
                line = raw.strip()
                if not line.startswith("data:"):
                    continue
                data_str = line[len("data:"):].strip()
                if not data_str or data_str == "[DONE]":
                    continue
                try:
                    parsed = json.loads(data_str)
                except json.JSONDecodeError:
                    # Bare text chunk — wrap so caller still sees it.
                    events.append({"content": data_str})
                    continue
                if isinstance(parsed, dict):
                    events.append(parsed)
                elif isinstance(parsed, list):
                    events.extend(e for e in parsed if isinstance(e, dict))
        return events

    # ------------------------------------------------------------------ internals

    async def _post_json(self, path: str, payload: dict) -> dict:
        try:
            resp = await self._client.post(path, json=payload)
        except httpx.HTTPError as exc:
            raise MindsError(f"Minds {path} network error: {exc}") from exc
        if resp.status_code >= 400:
            raise MindsError(
                f"Minds {path} returned {resp.status_code}: {resp.text[:400]}"
            )
        try:
            data = resp.json()
        except ValueError as exc:
            raise MindsError(
                f"Minds {path} returned non-JSON body: {resp.text[:200]!r}"
            ) from exc
        if not isinstance(data, dict):
            raise MindsError(
                f"Minds {path} expected object, got {type(data).__name__}"
            )
        return data


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _extract_text(data: Any) -> str:
    """Pull a plain string out of whatever the Minds completion endpoint returned."""
    if isinstance(data, str):
        return data
    if isinstance(data, dict):
        for key in ("content", "text", "message", "output", "response"):
            val = data.get(key)
            if isinstance(val, str) and val.strip():
                return val
            if isinstance(val, dict):
                nested = _extract_text(val)
                if nested:
                    return nested
        # OpenAI-shaped fallback (choices[0].message.content).
        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            first = choices[0]
            if isinstance(first, dict):
                msg = first.get("message") or {}
                content = msg.get("content") if isinstance(msg, dict) else None
                if isinstance(content, str):
                    return content
                text = first.get("text")
                if isinstance(text, str):
                    return text
        data_field = data.get("data")
        if isinstance(data_field, (dict, list, str)):
            return _extract_text(data_field)
    if isinstance(data, list):
        parts = [_extract_text(x) for x in data]
        return "\n".join(p for p in parts if p)
    return ""


def _parse_into(text: str, model: type[BaseModel]) -> BaseModel:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.lower().startswith("json"):
            stripped = stripped[4:].lstrip()
    if not stripped.startswith("{"):
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start != -1 and end != -1 and end > start:
            stripped = stripped[start : end + 1]
    try:
        obj = json.loads(stripped)
    except json.JSONDecodeError as exc:
        raise MindsError(
            f"Expected JSON matching {model.__name__}, got: {text[:200]!r}"
        ) from exc
    try:
        return model.model_validate(obj)
    except ValidationError as exc:
        raise MindsError(
            f"Minds response failed {model.__name__} validation: {exc}"
        ) from exc


def _truncate(obj: Any, max_chars: int = 240) -> str:
    s = json.dumps(obj) if not isinstance(obj, str) else obj
    return s if len(s) <= max_chars else s[:max_chars] + "…"


__all__ = ["MindsClient", "MindsError"]
