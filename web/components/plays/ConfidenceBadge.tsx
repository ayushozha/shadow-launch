"use client";

interface Props {
  /** Consensus score in [-1, 1]. */
  score: number | null;
}

/**
 * Mono confidence badge for a GTM angle. Reads `verdict.consensus_score`
 * and renders it as a signed 2-decimal value with a soft ink border.
 * Phosphor when positive, accent when negative, muted when absent.
 */
export function ConfidenceBadge({ score }: Props) {
  if (score == null) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        conf · —
      </span>
    );
  }

  const color =
    score > 0.05
      ? "var(--phosphor)"
      : score < -0.05
        ? "var(--accent)"
        : "var(--muted)";

  return (
    <span
      className="inline-flex items-baseline gap-1 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]"
      style={{ color, borderColor: color }}
    >
      <span className="text-[var(--muted)]">conf</span>
      <span>
        {score >= 0 ? "+" : ""}
        {score.toFixed(2)}
      </span>
    </span>
  );
}
