import type { Verdict } from "@/lib/types";
import { PERSONA_LABELS } from "@/lib/types";

// Per-asset verdict list: green (full endorsement), yellow (mixed), red
// (action_required). Each row lists dissenting personas + why.

export default function VerdictList({ verdicts }: { verdicts: Verdict[] }) {
  if (verdicts.length === 0) return null;

  // Sort: action_required first, then by consensus_score asc
  const sorted = [...verdicts].sort((a, b) => {
    if (a.action_required !== b.action_required) return a.action_required ? -1 : 1;
    return a.consensus_score - b.consensus_score;
  });

  const redCount = sorted.filter((v) => v.action_required).length;
  const yellowCount = sorted.filter(
    (v) => !v.action_required && v.dissenting_personas.length > 0,
  ).length;
  const greenCount = sorted.length - redCount - yellowCount;

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §09 · Per-target verdicts · {verdicts.length}
          </span>
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.14em]">
            <span className="text-[var(--phosphor)]">● {greenCount} endorsed</span>
            <span className="text-[var(--ink)]">● {yellowCount} mixed</span>
            <span className="text-[var(--accent)]">● {redCount} action req.</span>
          </div>
        </div>

        <ul className="flex flex-col divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)]">
          {sorted.map((v) => {
            const status: "red" | "yellow" | "green" = v.action_required
              ? "red"
              : v.dissenting_personas.length > 0
                ? "yellow"
                : "green";
            const dotColor =
              status === "red"
                ? "var(--accent)"
                : status === "yellow"
                  ? "var(--ink)"
                  : "var(--phosphor)";
            return (
              <li
                key={v.verdict_id}
                className="grid grid-cols-[8px_1fr_minmax(0,auto)] gap-4 py-4"
              >
                <span
                  className="mt-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: dotColor }}
                />
                <div>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      {v.target_type}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--ink)]">
                      {v.target_id}
                    </span>
                  </div>
                  <p className="mt-1.5 font-serif text-[15px] leading-[1.55] text-[var(--ink-soft)]">
                    {v.why}
                  </p>
                  {v.dissenting_personas.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {v.dissenting_personas.map((p) => (
                        <span
                          key={p}
                          className="border border-[var(--accent)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--accent)]"
                        >
                          {PERSONA_LABELS[p]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="self-start font-serif text-[16px] italic text-[var(--ink)]">
                  {v.consensus_score >= 0 ? "+" : ""}
                  {v.consensus_score.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
