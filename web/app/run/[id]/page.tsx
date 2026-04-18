"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { KalibrEvent, Run, StageId, TraceEvent } from "@/lib/types";
import { STAGES } from "@/lib/types";
import { loadDemoRun } from "@/lib/loadDemoRun";
import StageCard, { type StageStatus } from "@/components/run/StageCard";
import TracePanel from "@/components/run/TracePanel";

// In Next 16 the dynamic-route `params` is a Promise. Client components
// unwrap it with React's `use()`. Verified against
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md.
type PageParams = Promise<{ id: string }>;

// Compress 120s of in-simulation time to ~75s wall-clock so the replay lands
// in the 60-90s window called out in spec §6.2. Still slow enough to narrate.
const WALL_CLOCK_TARGET_SECONDS = 78;

// Events whose agent is "kernel" or "kalibr" don't belong to a stage; they
// anchor the whole run. The table below maps the stage-bearing agents.
const AGENT_TO_STAGE: Record<string, StageId> = {
  scout: "twin",
  apify: "twin",
  cartographer: "wedges",
  clerk: "jury",
  minds: "jury",
  producer: "campaign",
  pixero: "campaign",
  scribe: "plan",
  rory: "plan",
};

export default function RunPage({ params }: { params: PageParams }) {
  const { id: runId } = use(params);

  // TODO: once the orchestrator ships, route unknown runIds through the
  // backend fetch. For Lane A (§8.1) every id serves the pre-baked demo.
  const isDemoId = runId === "demo-linear-001" || runId.startsWith("demo-");

  const [run, setRun] = useState<Run | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load the cached Run once, with AbortController so Strict Mode doesn't
  // leave an in-flight fetch dangling.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    loadDemoRun(controller.signal)
      .then((r) => {
        if (!cancelled) setRun(r);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 font-serif">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
          Demo run failed to load
        </p>
        <h1 className="mt-3 text-3xl text-[var(--ink)]">{loadError}</h1>
        <p className="mt-4 text-[var(--ink-soft)]">
          Expected <code className="font-mono">/cache/demo-linear.json</code> in{" "}
          <code className="font-mono">web/public/cache/</code>.
        </p>
      </main>
    );
  }

  if (!run) {
    return <RunSkeleton runId={runId} />;
  }

  return <RunReplay run={run} runIdFromUrl={runId} isDemoId={isDemoId} />;
}

// ---------------------------------------------------------------------------
// Replay engine: drives the timeline, stages, and trace panel from `run`.
// ---------------------------------------------------------------------------

interface Scheduled {
  source: "trace" | "kalibr";
  offsetMs: number;         // in-run offset (ms), normalized from whatever format
  walledMs: number;         // when to reveal, in wall-clock ms from page-mount
  event: TraceEvent;
}

