// Typed client for the Shadow Launch backend.
//
// Backend URL is read from NEXT_PUBLIC_API_URL. Default is the dev server at
// http://localhost:8000. The backend is the single source of truth — this
// module does NOT fall back to any cached JSON. If a call fails, it throws
// an `ApiError` and the calling component renders an error state.

import type {
  Competitor,
  ContentCalendar,
  MarketDiscourse,
  PersonaReaction,
  Run,
  RunInput,
  RunStatus,
  SocialSnapshot,
  TraceEvent,
  Verdict,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
  ) {
    super(`${status} ${statusText}: ${body}`);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, res.statusText, body);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export interface CreateRunResponse {
  run_id: string;
  status: RunStatus;
}

export async function createRun(input: RunInput): Promise<CreateRunResponse> {
  return request<CreateRunResponse>("/api/runs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getRun(runId: string): Promise<Run> {
  return request<Run>(`/api/runs/${encodeURIComponent(runId)}`);
}

export interface RunMeta {
  run_id: string;
  status: RunStatus;
  product_url: string;
  created_at: string | null;
  completed_at: string | null;
  cost_usd_total: number;
  kalibr_trace_capsule_id: string | null;
  error_detail: string | null;
}

export async function getRunMeta(runId: string): Promise<RunMeta> {
  return request<RunMeta>(`/api/runs/${encodeURIComponent(runId)}`);
}

// ---------------------------------------------------------------------------
// Sub-resource fetchers (used by the results pages)
// ---------------------------------------------------------------------------

export async function getCompetitors(runId: string): Promise<Competitor[]> {
  return request<Competitor[]>(`/api/runs/${encodeURIComponent(runId)}/competitors`);
}

export async function getSocialSnapshots(runId: string): Promise<SocialSnapshot[]> {
  return request<SocialSnapshot[]>(
    `/api/runs/${encodeURIComponent(runId)}/snapshots`,
  );
}

export async function getDiscourse(runId: string): Promise<MarketDiscourse> {
  return request<MarketDiscourse>(
    `/api/runs/${encodeURIComponent(runId)}/discourse`,
  );
}

export async function getCalendar(runId: string): Promise<ContentCalendar> {
  return request<ContentCalendar>(
    `/api/runs/${encodeURIComponent(runId)}/calendar`,
  );
}

export async function getDebate(
  runId: string,
): Promise<{ reactions: PersonaReaction[]; verdicts: Verdict[] }> {
  return request<{ reactions: PersonaReaction[]; verdicts: Verdict[] }>(
    `/api/runs/${encodeURIComponent(runId)}/debate`,
  );
}

export function assetUrl(runId: string, assetId: string): string {
  return `${BASE_URL}/api/runs/${encodeURIComponent(runId)}/assets/${encodeURIComponent(assetId)}`;
}

// ---------------------------------------------------------------------------
// SSE stream
// ---------------------------------------------------------------------------

export interface EventStreamHandle {
  close: () => void;
}

/**
 * Subscribe to the live trace event stream for a run. `onEvent` is called
 * with each `TraceEvent` as it arrives. `onError` is called if the stream
 * drops; the caller may choose to retry or surface an error state.
 */
export function subscribeToRunEvents(
  runId: string,
  onEvent: (evt: TraceEvent) => void,
  onError?: (err: Event) => void,
): EventStreamHandle {
  const url = `${BASE_URL}/api/runs/${encodeURIComponent(runId)}/events`;
  const source = new EventSource(url);

  source.addEventListener("trace", (e: MessageEvent) => {
    try {
      const payload = JSON.parse(e.data) as TraceEvent;
      onEvent(payload);
    } catch (err) {
      console.error("failed to parse trace event", err, e.data);
    }
  });

  source.onerror = (e: Event) => {
    if (onError) onError(e);
  };

  return {
    close: () => source.close(),
  };
}

// ---------------------------------------------------------------------------
// Feedback (Kalibr cross-run learning)
// ---------------------------------------------------------------------------

export interface FeedbackPayload {
  target_type: "angle" | "asset" | "post" | "slot";
  target_id: string;
  verdict: "approved" | "rejected";
  reason?: string;
}

export async function postFeedback(
  runId: string,
  payload: FeedbackPayload,
): Promise<void> {
  await request<void>(`/api/runs/${encodeURIComponent(runId)}/feedback`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { BASE_URL };
