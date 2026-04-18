"use client";

export interface CostTickerProps {
  costUsd: number;
  reroutes: number;
  imageGens: number;
}

// Live cost readout: "$0.12 · 3 reroutes · 8 images". Small-caps mono,
// aligned right in the page meta bar. Value in ink, labels in muted.
export default function CostTicker({
  costUsd,
  reroutes,
  imageGens,
}: CostTickerProps) {
  return (
    <div
      className="flex items-center gap-2 border border-[var(--rule)] bg-[var(--paper-deep)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em]"
      aria-label="Kalibr cost ticker"
      title="Cumulative Kalibr spend · reroutes · images generated"
    >
      <span className="text-[var(--muted)]">KALIBR</span>
      <span className="text-[var(--ink)]">${costUsd.toFixed(2)}</span>
      <span className="text-[var(--rule)]">·</span>
      <span className="text-[var(--ink-soft)]">{reroutes}</span>
      <span className="text-[var(--muted)]">reroutes</span>
      <span className="text-[var(--rule)]">·</span>
      <span className="text-[var(--ink-soft)]">{imageGens}</span>
      <span className="text-[var(--muted)]">images</span>
    </div>
  );
}
