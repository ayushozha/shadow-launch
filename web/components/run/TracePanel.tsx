"use client";

import { useEffect, useRef } from "react";
import type { TraceEvent, TraceKind } from "@/lib/types";

export interface TracePanelProps {
  events: TraceEvent[];
  runId: string;
  isRunning: boolean;
  baseTimeMs: number | null; // the timestamp of the first trace event (ms epoch), for relative clocks
  connectionState?: "connecting" | "open" | "retrying" | "closed";
  retryInSeconds?: number | null;
}

// Live streaming trace panel. Editorial-readout look: paper bg, ink text,
// agent name in accent red. Each line prefixed with [mm:ss] elapsed (derived
// from the first event's timestamp, not wall clock). Auto-tails unless the
// user has scrolled up.
export default function TracePanel({
  events,
  runId,
  isRunning,
  baseTimeMs,
  connectionState = "open",
  retryInSeconds,
}: TracePanelProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = useRef(true);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (!pinnedToBottomRef.current) return;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [events.length]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      pinnedToBottomRef.current = distFromBottom < 28;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      className="flex flex-col border border-[var(--rule)] bg-[rgba(255,252,244,0.5)]"
      aria-label="Live trace readout"
    >
      {/* Ink header strip */}
      <header className="flex items-center justify-between gap-3 border-b border-[var(--rule)] bg-[var(--ink)] px-4 py-2.5 text-[var(--paper)]">
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase">
          SIM_RUN / {shortRunId(runId)}
        </span>
        <div className="flex items-center gap-1.5" aria-hidden>
          <Dot on={isRunning} delay={0} />
          <Dot on={isRunning} delay={160} />
          <Dot on={!isRunning} delay={320} solid={!isRunning} />
        </div>
      </header>

      {/* Connection state strip */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--rule-soft)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        <span>
          {connectionState === "connecting" && "CONNECTING…"}
          {connectionState === "open" && (isRunning ? "STREAMING" : "CLOSED · COMPLETE")}
          {connectionState === "retrying" && (
            <span className="text-[var(--accent)]">
              DROPPED · RETRY IN {retryInSeconds ?? 1}s
            </span>
          )}
          {connectionState === "closed" && "CLOSED"}
        </span>
        <span>TRACE · {events.length}</span>
      </div>

      {/* Body — stream of lines */}
      <div
        ref={bodyRef}
        className="relative flex-1 overflow-y-auto px-3.5 py-4 font-mono text-[11.5px] leading-[1.9] text-[var(--ink-soft)]"
        style={{ minHeight: 420, maxHeight: "calc(100vh - 240px)" }}
        aria-live="polite"
      >
        {events.length === 0 && (
          <p className="text-[var(--muted)] italic">
            {connectionState === "retrying"
              ? "reconnecting to orchestrator…"
              : "waiting for orchestrator handshake…"}
          </p>
        )}
        {events.map((ev, i) => (
          <TraceLine key={i} ev={ev} baseTimeMs={baseTimeMs} />
        ))}
        {isRunning && <Caret />}
      </div>
    </section>
  );
}

function TraceLine({
  ev,
  baseTimeMs,
}: {
  ev: TraceEvent;
  baseTimeMs: number | null;
}) {
  const kindClass = kindColor(ev.kind);
  const tLabel = formatOffsetFromBase(ev.t, baseTimeMs);
  const isCost = ev.kind === "cost";
  const costPrefix = isCost ? (
    <span className="mr-1 italic text-[var(--muted)]">(cost)</span>
  ) : null;
  const costUsd =
    typeof ev.kalibr_cost_delta_usd === "number" && ev.kalibr_cost_delta_usd > 0
      ? `$${ev.kalibr_cost_delta_usd.toFixed(4)}`
      : null;

  return (
    <div className="block whitespace-pre-wrap break-words">
      <span className="text-[var(--muted)]">[{tLabel}]</span>{" "}
      <span className="uppercase text-[var(--accent)]">{ev.agent}</span>
      <span className="text-[var(--muted)]"> · </span>
      {costPrefix}
      <span className={kindClass}>{ev.message}</span>
      {ev.kalibr_model && (
        <span className="ml-2 rounded-sm border border-[var(--rule-soft)] bg-[var(--paper-deep)] px-1 py-[1px] text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
          {ev.kalibr_model}
          {costUsd ? ` · ${costUsd}` : ""}
        </span>
      )}
    </div>
  );
}

function kindColor(kind: TraceKind): string {
  switch (kind) {
    case "ok":
      return "text-[var(--phosphor)]";
    case "warn":
      return "text-[#c98a3e]";
    case "error":
      return "text-[var(--accent)]";
    case "cost":
      return "italic text-[var(--muted)]";
    case "info":
    default:
      return "text-[var(--ink-soft)]";
  }
}

function Dot({
  on,
  delay,
  solid,
}: {
  on: boolean;
  delay: number;
  solid?: boolean;
}) {
  return (
    <span
      className={`inline-block h-[7px] w-[7px] rounded-full ${
        on
          ? "bg-[var(--accent)] animate-pulse"
          : solid
            ? "bg-[var(--phosphor)]"
            : "bg-[rgba(236,228,210,0.35)]"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function Caret() {
  return (
    <span
      className="inline-block h-[1em] w-[0.55em] translate-y-[2px] animate-pulse bg-[var(--accent)] opacity-80"
      aria-hidden
    />
  );
}

function shortRunId(id: string): string {
  const parts = id.split("_").filter(Boolean);
  const tail = parts[parts.length - 1] ?? id;
  return tail.slice(0, 12).toUpperCase();
}

// Format offset = event time − first event's time (both ISO strings).
// Falls back gracefully for numeric / bracket-format inputs.
function formatOffsetFromBase(
  t: TraceEvent["t"],
  baseTimeMs: number | null,
): string {
  const ms = parseTimeMs(t);
  if (ms === null || baseTimeMs === null) {
    return formatTraceTFallback(t);
  }
  const offsetS = Math.max(0, Math.floor((ms - baseTimeMs) / 1000));
  return secondsToClock(offsetS);
}

function parseTimeMs(t: TraceEvent["t"]): number | null {
  if (typeof t === "number") return t * 1000;
  if (typeof t === "string") {
    const parsed = Date.parse(t);
    if (!Number.isNaN(parsed)) return parsed;
    const asNum = Number(t);
    if (Number.isFinite(asNum)) return asNum * 1000;
  }
  return null;
}

function formatTraceTFallback(t: TraceEvent["t"]): string {
  if (typeof t === "number") return secondsToClock(t);
  if (typeof t === "string") {
    const bracket = /^\[?(\d{1,2}):(\d{2})\]?$/.exec(t.trim());
    if (bracket) return `${bracket[1].padStart(2, "0")}:${bracket[2]}`;
  }
  return "--:--";
}

function secondsToClock(s: number): string {
  const total = Math.max(0, Math.floor(s));
  const m = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
