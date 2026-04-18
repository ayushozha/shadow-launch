"""FastAPI app for Shadow Launch v2.

Routes are the v2 surface from docs/features.md §4. Pipeline agents are
plugged in lazily — during Phase 2, the orchestrator + individual agents
land in `api.orchestrator` and `api.agents.*`; this module only knows the
HTTP surface and how to dispatch.

Run locally:
    uvicorn api.main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator, TYPE_CHECKING

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select

from api.models import RunInput

if TYPE_CHECKING:  # pragma: no cover
    from api.events import EventBus  # noqa: F401

logger = logging.getLogger(__name__)

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    required = [
        "DATABASE_URL",
        "KALIBR_API_KEY",
        "KALIBR_TENANT_ID",
        "OPENAI_API_KEY",
        "APIFY_TOKEN",
        "MINDS_API_KEY",
    ]
    for var in required:
        if not os.getenv(var):
            logger.warning("env var %s is not set — agents will fail", var)
    yield
    try:
        from api.db.session import dispose_engine
        await dispose_engine()
    except Exception as e:  # noqa: BLE001
        logger.info("engine dispose suppressed: %s", e)


def create_app() -> FastAPI:
    app = FastAPI(title="Shadow Launch API", version="2.0.0-dev", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "https://shadowlaunch.ayushojha.com",
            "https://shadow-launch.vercel.app",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    async def health() -> dict:
        return {"status": "ok", "version": "2.0.0-dev"}

    @app.post("/api/runs", status_code=status.HTTP_202_ACCEPTED)
    async def create_run(payload: RunInput) -> dict:
        run_id = f"run_{uuid.uuid4().hex[:12]}"

        # Lazy imports — orchestrator + agents land in Phase 2. Main must
        # import cleanly before those files exist.
        try:
            from api.events import get_or_create_bus
            from api.kalibr_router import KalibrRouter
            from api.orchestrator import run_pipeline
            from api.db.session import get_session
            from api.db.schema import RunRow
        except ImportError as exc:
            logger.error("pipeline deps not installed: %s", exc)
            raise HTTPException(
                status_code=503,
                detail="Pipeline not yet ready (Phase 2 in progress).",
            ) from exc

        async with get_session() as session:
            row = RunRow(
                run_id=run_id,
                product_url=str(payload.product_url),
                brand_voice_guide=payload.brand_voice_guide,
                target_regions=payload.target_regions,
                budget_constraint=payload.budget_constraint,
                status="queued",
            )
            session.add(row)

        bus = get_or_create_bus(run_id)
        kalibr = KalibrRouter(event_bus=bus)

        async def _runner() -> None:
            try:
                await run_pipeline(payload, event_bus=bus, kalibr=kalibr, run_id=run_id)
            except Exception as exc:  # noqa: BLE001
                logger.exception("pipeline failed for %s", run_id)
                try:
                    async with get_session() as session:
                        row = await session.get(RunRow, run_id)
                        if row is not None:
                            row.status = "failed"
                            row.error_detail = str(exc)
                except Exception as e:  # noqa: BLE001
                    logger.error("status update failed: %s", e)

        asyncio.create_task(_runner())
        return {"run_id": run_id, "status": "running"}

    @app.get("/api/runs/{run_id}")
    async def get_run(run_id: str) -> dict:
        from api.db.session import get_session
        from api.db.schema import RunRow

        async with get_session() as session:
            row = await session.get(RunRow, run_id)
            if row is None:
                raise HTTPException(status_code=404, detail="run not found")
            return {
                "run_id": row.run_id,
                "status": row.status,
                "product_url": row.product_url,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "completed_at": row.completed_at.isoformat() if row.completed_at else None,
                "cost_usd_total": row.cost_usd_total,
                "kalibr_trace_capsule_id": row.kalibr_trace_capsule_id,
                "error_detail": row.error_detail,
            }

    @app.get("/api/runs/{run_id}/events")
    async def run_events(run_id: str, request: Request) -> StreamingResponse:
        from api.events import get_or_create_bus

        bus = get_or_create_bus(run_id)

        async def gen() -> AsyncIterator[bytes]:
            async for evt in bus.stream():
                if await request.is_disconnected():
                    break
                yield f"event: trace\ndata: {json.dumps(evt, default=str)}\n\n".encode()

        return StreamingResponse(gen(), media_type="text/event-stream")

    @app.get("/api/runs/{run_id}/assets/{asset_id}")
    async def get_asset(run_id: str, asset_id: str) -> Response:
        from api.db.session import get_session
        from api.db.schema import ImageAssetRow

        async with get_session() as session:
            stmt = select(ImageAssetRow).where(
                ImageAssetRow.asset_id == asset_id,
                ImageAssetRow.run_id == run_id,
            )
            row = (await session.execute(stmt)).scalar_one_or_none()
            if row is None:
                raise HTTPException(status_code=404, detail="asset not found")
            return Response(
                content=row.bytes_,
                media_type=row.media_type,
                headers={
                    "Cache-Control": "public, max-age=31536000, immutable",
                    "X-Kalibr-Trace-Id": row.kalibr_trace_id or "",
                },
            )

    return app


app = create_app()
