"""SQLAlchemy 2.x declarative schema — mirrors the Pydantic models in
`api/models.py`. Alembic migrations are generated from this module.

Design notes
------------
- `run_id` (string, assigned at insert) is the foreign-key anchor across all
  tables. A single run owns every row it creates.
- JSONB is used for semi-structured payloads (social top_posts, meta bags)
  where the shape is provider-dependent and cheap to project in Postgres.
- Image bytes live in `image_assets.bytes` (bytea). Small assets (~100–500 KB
  per image × <25 per run) keep the DB size reasonable for the hackathon
  timeline. Swap to object storage later if needed.
- Timestamps use `timezone=True` everywhere; the DB stores UTC.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Run (root)
# ---------------------------------------------------------------------------


class RunRow(Base):
    __tablename__ = "runs"

    run_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    product_url: Mapped[str] = mapped_column(Text, nullable=False)
    brand_voice_guide: Mapped[str | None] = mapped_column(Text)
    target_regions: Mapped[list | None] = mapped_column(JSONB)
    budget_constraint: Mapped[str | None] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="queued")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cost_usd_total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    kalibr_trace_capsule_id: Mapped[str | None] = mapped_column(String(128))
    error_detail: Mapped[str | None] = mapped_column(Text)

    product_profile: Mapped["ProductProfileRow | None"] = relationship(
        back_populates="run", cascade="all, delete-orphan", uselist=False
    )
    competitors: Mapped[list["CompetitorRow"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    snapshots: Mapped[list["SocialSnapshotRow"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    discourse_items: Mapped[list["DiscourseRow"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    campaigns: Mapped[list["CampaignRow"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    assets: Mapped[list["ImageAssetRow"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    calendars: Mapped[list["ContentCalendarRow"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    reactions: Mapped[list["PersonaReactionRow"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    verdicts: Mapped[list["VerdictRow"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    trace_events: Mapped[list["TraceEventRow"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    kalibr_events: Mapped[list["KalibrEventRow"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class ProductProfileRow(Base):
    __tablename__ = "product_profiles"

    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), primary_key=True
    )
    brand_name: Mapped[str] = mapped_column(Text, nullable=False)
    one_liner: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False)
    positioning_claims: Mapped[list] = mapped_column(JSONB, nullable=False)
    implicit_audience: Mapped[str] = mapped_column(Text, nullable=False)
    tone_inventory: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    messaging_gaps: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    kalibr_trace_id: Mapped[str | None] = mapped_column(String(128))

    run: Mapped[RunRow] = relationship(back_populates="product_profile")


# ---------------------------------------------------------------------------
# Competitors + socials + discourse
# ---------------------------------------------------------------------------


class CompetitorRow(Base):
    __tablename__ = "competitors"

    competitor_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    positioning: Mapped[str] = mapped_column(Text, nullable=False)
    relevance_score: Mapped[float] = mapped_column(Float, nullable=False)
    discovery_source: Mapped[str] = mapped_column(String(32), nullable=False)
    selected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    run: Mapped[RunRow] = relationship(back_populates="competitors")
    snapshots: Mapped[list["SocialSnapshotRow"]] = relationship(
        back_populates="competitor", cascade="all, delete-orphan"
    )


class SocialSnapshotRow(Base):
    __tablename__ = "social_snapshots"

    snapshot_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), index=True
    )
    competitor_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("competitors.competitor_id", ondelete="CASCADE"), index=True
    )
    platform: Mapped[str] = mapped_column(String(16), nullable=False)
    handle: Mapped[str | None] = mapped_column(Text)
    followers: Mapped[int | None] = mapped_column(Integer)
    avg_engagement_rate: Mapped[float | None] = mapped_column(Float)
    posting_cadence_per_week: Mapped[float | None] = mapped_column(Float)
    top_posts: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    last_scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="ok")
    error_detail: Mapped[str | None] = mapped_column(Text)

    run: Mapped[RunRow] = relationship(back_populates="snapshots")
    competitor: Mapped[CompetitorRow] = relationship(back_populates="snapshots")

    __table_args__ = (
        UniqueConstraint(
            "competitor_id", "platform", name="uq_snapshot_competitor_platform"
        ),
    )


class DiscourseRow(Base):
    __tablename__ = "discourse_items"

    item_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), index=True
    )
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    url: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment_score: Mapped[float | None] = mapped_column(Float)
    upvotes: Mapped[int | None] = mapped_column(Integer)
    rating: Mapped[int | None] = mapped_column(Integer)
    meta: Mapped[dict | None] = mapped_column(JSONB)

    run: Mapped[RunRow] = relationship(back_populates="discourse_items")


# ---------------------------------------------------------------------------
# Campaigns + assets
# ---------------------------------------------------------------------------


class CampaignRow(Base):
    __tablename__ = "campaigns"

    campaign_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), index=True
    )
    angles: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    run: Mapped[RunRow] = relationship(back_populates="campaigns")


class ImageAssetRow(Base):
    __tablename__ = "image_assets"

    asset_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), index=True
    )
    campaign_angle_id: Mapped[str] = mapped_column(String(64), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)
    media_type: Mapped[str] = mapped_column(String(32), nullable=False, default="image/png")
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    bytes_: Mapped[bytes] = mapped_column("bytes", LargeBinary, nullable=False)
    kalibr_trace_id: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    run: Mapped[RunRow] = relationship(back_populates="assets")


# ---------------------------------------------------------------------------
# Content calendar
# ---------------------------------------------------------------------------


class ContentCalendarRow(Base):
    __tablename__ = "content_calendars"

    calendar_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), index=True
    )
    days_span: Mapped[int] = mapped_column(Integer, nullable=False, default=14)

    run: Mapped[RunRow] = relationship(back_populates="calendars")
    slots: Mapped[list["CalendarSlotRow"]] = relationship(
        back_populates="calendar", cascade="all, delete-orphan"
    )


class CalendarSlotRow(Base):
    __tablename__ = "calendar_slots"

    slot_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    calendar_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("content_calendars.calendar_id", ondelete="CASCADE"), index=True
    )
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    post_type: Mapped[str] = mapped_column(String(16), nullable=False)
    copy_text: Mapped[str] = mapped_column("copy", Text, nullable=False)
    asset_id: Mapped[str | None] = mapped_column(String(64))
    posting_time: Mapped[str] = mapped_column(String(32), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)

    calendar: Mapped[ContentCalendarRow] = relationship(back_populates="slots")


# ---------------------------------------------------------------------------
# Persona debate + verdicts
# ---------------------------------------------------------------------------


class PersonaReactionRow(Base):
    __tablename__ = "persona_reactions"

    reaction_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), index=True
    )
    persona_id: Mapped[str] = mapped_column(String(32), nullable=False)
    target_type: Mapped[str] = mapped_column(String(16), nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    round: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    quote: Mapped[str] = mapped_column(Text, nullable=False)
    top_objection: Mapped[str | None] = mapped_column(Text)
    rebuts_persona_id: Mapped[str | None] = mapped_column(String(32))

    run: Mapped[RunRow] = relationship(back_populates="reactions")


class VerdictRow(Base):
    __tablename__ = "verdicts"

    verdict_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), index=True
    )
    target_type: Mapped[str] = mapped_column(String(16), nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    consensus_score: Mapped[float] = mapped_column(Float, nullable=False)
    action_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    dissenting_personas: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    why: Mapped[str] = mapped_column(Text, nullable=False)

    run: Mapped[RunRow] = relationship(back_populates="verdicts")


# ---------------------------------------------------------------------------
# Instrumentation
# ---------------------------------------------------------------------------


class TraceEventRow(Base):
    __tablename__ = "trace_events"

    event_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), index=True
    )
    t: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    stage: Mapped[int | None] = mapped_column(Integer)
    agent: Mapped[str] = mapped_column(String(64), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="info")
    kalibr_model: Mapped[str | None] = mapped_column(String(64))
    kalibr_cost_delta_usd: Mapped[float | None] = mapped_column(Float)
    meta: Mapped[dict | None] = mapped_column(JSONB)

    run: Mapped[RunRow] = relationship(back_populates="trace_events")


class KalibrEventRow(Base):
    __tablename__ = "kalibr_events"

    event_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("runs.run_id", ondelete="CASCADE"), index=True
    )
    t: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    goal: Mapped[str] = mapped_column(String(64), nullable=False)
    from_model: Mapped[str | None] = mapped_column(String(64))
    to_model: Mapped[str | None] = mapped_column(String(64))
    failure_category: Mapped[str | None] = mapped_column(String(64))
    recovered: Mapped[bool | None] = mapped_column(Boolean)
    cost_usd_delta: Mapped[float | None] = mapped_column(Float)
    trace_id: Mapped[str | None] = mapped_column(String(128))

    run: Mapped[RunRow] = relationship(back_populates="kalibr_events")


class MindsSparkRow(Base):
    """Cache of Minds Spark IDs per persona so we don't burn plan quota
    re-creating sparks across runs. Keyed by persona_id (not run_id)."""

    __tablename__ = "minds_sparks"

    persona_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    spark_id: Mapped[str] = mapped_column(String(64), nullable=False)
    panel_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    system_prompt_hash: Mapped[str] = mapped_column(String(64), nullable=False)


__all__ = [
    "Base",
    "CampaignRow",
    "CalendarSlotRow",
    "CompetitorRow",
    "ContentCalendarRow",
    "DiscourseRow",
    "ImageAssetRow",
    "KalibrEventRow",
    "MindsSparkRow",
    "PersonaReactionRow",
    "ProductProfileRow",
    "RunRow",
    "SocialSnapshotRow",
    "TraceEventRow",
    "VerdictRow",
]
