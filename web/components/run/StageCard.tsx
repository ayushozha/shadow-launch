"use client";

import type { StageMeta } from "@/lib/types";

export type StageStatus = "idle" | "running" | "done";

export interface StageCardProps {
  stage: StageMeta;
  status: StageStatus;
  summary?: string | null;
  detail?: string | null;
}

// One card per pipeline stage. Mirrors the paper/ink vocabulary from the
// landing readout: bordered card on paper-deep, ink header strip, mono labels,
// and a compact summary once the stage is done.
export default function StageCard({ stage, status, summary, detail }: StageCardProps) {
  const statusLabel =
    status === "done" ? "COMPLETE" : status === "running" ? "RUNNING" : "QUEUED";

  const statusColor =
    status === "done"
      ? "text-[var(--phosphor)]"
      : status === "running"
        ? "text-[var(--accent)]"
        : "text-[var(--muted)]";

  return (
    <article
      className="relative border border-[var(--rule)] bg-[rgba(255,252,244,0.55)]"
      data-status={status}
    >
      {/* Ink header strip, same treatment as .readout-header */}
      <header className="flex items-center justify-between gap-3 bg-[var(--ink)] px-3.5 py-2.5 text-[var(--paper)]">
        <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase">
          <span className="text-[var(--paper)]">{stage.num}</span>
          <span className="text-[rgba(236,228,210,0.5)]">·</span>
          <span className="text-[rgba(236,228,210,0.75)]">{stage.agent}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              status === "done"
                ? "bg-[var(--phosphor)]"
                : status === "running"
                  ? "bg-[var(--accent)] animate-pulse"
                  : "bg-[rgba(236,228,210,0.35)]"
            }`}
            aria-hidden
          />
          <span className={`font-mono text-[10px] tracking-[0.2em] ${status === "done" ? "text-[var(--phosphor)]" : status === "running" ? "text-[var(--accent)]" : "text-[rgba(236,228,210,0.55)]"}`}>
            {statusLabel}
          </span>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-2xl leading-tight text-[var(--ink)]">
            {stage.title}
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {stage.sponsor}
          </span>
        </div>

        <div className="mt-3 min-h-[44px]">
          {status === "idle" && (
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
              awaiting upstream · {stage.agent}
            </p>
          )}
          {status === "running" && (
            <div className="flex items-center gap-2">
              <RunningTicker />
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                {stage.agent} working · {stage.sponsor.toLowerCase()}
              </p>
            </div>
          )}
          {status === "done" && summary && (
            <div className="space-y-1.5">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--phosphor)]">
                {summary}
              </p>
              {detail && (
                <p className="font-serif text-[15px] leading-snug text-[var(--ink-soft)]">
                  {detail}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hair rule under the card, like the landing */}
      <div className={`h-px ${status === "done" ? "bg-[var(--phosphor)]" : status === "running" ? "bg-[var(--accent)]" : "bg-[var(--rule-soft)]"}`} />
    </article>
  );
}

function RunningTicker() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
      <span
        className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse"
        style={{ animationDelay: "240ms" }}
      />
    </span>
  );
}
