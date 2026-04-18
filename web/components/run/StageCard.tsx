"use client";

import type { StageMeta } from "@/lib/types";

export type StageStatus = "pending" | "running" | "done" | "error";

export interface StageCardProps {
  stage: StageMeta;
  status: StageStatus;
  summary?: string | null;
  errorMessage?: string | null;
  kalibrModel?: string | null;
  annotations?: string[];
}

// Single pipeline-stage readout card. Paper/ink vocabulary: bordered card,
// ink header strip, mono labels, 1-line summary pulled from the stage's `ok`
// trace message once done. Running state pulses. Error state shows red.
export default function StageCard({
  stage,
  status,
  summary,
  errorMessage,
  kalibrModel,
  annotations,
}: StageCardProps) {
  const statusLabel =
    status === "done"
      ? "COMPLETE"
      : status === "running"
        ? "RUNNING"
        : status === "error"
          ? "ERROR"
          : "PENDING";

  const borderClass =
    status === "pending"
      ? "border-dashed border-[var(--rule-soft)]"
      : status === "error"
        ? "border-[var(--accent)]"
        : status === "running"
          ? "border-[var(--rule)]"
          : "border-[var(--rule)]";

  const headerStatusColor =
    status === "done"
      ? "text-[var(--phosphor)]"
      : status === "running"
        ? "text-[var(--accent)]"
        : status === "error"
          ? "text-[var(--accent)]"
          : "text-[rgba(236,228,210,0.55)]";

  const headerDotClass =
    status === "done"
      ? "bg-[var(--phosphor)]"
      : status === "running"
        ? "bg-[var(--accent)] animate-pulse"
        : status === "error"
          ? "bg-[var(--accent)]"
          : "bg-[rgba(236,228,210,0.35)]";

  const cardOpacity = status === "pending" ? "opacity-60" : "opacity-100";
  const runningPulse = status === "running" ? "shadow-[0_0_0_1px_var(--accent)]" : "";

  const bottomBarClass =
    status === "done"
      ? "bg-[var(--phosphor)]"
      : status === "running"
        ? "bg-[var(--accent)]"
        : status === "error"
          ? "bg-[var(--accent)]"
          : "bg-[var(--rule-soft)]";

  return (
    <article
      className={`relative border bg-[rgba(255,252,244,0.55)] transition-opacity ${borderClass} ${cardOpacity} ${runningPulse}`}
      data-status={status}
    >
      {/* Ink header strip — stage number · agent · status */}
      <header className="flex items-center justify-between gap-3 bg-[var(--ink)] px-3.5 py-2.5 text-[var(--paper)]">
        <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase">
          <span className="text-[var(--paper)]">{stage.num}</span>
          <span className="text-[rgba(236,228,210,0.5)]">·</span>
          <span className="text-[rgba(236,228,210,0.75)]">{stage.agent}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${headerDotClass}`} aria-hidden />
          <span className={`font-mono text-[10px] tracking-[0.2em] ${headerStatusColor}`}>
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
          {status === "pending" && (
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
              awaiting upstream · {stage.agent}
            </p>
          )}
          {status === "running" && (
            <div className="flex items-center gap-2">
              <RunningTicker />
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                {stage.agent} working…
              </p>
            </div>
          )}
          {status === "done" && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 font-mono text-[12px] text-[var(--phosphor)]" aria-hidden>
                ✓
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--phosphor)]">
                {summary ?? "stage complete"}
              </p>
            </div>
          )}
          {status === "error" && (
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]">
              {errorMessage ?? "stage failed"}
            </p>
          )}
        </div>

        {annotations && annotations.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-[var(--rule-soft)] pt-2">
            {annotations.map((note, i) => (
              <li
                key={i}
                className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]"
              >
                · {note}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sponsor footer with model-attribution badge */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--rule-soft)] px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
          {stage.sponsor}
        </span>
        {kalibrModel && (
          <span className="rounded-sm border border-[var(--rule)] bg-[var(--paper-deep)] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            via {kalibrModel}
          </span>
        )}
      </div>

      <div className={`h-px ${bottomBarClass}`} />
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
