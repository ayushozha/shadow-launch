"use client";

// Two-week / four-week toggle. Visual state only — the grid consumer decides
// how to clamp its rendered rows.

export type WeekRange = 2 | 4;

export default function WeekRangeToggle({
  value,
  onChange,
}: {
  value: WeekRange;
  onChange: (v: WeekRange) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Calendar range"
      className="inline-flex items-center gap-0 border border-[var(--rule)] bg-[var(--paper)] font-mono text-[10px] uppercase tracking-[0.16em]"
    >
      {([2, 4] as WeekRange[]).map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt)}
            className={[
              "px-3 py-1.5 transition-colors",
              active
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]",
            ].join(" ")}
          >
            {opt} weeks
          </button>
        );
      })}
    </div>
  );
}
