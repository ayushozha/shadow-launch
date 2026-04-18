"""Postgres persistence layer (SQLAlchemy 2.x async + asyncpg).

Access pattern:
    from api.db.session import get_session
    async with get_session() as session:
        ...

Migrations are managed via Alembic — see `alembic/env.py`.
"""
