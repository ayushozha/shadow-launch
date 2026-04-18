// Shape of the cached Run JSON. Mirrors specs.md §5 and cache/demo-linear.json.
// Keep in lockstep with the backend Pydantic models when those land.

export type TraceKind = "info" | "ok" | "warn" | "error";

export interface TraceEvent {
  t: string; // ISO datetime or relative offset string from the cached run
  agent: string;
  message: string;
  kind: TraceKind;
}

export interface Source {
  actor: string;
  status: string;
  docs_pulled?: number;
  elapsed_ms?: number;
  summary: string;
}

export interface MarketTwin {
  positioning_map: Record<string, string[]>;
  gaps: string[];
  sources: Source[];
}

export interface Wedge {
  id: string; // w1 | w2 | w3
  headline: string;
  thesis: string;
  evidence: string[];
}

export type JurorId = "champion" | "economic" | "blocker" | "skeptic";

export interface JurorReaction {
  juror_id: JurorId;
  wedge_id: string;
  quote: string;
  score: number; // -1 to +1
  top_objection?: string;
}

export interface Dissent {
  juror_id: JurorId;
  objection: string;
}

export interface Deliberation {
  rounds: number;
  reactions: JurorReaction[];
  consensus_vector: Record<string, number>; // wedge_id -> weighted score
  dissent_log: Dissent[];
}

export interface WedgeVerdict {
  wedge_id: string;
  final_score: number;
  runner_up_delta: number;
  why_it_won: string;
  surviving_objections: string[];
}

export interface AdVariant {
  headline: string;
  body: string;
  cta: string;
  visual_brief: string;
  pixero_url: string | null;
}

export interface Task {
  id?: string;
  title: string;
  owner: string;
  day?: number;
  due?: string;
  notes?: string;
}

export interface Milestone {
  day: number;
  label: string;
}

export interface LaunchBoard {
  tasks: Task[];
  timeline: Milestone[];
  executive_summary: string;
  rory_board_url: string | null;
}

export interface KalibrEvent {
  t?: string;
  kind: string; // e.g. "reroute", "retry", "recover"
  from_model?: string;
  to_model?: string;
  reason?: string;
  recovered?: boolean;
}

export interface Run {
  run_id: string;
  created_at: string;
  hero_target?: string;
  runtime_seconds?: number;
  confidence?: number;
  input: {
    product_url: string;
    competitor_urls: string[];
    icp_description: string;
  };
  twin: MarketTwin;
  wedges: Wedge[];
  deliberation: Deliberation;
  winner: WedgeVerdict;
  ads: AdVariant[];
  launch_board: LaunchBoard;
  trace: TraceEvent[];
  kalibr_events: KalibrEvent[];
}

// Stage card metadata — drives the left column of the Live Run View.
export type StageId = "twin" | "wedges" | "jury" | "campaign" | "plan";

export interface StageMeta {
  id: StageId;
  num: string; // e.g. "STAGE 01"
  title: string; // display title
  agent: string; // agent name in the trace (e.g. "scout", "cartographer")
  sponsor: string; // sponsor attribution (Apify / Claude / Minds AI / Pixero / Rory)
}

export const STAGES: StageMeta[] = [
  { id: "twin", num: "STAGE 01", title: "Market twin", agent: "scout", sponsor: "Apify" },
  { id: "wedges", num: "STAGE 02", title: "Wedge discovery", agent: "cartographer", sponsor: "Claude" },
  { id: "jury", num: "STAGE 03", title: "Jury deliberation", agent: "clerk", sponsor: "Minds AI" },
  { id: "campaign", num: "STAGE 04", title: "Campaign manufacture", agent: "producer", sponsor: "Pixero" },
  { id: "plan", num: "STAGE 05", title: "Launch plan", agent: "scribe", sponsor: "Rory" },
];
