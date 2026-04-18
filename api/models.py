"""Pydantic v2 models for Shadow Launch v2. Single source of truth for
request/response shapes and the in-memory representation of a Run.

See docs/features.md §7 for the feature-level schema and the SQLAlchemy
mirror in `api/db/schema.py` for the persisted columns.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
)

# ---------------------------------------------------------------------------
# Shared primitives
# ---------------------------------------------------------------------------

NonEmpty = Annotated[str, StringConstraints(min_length=1, strip_whitespace=True)]
Score = Annotated[float, Field(ge=-1.0, le=1.0)]
UnitRange = Annotated[float, Field(ge=0.0, le=1.0)]

Platform = Literal["linkedin", "twitter", "facebook", "instagram", "tiktok"]
RunStatus = Literal["queued", "running", "completed", "failed"]
TraceKind = Literal["info", "ok", "warn", "error", "cost"]
PersonaId = Literal[
    "marketing_vp",
    "cfo_skeptic",
    "engineering_lead",
    "target_end_user",
    "social_media_manager",
    "pr_brand_authority",
]
DebateRound = Literal[1, 2]
TargetType = Literal["angle", "asset", "post", "slot"]
AssetMedium = Literal["image", "copy"]
Channel = Literal[
    "linkedin", "twitter", "facebook", "instagram", "tiktok",
    "blog", "email", "youtube",
]

PERSONA_WEIGHTS: dict[str, float] = {
    "marketing_vp": 0.20,
    "cfo_skeptic": 0.25,
    "engineering_lead": 0.15,
    "target_end_user": 0.20,
    "social_media_manager": 0.10,
    "pr_brand_authority": 0.10,
}
assert abs(sum(PERSONA_WEIGHTS.values()) - 1.0) < 1e-9, "persona weights must sum to 1.0"


class _Base(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class _Loose(BaseModel):
    # For data that originates outside our schema (sponsor API responses, etc.).
    model_config = ConfigDict(extra="allow", populate_by_name=True)


# ---------------------------------------------------------------------------
# Input
# ---------------------------------------------------------------------------


class RunInput(_Base):
    product_url: AnyHttpUrl
    brand_voice_guide: str | None = None
    target_regions: list[str] | None = None
    budget_constraint: Literal["lean", "standard", "premium"] | None = None


# ---------------------------------------------------------------------------
# Stage 01 — Product research
# ---------------------------------------------------------------------------


class ProductProfile(_Base):
    product_url: AnyHttpUrl
    brand_name: NonEmpty
    one_liner: NonEmpty
    category: NonEmpty
    positioning_claims: list[NonEmpty] = Field(min_length=1)
    implicit_audience: NonEmpty
    tone_inventory: list[NonEmpty] = Field(default_factory=list)
    messaging_gaps: list[NonEmpty] = Field(default_factory=list)
    kalibr_trace_id: str | None = None


# ---------------------------------------------------------------------------
# Stage 02 — Competitor discovery
# ---------------------------------------------------------------------------


class Competitor(_Base):
    competitor_id: str
    url: AnyHttpUrl
    name: NonEmpty
    positioning: NonEmpty
    relevance_score: UnitRange
    discovery_source: Literal["google_serp", "product_hunt", "g2", "manual"]
    selected: bool = False


# ---------------------------------------------------------------------------
# Stage 03 — Social scraping
# ---------------------------------------------------------------------------


class SocialPost(_Loose):
    # Actor response shapes vary per platform. Keep loose.
    post_id: str | None = None
    url: str | None = None
    content: str | None = None
    posted_at: datetime | str | None = None
    likes: int | None = None
    comments: int | None = None
    shares: int | None = None
    views: int | None = None
    engagement: int | None = None


class SocialSnapshot(_Base):
    snapshot_id: str
    competitor_id: str
    platform: Platform
    handle: str | None = None
    followers: int | None = None
    avg_engagement_rate: float | None = None
    posting_cadence_per_week: float | None = None
    top_posts: list[SocialPost] = Field(default_factory=list)
    last_scraped_at: datetime
    status: Literal["ok", "error", "not_found"] = "ok"
    error_detail: str | None = None


# ---------------------------------------------------------------------------
# Stage 03.5 — Market discourse (Reddit + Trustpilot)
# ---------------------------------------------------------------------------


class DiscourseItem(_Base):
    source: Literal["reddit", "trustpilot"]
    url: AnyHttpUrl | None = None
    title: str | None = None
    body: NonEmpty
    sentiment_score: Score | None = None
    upvotes: int | None = None
    rating: int | None = None  # Trustpilot 1–5


class MarketDiscourse(_Base):
    run_id: str
    reddit_items: list[DiscourseItem] = Field(default_factory=list)
    trustpilot_items: list[DiscourseItem] = Field(default_factory=list)
    top_complaints: list[NonEmpty] = Field(default_factory=list)
    top_desires: list[NonEmpty] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Stage 04 — Campaign generation
# ---------------------------------------------------------------------------


class ImageAsset(_Base):
    asset_id: str
    campaign_angle_id: str
    prompt: NonEmpty
    model: NonEmpty           # e.g. "gpt-image-1"
    media_type: Literal["image/png", "image/jpeg", "image/webp"] = "image/png"
    width: int | None = None
    height: int | None = None
    kalibr_trace_id: str | None = None
    # The raw bytes live on the DB row; the API serves them via a streaming
    # endpoint. Only the URL comes back on the JSON response.
    asset_url: str | None = None


class CampaignAngle(_Base):
    angle_id: str
    hook: NonEmpty
    positioning: NonEmpty
    channel_mix: list[Channel] = Field(min_length=1)
    rationale: NonEmpty
    evidence_competitor_ids: list[str] = Field(default_factory=list)
    asset_ids: list[str] = Field(default_factory=list)


class Campaign(_Base):
    campaign_id: str
    run_id: str
    angles: list[CampaignAngle] = Field(min_length=1, max_length=3)


# ---------------------------------------------------------------------------
# Stage 05 — Content calendar
# ---------------------------------------------------------------------------


class CalendarSlot(_Base):
    slot_id: str
    day: int = Field(ge=1, le=14)
    channel: Channel
    post_type: Literal["image", "text", "link", "video"]
    # JSON field is "copy"; Python attribute is `post_copy` to avoid
    # shadowing BaseModel.copy().
    post_copy: NonEmpty = Field(alias="copy")
    asset_id: str | None = None
    posting_time: NonEmpty    # e.g. "09:00 PT" — relative to "day 1 = go-live"
    rationale: NonEmpty


class ContentCalendar(_Base):
    calendar_id: str
    run_id: str
    days_span: int = 14
    slots: list[CalendarSlot] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Stage 06 — Persona debate
# ---------------------------------------------------------------------------


class PersonaReaction(_Base):
    reaction_id: str
    run_id: str
    persona_id: PersonaId
    target_type: TargetType
    target_id: str
    round: DebateRound = 1
    score: Score
    quote: NonEmpty
    top_objection: str | None = None
    # Set when this reaction is a round-2 rebuttal responding to another persona.
    rebuts_persona_id: PersonaId | None = None


class Verdict(_Base):
    verdict_id: str
    run_id: str
    target_type: TargetType
    target_id: str
    consensus_score: Score
    action_required: bool
    dissenting_personas: list[PersonaId] = Field(default_factory=list)
    why: NonEmpty


# ---------------------------------------------------------------------------
# Instrumentation
# ---------------------------------------------------------------------------


class TraceEvent(_Base):
    t: datetime
    stage: int | None = None          # 1..6 or None for cross-stage
    agent: NonEmpty                   # stage slug or sub-actor name
    message: NonEmpty
    kind: TraceKind = "info"
    kalibr_model: str | None = None
    kalibr_cost_delta_usd: float | None = None
    meta: dict | None = None


class KalibrEvent(_Base):
    event_id: str
    t: datetime
    goal: NonEmpty
    from_model: str | None = None
    to_model: str | None = None
    failure_category: str | None = None
    recovered: bool | None = None
    cost_usd_delta: float | None = None
    trace_id: str | None = None


# ---------------------------------------------------------------------------
# Run — aggregate view
# ---------------------------------------------------------------------------


class Run(_Base):
    run_id: str
    status: RunStatus
    created_at: datetime
    completed_at: datetime | None = None
    cost_usd_total: float = 0.0
    kalibr_trace_capsule_id: str | None = None

    input: RunInput
    product_profile: ProductProfile | None = None
    competitors: list[Competitor] = Field(default_factory=list)
    social_snapshots: list[SocialSnapshot] = Field(default_factory=list)
    discourse: MarketDiscourse | None = None
    campaign: Campaign | None = None
    calendar: ContentCalendar | None = None
    reactions: list[PersonaReaction] = Field(default_factory=list)
    verdicts: list[Verdict] = Field(default_factory=list)
    trace: list[TraceEvent] = Field(default_factory=list)
    kalibr_events: list[KalibrEvent] = Field(default_factory=list)

    @field_validator("created_at", "completed_at", mode="before")
    @classmethod
    def _coerce_dt(cls, v):  # noqa: ANN001
        if isinstance(v, str) and v.endswith("Z"):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v


__all__ = [
    "Campaign",
    "CampaignAngle",
    "CalendarSlot",
    "Channel",
    "Competitor",
    "ContentCalendar",
    "DebateRound",
    "DiscourseItem",
    "ImageAsset",
    "KalibrEvent",
    "MarketDiscourse",
    "PERSONA_WEIGHTS",
    "PersonaId",
    "PersonaReaction",
    "Platform",
    "ProductProfile",
    "Run",
    "RunInput",
    "RunStatus",
    "SocialPost",
    "SocialSnapshot",
    "TargetType",
    "TraceEvent",
    "TraceKind",
    "Verdict",
]
