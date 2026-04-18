// TypeScript mirror of api/models.py (v2 · GTM Strategy Simulator).
// Keep in lockstep with the Pydantic source of truth.

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type Platform =
  | "linkedin"
  | "twitter"
  | "facebook"
  | "instagram"
  | "tiktok";

export type Channel =
  | "linkedin"
  | "twitter"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "blog"
  | "email"
  | "youtube";

export type RunStatus = "queued" | "running" | "completed" | "failed";

export type TraceKind = "info" | "ok" | "warn" | "error" | "cost";

export type PersonaId =
  | "marketing_vp"
  | "cfo_skeptic"
  | "engineering_lead"
  | "target_end_user"
  | "social_media_manager"
  | "pr_brand_authority";

export type TargetType = "angle" | "asset" | "post" | "slot";
export type DebateRound = 1 | 2;

export const PERSONA_WEIGHTS: Record<PersonaId, number> = {
  marketing_vp: 0.2,
  cfo_skeptic: 0.25,
  engineering_lead: 0.15,
  target_end_user: 0.2,
  social_media_manager: 0.1,
  pr_brand_authority: 0.1,
};

export const PERSONA_LABELS: Record<PersonaId, string> = {
  marketing_vp: "Marketing VP",
  cfo_skeptic: "CFO Skeptic",
  engineering_lead: "Engineering Lead",
  target_end_user: "Target End-User",
  social_media_manager: "Social Media Manager",
  pr_brand_authority: "PR / Brand Authority",
};

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface RunInput {
  product_url: string;
  brand_voice_guide?: string | null;
  target_regions?: string[] | null;
  budget_constraint?: "lean" | "standard" | "premium" | null;
}

// ---------------------------------------------------------------------------
// Stage 01 — Product research
// ---------------------------------------------------------------------------

export interface ProductProfile {
  product_url: string;
  brand_name: string;
  one_liner: string;
  category: string;
  positioning_claims: string[];
  implicit_audience: string;
  tone_inventory: string[];
  messaging_gaps: string[];
  kalibr_trace_id?: string | null;
}

// ---------------------------------------------------------------------------
// Stage 02 — Competitor discovery
// ---------------------------------------------------------------------------

export interface Competitor {
  competitor_id: string;
  url: string;
  name: string;
  positioning: string;
  relevance_score: number;
  discovery_source: "google_serp" | "product_hunt" | "g2" | "manual";
  selected: boolean;
}

// ---------------------------------------------------------------------------
// Stage 03 — Social scraping
// ---------------------------------------------------------------------------

export interface SocialPost {
  post_id?: string;
  url?: string;
  content?: string;
  posted_at?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  engagement?: number;
  [k: string]: unknown;
}

export interface SocialSnapshot {
  snapshot_id: string;
  competitor_id: string;
  platform: Platform;
  handle?: string | null;
  followers?: number | null;
  avg_engagement_rate?: number | null;
  posting_cadence_per_week?: number | null;
  top_posts: SocialPost[];
  last_scraped_at: string;
  status: "ok" | "error" | "not_found";
  error_detail?: string | null;
}

// ---------------------------------------------------------------------------
// Stage 03.5 — Market discourse
// ---------------------------------------------------------------------------

export interface DiscourseItem {
  source: "reddit" | "trustpilot";
  url?: string | null;
  title?: string | null;
  body: string;
  sentiment_score?: number | null;
  upvotes?: number | null;
  rating?: number | null;
}

export interface MarketDiscourse {
  run_id: string;
  reddit_items: DiscourseItem[];
  trustpilot_items: DiscourseItem[];
  top_complaints: string[];
  top_desires: string[];
}

// ---------------------------------------------------------------------------
// Stage 04 — Campaign + assets
// ---------------------------------------------------------------------------

export interface ImageAsset {
  asset_id: string;
  campaign_angle_id: string;
  prompt: string;
  model: string;
  media_type: "image/png" | "image/jpeg" | "image/webp";
  width?: number | null;
  height?: number | null;
  kalibr_trace_id?: string | null;
  asset_url?: string | null;
}

export interface CampaignAngle {
  angle_id: string;
  hook: string;
  positioning: string;
  channel_mix: Channel[];
  rationale: string;
  evidence_competitor_ids: string[];
  asset_ids: string[];
}