function RunReplay({
  run,
  runIdFromUrl,
  isDemoId,
}: {
  run: Run;
  runIdFromUrl: string;
  isDemoId: boolean;
}) {
  // Build the replay schedule once per run. This is derived state, not state.
  const schedule = useMemo(() => buildSchedule(run), [run]);
  const runDurationMs = schedule.totalWallMs;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // rAF-based clock. Cheaper than a 100ms interval and smooth for the
    // confidence tick in the header. Stops once we're past the last event.
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      setElapsedMs(elapsed);

      // Advance the revealed-event cursor. O(n) worst case but n=75-80.
      let cursor = 0;
      for (let i = 0; i < schedule.items.length; i++) {
        if (schedule.items[i].walledMs <= elapsed) cursor = i + 1;
        else break;
      }
      setRevealedCount(cursor);

      if (elapsed < runDurationMs + 400) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Clamp to final state.
        setElapsedMs(runDurationMs);
        setRevealedCount(schedule.items.length);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startRef.current = null;
    };
  }, [schedule, runDurationMs]);

  const revealedEvents = useMemo(
    () => schedule.items.slice(0, revealedCount).map((i) => i.event),
    [schedule, revealedCount],
  );

  const isRunning = revealedCount < schedule.items.length;

  // Derive stage state from what's been revealed.
  const stageState = useMemo(
    () => computeStageState(run, revealedEvents),
    [run, revealedEvents],
  );

  // Kalibr counters, ticked by revealed warn lines from kalibr agent.
  const { reroutes, recovered } = useMemo(
    () => computeKalibrCounters(run, revealedEvents),
    [run, revealedEvents],
  );

  // Confidence ticks linearly from 0 to run.confidence across the run.
  const targetConfidence = run.confidence ?? 0;
  const progress = Math.min(1, elapsedMs / Math.max(1, runDurationMs));
  const displayedConfidence = isRunning ? targetConfidence * progress : targetConfidence;

  return (
    <main className="relative z-[1] mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 pb-14 pt-8 md:px-10 md:pt-10">
      {/* ============ PAGE HEADER ============ */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--rule)] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            ← shadow launch
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            /
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]">
            RUN · {runIdFromUrl}
          </span>
          {!isDemoId && (
            <span
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]"
              title="unknown run id — serving demo-linear for Lane A"
            >
              · demo fallback
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em]">
          <span className="text-[var(--muted)]">elapsed</span>
          <span className="text-[var(--ink)]">{formatClock(elapsedMs)}</span>
          <span className="text-[var(--muted)] hidden md:inline">·</span>
          <span className="hidden md:inline text-[var(--muted)]">target</span>
          <span className="hidden md:inline text-[var(--ink-soft)]">
            {formatClock(runDurationMs)}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em]">
          <span className="text-[var(--muted)]">confidence</span>
          <span className="text-[var(--ink)]">
            {displayedConfidence.toFixed(3)}
          </span>
          <span className="rounded-sm border border-[var(--accent)] px-1.5 py-0.5 text-[9px] tracking-[0.24em] text-[var(--accent)]">
            KALIBR · {reroutes} · {recovered}
          </span>
        </div>
      </header>

      {/* ============ HERO STRIP ============ */}
      <section className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            LIVE / {run.hero_target?.toUpperCase() ?? "DEMO"} · pre-launch simulation
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-[1.1] text-[var(--ink)] md:text-5xl">
            Rehearsing the launch.
          </h1>
          <p className="mt-2 max-w-xl font-serif text-[17px] leading-snug text-[var(--ink-soft)]">
            Five agents are assembling a synthetic market for{" "}
            <span className="font-mono text-[var(--accent)] uppercase tracking-[0.08em]">
              {hostOf(run.input.product_url)}
            </span>
            . Watch the twin build, the wedges surface, and the jury deliberate — before the launch touches a real customer.
          </p>
        </div>
        {!isRunning && (
          <Link
            href={`/results/${run.run_id}`}
            className="group inline-flex items-center gap-2 border-b-2 border-[var(--accent)] pb-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)] hover:text-[var(--accent-ink)]"
          >
            See the full run
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        )}
      </section>

      {/* ============ SPLIT GRID (60/40 desktop, stacked on small) ============ */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* LEFT 60% — stage cards */}
        <div className="flex flex-col gap-4">
          {STAGES.map((stage) => (
            <StageCard
              key={stage.id}
              stage={stage}
              status={stageState[stage.id].status}
              summary={stageState[stage.id].summary}
              detail={stageState[stage.id].detail}
            />
          ))}
        </div>

        {/* RIGHT 40% — trace panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <TracePanel
            runId={run.run_id}
            events={revealedEvents}
            elapsedMs={elapsedMs}
            isRunning={isRunning}
            kalibrReroutes={reroutes}
            kalibrRecovered={recovered}
            confidence={displayedConfidence}
            targetConfidence={targetConfidence}
          />
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Skeleton shown while the Run JSON is fetching. Cheap. Keeps layout stable.
// ---------------------------------------------------------------------------
function RunSkeleton({ runId }: { runId: string }) {
  return (
    <main className="mx-auto max-w-[1440px] px-6 pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
        RUN · {runId}
      </p>
      <h1 className="mt-3 font-serif text-4xl text-[var(--ink)]">
        Booting the simulator…
      </h1>
      <p className="mt-2 max-w-xl font-serif text-[17px] text-[var(--ink-soft)]">
        Fetching the cached run from the orchestrator.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          {STAGES.map((s) => (
            <div
              key={s.id}
              className="h-[120px] border border-[var(--rule-soft)] bg-[rgba(255,252,244,0.4)]"
            />
          ))}
        </div>
        <div className="h-[420px] border border-[var(--rule-soft)] bg-[rgba(255,252,244,0.4)]" />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Schedule builder: turn TraceEvents (+ KalibrEvents) into wall-clock timings.
// ---------------------------------------------------------------------------

function buildSchedule(run: Run): { items: Scheduled[]; totalWallMs: number } {
  // Step 1 — normalize every trace event's `t` into seconds-from-run-start.
  const normalizedTrace: Scheduled[] = run.trace.map((ev) => ({
    source: "trace",
    offsetMs: traceTimeToOffsetMs(ev.t, run),
    walledMs: 0, // filled below
    event: ev,
  }));

  // Step 2 — merge in kalibr_events that aren't already present in the trace.
  // The demo JSON already interleaves kalibr warn lines into run.trace, so in
  // practice this is a no-op there. Left in for resilience when real runs
  // emit kalibr separately from the trace.
  const kalibrLines = (run.kalibr_events ?? []).map<Scheduled>((ke) => ({
    source: "kalibr",
    offsetMs: kalibrOffsetMs(ke, run),
    walledMs: 0,
    event: kalibrToTraceEvent(ke),
  }));

  const merged = [...normalizedTrace];
  for (const kl of kalibrLines) {
    const dup = normalizedTrace.find(
      (t) =>
        t.event.agent === "kalibr" &&
        Math.abs(t.offsetMs - kl.offsetMs) < 500 &&
        kl.event.message
          .split(" ")
          .slice(0, 2)
          .every((tok) => t.event.message.includes(tok)),
    );
    if (!dup) merged.push(kl);
  }

  // Sort by in-run offset, stable.
  merged.sort((a, b) => a.offsetMs - b.offsetMs);

  // Step 3 — compress in-run seconds to wall-clock seconds. Floor at the
  // last event offset so we never stretch a short run.
  const lastOffsetMs = merged.length ? merged[merged.length - 1].offsetMs : 0;
  const targetWallMs = WALL_CLOCK_TARGET_SECONDS * 1000;
  const scale = lastOffsetMs > 0 ? Math.min(1, targetWallMs / lastOffsetMs) : 1;

  for (const item of merged) {
    item.walledMs = Math.round(item.offsetMs * scale);
  }

  const totalWallMs = merged.length
    ? merged[merged.length - 1].walledMs
    : 0;

  return { items: merged, totalWallMs };
}

function traceTimeToOffsetMs(t: TraceEvent["t"], run: Run): number {
  // Numeric offsets (the cached demo uses these).
  if (typeof t === "number") return Math.max(0, t * 1000);

  if (typeof t === "string") {
    // "[mm:ss]" or "mm:ss".
    const bracket = /^\[?(\d{1,2}):(\d{2})(?:\.(\d+))?\]?$/.exec(t.trim());
    if (bracket) {
      const m = parseInt(bracket[1], 10);
      const s = parseInt(bracket[2], 10);
      return (m * 60 + s) * 1000;
    }
    const asNum = Number(t);
    if (Number.isFinite(asNum)) return Math.max(0, asNum * 1000);

    const parsed = Date.parse(t);
    if (!Number.isNaN(parsed)) {
      // ISO — compute offset from run.created_at when possible.
      const base = run.created_at ? Date.parse(run.created_at) : NaN;
      if (!Number.isNaN(base)) return Math.max(0, parsed - base);
      // Fall back to the first trace event's ISO timestamp.
      const firstIso = run.trace.find((e) => typeof e.t === "string");
      if (firstIso && typeof firstIso.t === "string") {
        const firstMs = Date.parse(firstIso.t);
        if (!Number.isNaN(firstMs)) return Math.max(0, parsed - firstMs);
      }
      return 0;
    }
  }
  return 0;
}

function kalibrOffsetMs(ke: KalibrEvent, run: Run): number {
  if (ke.t === undefined || ke.t === null) return 0;
  // KalibrEvent.t is typed string, but the demo ships numbers — handle both.
  const anyT = ke.t as unknown;
  if (typeof anyT === "number") return Math.max(0, anyT * 1000);
  return traceTimeToOffsetMs(ke.t, run);
}

function kalibrToTraceEvent(ke: KalibrEvent): TraceEvent {
  const body =
    ke.kind === "reroute" || ke.kind === "retry"
      ? `rerouted ${(ke as KalibrEvent & { goal?: string }).goal ?? "call"} · ${ke.from_model ?? "model"} ${(ke as KalibrEvent & { failure_category?: string }).failure_category ?? "failure"} · fallback ${ke.to_model ?? "fallback"}${ke.recovered ? " · recovered" : ""}`
      : ke.reason ?? ke.kind;
  return {
    t: ke.t ?? "0",
    agent: "kalibr",
    kind: "warn",
    message: body,
  };
}

// ---------------------------------------------------------------------------
// Stage state derivation from the revealed trace.
// ---------------------------------------------------------------------------

interface StageViewState {
  status: StageStatus;
  summary: string | null;
  detail: string | null;
}

function computeStageState(
  run: Run,
  revealed: TraceEvent[],
): Record<StageId, StageViewState> {
  const out: Record<StageId, StageViewState> = {
    twin: { status: "idle", summary: null, detail: null },
    wedges: { status: "idle", summary: null, detail: null },
    jury: { status: "idle", summary: null, detail: null },
    campaign: { status: "idle", summary: null, detail: null },
    plan: { status: "idle", summary: null, detail: null },
  };

  // First touch of a stage agent → running. "complete" in the message → done.
  for (const ev of revealed) {
    const stage = AGENT_TO_STAGE[ev.agent];
    if (!stage) continue;
    if (out[stage].status === "idle") out[stage].status = "running";
    const looksDone =
      ev.kind === "ok" &&
      /stage\s*0\d\s*complete|run complete/i.test(ev.message);
    if (looksDone) {
      out[stage].status = "done";
    }
  }

  // Stage-done summaries & detail lines. Only populate once that stage is done,
  // so summaries don't leak before the jury has spoken.
  if (out.twin.status === "done") {
    const src = run.twin?.sources ?? [];
    const docs = src.reduce((acc, s) => acc + (s.docs_pulled ?? 0), 0);
    out.twin.summary = `${src.length} actors · ${formatNum(docs)} docs · ${run.twin.gaps.length} gaps`;
    out.twin.detail = run.twin.gaps[0] ?? null;
  }
  if (out.wedges.status === "done") {
    out.wedges.summary = `${run.wedges.length} wedges drafted · evidence-backed`;
    out.wedges.detail = run.wedges.map((w) => w.headline).join(" · ");
  }
  if (out.jury.status === "done") {
    const winner = run.winner;
    out.jury.summary = `winner ${winner.wedge_id} · score ${winner.final_score.toFixed(3)} · Δ ${winner.runner_up_delta.toFixed(3)}`;
    out.jury.detail = run.wedges.find((w) => w.id === winner.wedge_id)?.headline ?? null;
  }
  if (out.campaign.status === "done") {
    out.campaign.summary = `${run.ads.length} meta variants · pixero-ready`;
    out.campaign.detail = run.ads[0]?.headline ?? null;
  }
  if (out.plan.status === "done") {
    const tasks = run.launch_board?.tasks?.length ?? 0;
    const milestones = run.launch_board?.timeline?.length ?? 0;
    out.plan.summary = `${tasks} tasks · ${milestones} milestones · 14-day sprint`;
    out.plan.detail = run.launch_board?.rory_board_url
      ? `rory board · ${short(run.launch_board.rory_board_url)}`
      : null;
  }

  return out;
}

function computeKalibrCounters(
  run: Run,
  revealed: TraceEvent[],
): { reroutes: number; recovered: number } {
  // Count warn lines from the kalibr agent that have been revealed. Recovered
  // is derived from the run.kalibr_events[].recovered flag by time-matching.
  const revealedKalibr = revealed.filter(
    (e) => e.agent === "kalibr" && (e.kind === "warn" || e.kind === "info" && /rerouted/i.test(e.message)),
  );
  const reroutes = revealedKalibr.filter((e) => /reroute/i.test(e.message)).length;
  // Map to the structured events by offset position. Good enough for counter.
  const shown = Math.min(reroutes, run.kalibr_events?.length ?? 0);
  const recovered = (run.kalibr_events ?? [])
    .slice(0, shown)
    .filter((k) => k.recovered).length;
  return { reroutes, recovered };
}

// ---------------------------------------------------------------------------
// Small utilities.
// ---------------------------------------------------------------------------

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatNum(n: number): string {
  return n.toLocaleString("en-US");
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function short(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}
