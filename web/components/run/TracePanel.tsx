"use client";

import { useEffect, useRef } from "react";
import type { TraceEvent, TraceKind } from "@/lib/types";

export interface TracePanelProps {
  events: TraceEvent[];           // events already revealed, in chronological order
  elapsedMs: number;               // wall-clock elapsed for header clock
  runId: string;
  isRunning: boolean;
  kalibrReroutes?: number;
  kalibrRecovered?: number;
  confidence?: number;             // current displayed confidence (ticks during run)
  targetConfidence?: number;       // final confidence once the run completes
}

// The left-60% of the page is stage cards. The right-40% is this: the same
// visual vocabulary as the hero .readout (ink-header, mono-body, phosphor
// highlights, accent labels) scaled up to fill a column and stream live.
export default function TracePanel({
  events,
  elapsedMs,
  runId,
  isRunning,
  kalibrReroutes = 0,
  kalibrRecovered = 0,
  confidence,
  targetConfidence,
}: TracePanelProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // Track whether the user has scrolled up. If they have, we stop auto-scrolling.
  const pinnedToBottomRef = useRef(true);

  // Auto-scroll to latest line when new events append, unless user scrolled up.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (!pinnedToBottomRef.current) return;
    // rAF so the DOM has painted the new line before we measure.
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [events.length]);

  // Observe scroll: if user is within ~24px of bottom, stay pinned. Otherwise, unpin.
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

  const clock = formatClock(elapsedMs);

  return (
    <section
      className="flex flex-col border border-[var(--rule)] bg-[rgba(255,252,244,0.5)]"
      aria-label="Live trace readout"
    >
      {/* Header strip — same pattern as .readout-header */}
      <header className="flex items-center justify-between gap-3 border-b border-[var(--rule)] bg-[var(--ink)] px-4 py-2.5 text-[var(--paper)]">
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase">
          SIM_RUN / {shortRunId(runId)}
        </span>
        <div className="flex items-center gap-1.5" aria-hidden>
          <Dot on={isRunning} delay={0} />
          <Dot on={isRunning} delay={160} />
          <Dot on={isRunning || !isRunning} delay={320} solid={!isRunning} />
        </div>
      </header>

      {/* Sub-header: elapsed clock + kalibr counts */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--rule-soft)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        <span>ELAPSED · {clock}</span>
        <span>
          KALIBR · {kalibrReroutes} REROUTES · {kalibrRecovered} RECOVERED
        </span>
      </div>

      {/* Body: stream of lines */}
      <div
        ref={bodyRef}
        className="relative flex-1 overflow-y-auto px-3.5 py-4 font-mono text-[11.5px] leading-[1.9] text-[var(--ink-soft)]"
        style={{ minHeight: 420, maxHeight: "calc(100vh - 240px)" }}
        aria-live="polite"
      >
        {events.length === 0 && (
          <p className="text-[var(--muted)] italic">
            waiting for orchestrator handshake…
          </p>
        )}
        {events.map((ev, i) => (
          <TraceLine key={i} ev={ev} />
        ))}
        {isRunning && <Caret />}
      </div>

      {/* Footer: runtime + confidence tick */}
      <footer className="flex items-center justify-between gap-3 border-t border-[var(--rule)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        <span>
          runtime · {clock}
          {targetConfidence !== undefined && !isRunning ? " · complete" : ""}
        </span>
        <span>
          confidence ·{" "}
          <span className="text-[var(--ink)]">
            {(confidence ?? 0).toFixed(3)}
          </span>
        </span>
      </footer>
    </section>
  );
}

function TraceLine({ ev }: { ev: TraceEvent }) {
  const kindClass = kindColor(ev.kind);
  const tLabel = formatTraceT(ev.t);
  return (
    <div className="block whitespace-pre-wrap break-words">
      <span className="text-[var(--muted)]">[{tLabel}]</span>{" "}
      <span className="text-[var(--accent)] uppercase">{ev.agent}</span>
      <span className="text-[var(--muted)]"> · </span>
      <span className={kindClass}>{ev.message}</span>
    </div>
  );
}

function kindColor(kind: TraceKind): string {
  switch (kind) {
    case "ok":
      return "text-[var(--phosphor)]";
    case "warn":
      return "text-[#b26a00]"; // amber-ish, readable on paper
    case "error":
      return "text-[var(--accent-ink)]";
    case "info":
    default:
      return "text-[var(--ink-soft)]";
  }
}

function Dot({ on, delay, solid }: { on: boolean; delay: number; solid?: boolean }) {
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
      className="inline-block h-[1em] w-[0.55em] translate-y-[2px] bg-[var(--accent)] opacity-80 animate-pulse"
      aria-hidden
    />
  );
}

function shortRunId(id: string): string {
  // run_2026-04-18_demo-linear-001  →  004-A-ish readability
  const parts = id.split("_").filter(Boolean);
  return parts[parts.length - 1]?.toUpperCase() ?? id.toUpperCase();
}

// Accepts either a number (seconds offset), a "[mm:ss]"-style offset string,
// or an ISO datetime. Returns "mm:ss".
function formatTraceT(t: TraceEvent["t"]): string {
  if (typeof t === "number") return secondsToClock(t);
  if (typeof t === "string") {
    const bracket = /^\[?(\d{1,2}):(\d{2})\]?$/.exec(t.trim());
    if (bracket) {
      return `${bracket[1].padStart(2, "0")}:${bracket[2]}`;
    }
    const asNum = Number(t);
    if (Number.isFinite(asNum)) return secondsToClock(asNum);
    const parsed = Date.parse(t);
    if (!Number.isNaN(parsed)) {
      // ISO — caller is expected to pre-normalize to offsets for display, but
      // as a fallback show the UTC wall clock mm:ss.
      const d = new Date(parsed);
      return `${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
    }
  }
  return "--:--";
}

function secondsToClock(s: number): string {
  const total = Math.max(0, Math.floor(s));
  const m = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function formatClock(ms: number): string {
  return secondsToClock(ms / 1000);
}
