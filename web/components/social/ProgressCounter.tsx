"use client";

interface Props {
  ok: number;
  total: number;
}

/**
 * "N of M snapshots live" chip. When N === M, flips to phosphor
 * and reads "M / M live" — a small moment of closure.
 */
export function ProgressCounter({ ok, total }: Props) {
  const done = ok >= total && total > 0;

  return (
    <div
      className="inline-flex items-center gap-2 border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{
        color: done ? "var(--phosphor)" : "var(--ink-soft)",
        borderColor: done ? "var(--phosphor)" : "var(--rule)",
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: done ? "var(--phosphor)" : "var(--accent)",
          boxShadow: done
            ? "0 0 8px var(--phosphor)"
            : "0 0 6px rgba(227,51,18,0.45)",
        }}
      />
      {done ? (
        <span>
          {total} / {total} live
        </span>
      ) : (
        <span>
          {ok} of {total} snapshots live
        </span>
      )}
    </div>
  );
}
