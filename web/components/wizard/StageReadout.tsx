"use client";

import { useEffect, useRef } from "react";

import type { TraceEvent } from "@/lib/types";

interface Props {
  /** The stage number (1–7); only events for this stage are shown. */
  stage?: number;
  events: TraceEvent[];
  connection: "connecting" | "open" | "retrying" | "closed";
  startTime?: string | null;
}

function formatOffset(iso: string, start: string | null): string {
  if (!start) return "";
  try {
    const dt = new Date(iso).getTime() - new Date(start).getTime();
    if (Number.isNaN(dt) || dt < 0) return "";
    const s = Math.floor(dt / 1000);
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `[${mm}:${ss}]`;
  } catch {
    return "";
  }
}

const KIND_COLORS: Record<string, string> = {
  info: "var(--ink-soft)",
  ok: "var(--phosphor)",
  warn: "#c98a3e",
  error: "var(--accent)",
  cost: "var(--muted)",
};

export function StageReadout({ stage, events, connection, startTime }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  const filtered = stage
    ? events.filter((e) => e.stage === stage || e.agent === "kalibr" || e.agent === "apify")
    : events;

  useEffect(() => {
    const el = logRef.current;
    if (!el || !pinnedRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered.length]);

  function onScroll() {
    const el = logRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    pinnedRef.current = atBottom;
  }

  return (
    <div className="flex h-full min-h-[200px] flex-col border border-[var(--rule)] bg-[rgba(255,252,244,0.5)]">
      <header className="flex items-center justify-between border-b border-[var(--rule)] bg-[var(--ink)] px-3 py-2 text-[var(--paper)]">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
          Stage readout
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] opacity-80">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background:
                connection === "open"
                  ? "var(--phosphor)"
                  : connection === "retrying"
                    ? "#c98a3e"
                    : connection === "closed"
                      ? "var(--muted)"
                      : "var(--rule)",
            }}
          />
          {connection}
        </span>
      </header>

      <div
        ref={logRef}
        onScroll={onScroll}
        className="flex-1 space-y-0.5 overflow-auto px-3 py-3 font-mono text-[10.5px] leading-[1.7]"
      >
        {filtered.length === 0 ? (
          <div className="text-[var(--muted)]">waiting for events…</div>
        ) : (
          filtered.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 text-[var(--muted)]">
                {formatOffset(e.t, startTime ?? filtered[0].t)}
              </span>
              <span className="shrink-0 text-[var(--accent)]">{e.agent}</span>
              <span
                className="min-w-0 truncate"
                style={{ color: KIND_COLORS[e.kind] ?? KIND_COLORS.info }}
                title={e.message}
              >
                {e.message}
                {e.kalibr_model && (
                  <span className="ml-2 text-[var(--muted)]">
                    · {e.kalibr_model}
                    {e.kalibr_cost_delta_usd
                      ? ` · $${e.kalibr_cost_delta_usd.toFixed(3)}`
                      : ""}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