export interface Campaign {
  campaign_id: string;
  run_id: string;
  angles: CampaignAngle[];
}

// ---------------------------------------------------------------------------
// Stage 05 — Content calendar
// ---------------------------------------------------------------------------

export interface CalendarSlot {
  slot_id: string;
  day: number;
  channel: Channel;
  post_type: "image" | "text" | "link" | "video";
  copy: string;
  asset_id?: string | null;
  posting_time: string;
  rationale: string;
}

export interface ContentCalendar {
  calendar_id: string;
  run_id: string;
  days_span: number;
  slots: CalendarSlot[];
}

// ---------------------------------------------------------------------------
// Stage 06 — Persona debate
// ---------------------------------------------------------------------------

export interface PersonaReaction {
  reaction_id: string;
  run_id: string;
  persona_id: PersonaId;
  target_type: TargetType;
  target_id: string;
  round: DebateRound;
  score: number;
  quote: string;
  top_objection?: string | null;
  rebuts_persona_id?: PersonaId | null;
}

export interface Verdict {
  verdict_id: string;
  run_id: string;
  target_type: TargetType;
  target_id: string;
  consensus_score: number;
  action_required: boolean;
  dissenting_personas: PersonaId[];
  why: string;
}

// ---------------------------------------------------------------------------
// Instrumentation
// ---------------------------------------------------------------------------

export interface TraceEvent {
  t: string;
  stage?: number | null;
  agent: string;
  message: string;
  kind: TraceKind;
  kalibr_model?: string | null;
  kalibr_cost_delta_usd?: number | null;
  meta?: Record<string, unknown> | null;
}

export interface KalibrEvent {
  event_id: string;
  t: string;
  goal: string;
  from_model?: string | null;
  to_model?: string | null;
  failure_category?: string | null;
  recovered?: boolean | null;
  cost_usd_delta?: number | null;
  trace_id?: string | null;
}

// ---------------------------------------------------------------------------
// Top-level Run
// ---------------------------------------------------------------------------

export interface Run {
  run_id: string;
  status: RunStatus;
  created_at: string;
  completed_at?: string | null;
  cost_usd_total: number;
  kalibr_trace_capsule_id?: string | null;

  input: RunInput;
  product_profile?: ProductProfile | null;
  competitors: Competitor[];
  social_snapshots: SocialSnapshot[];
  discourse?: MarketDiscourse | null;
  campaign?: Campaign | null;
  calendar?: ContentCalendar | null;
  reactions: PersonaReaction[];
  verdicts: Verdict[];
  trace: TraceEvent[];
  kalibr_events: KalibrEvent[];
}

// ---------------------------------------------------------------------------
// Stages — for the Live Run View
// ---------------------------------------------------------------------------

export type StageId =
  | "product"
  | "competitors"
  | "social"
  | "discourse"
  | "campaign"
  | "calendar"
  | "debate";

export interface StageMeta {
  id: StageId;
  num: string;
  title: string;
  agent: string;
  sponsor: string;
}

export const STAGES: StageMeta[] = [
  {
    id: "product",
    num: "STAGE 01",
    title: "Product research",
    agent: "product_researcher",
    sponsor: "Apify + OpenAI",
  },
  {
    id: "competitors",
    num: "STAGE 02",
    title: "Competitor discovery",
    agent: "competitor_discoverer",
    sponsor: "Apify + Kalibr",
  },
  {
    id: "social",
    num: "STAGE 03",
    title: "Social analysis",
    agent: "social_scraper",
    sponsor: "Apify · 5 platforms",
  },
  {
    id: "discourse",
    num: "STAGE 03.5",
    title: "Market discourse",
    agent: "market_discourse",
    sponsor: "Apify · Reddit + Trustpilot",
  },
  {
    id: "campaign",
    num: "STAGE 04",
    title: "Campaign generation",
    agent: "campaign_generator",
    sponsor: "OpenAI · gpt-4o + gpt-image-1",
  },
  {
    id: "calendar",
    num: "STAGE 05",
    title: "Content calendar",
    agent: "calendar_builder",
    sponsor: "OpenAI via Kalibr",
  },
  {
    id: "debate",
    num: "STAGE 06",
    title: "Persona debate",
    agent: "persona_debater",
    sponsor: "Minds AI · 6-persona panel",
  },
];
