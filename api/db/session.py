"""Async SQLAlchemy engine + session factory.

Loads `DATABASE_URL` from the environment (set by python-dotenv at process
startup). Shape:
    postgresql+asyncpg://admin:<pw>@127.0.0.1:5433/shadowlaunch

Production deploys keep the same shape but route through the SSH-tunneled
127.0.0.1:5433 on the Fly.io / Render instance.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

logger = logging.getLogger(__name__)

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Start the SSH tunnel to 72.62.82.57 "
            "and copy the connection string from .env.example."
        )
    return url


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            _database_url(),
            echo=False,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        logger.info("async engine bound to %s", _database_url().split("@")[-1])
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(), expire_on_commit=False, class_=AsyncSession
        )
    return _session_factory


@asynccontextmanager
async def get_session() -> AsyncIterator[AsyncSession]:
    """Context manager yielding a live `AsyncSession`. Commits on success,
    rolls back on exception, always closes."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None
