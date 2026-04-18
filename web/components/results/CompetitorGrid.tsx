import Link from "next/link";
import type { Competitor } from "@/lib/types";

// Section 3 — Competitor grid. Shows the 5 selected competitors as cards;
// each clickable → /run/{run_id}/competitor/{competitor_id}.

export default function CompetitorGrid({
  runId,
  competitors,
}: {
  runId: string;
  competitors: Competitor[];
}) {
  const selected = competitors.filter((c) => c.selected);
  // Fall back to top-5 by relevance if nothing was flagged selected.
  const list =
    selected.length > 0
      ? selected
      : [...competitors].sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 5);

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §03 · Competitors · {list.length}
          </span>
          <span className="font-serif text-[13px] italic text-[var(--muted)]">
            the names the market compares you against
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {list.map((c, i) => (
            <Link
              key={c.competitor_id}
              href={`/run/${runId}/competitor/${c.competitor_id}`}
              className="group flex flex-col gap-4 border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] p-5 transition-colors hover:border-[var(--ink)] hover:bg-[rgba(255,252,244,0.9)]"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {c.discovery_source.replace("_", " ")}
                </span>
              </div>
              <h3
                className="font-serif text-[24px] leading-[1.1] tracking-[-0.01em] text-[var(--ink)] group-hover:text-[var(--accent)]"
                style={{ fontVariationSettings: '"opsz" 48, "wght" 450' }}
              >
                {c.name}
              </h3>
              <p className="min-h-[64px] font-serif text-[14px] leading-[1.5] text-[var(--ink-soft)] line-clamp-4">
                {c.positioning}
              </p>
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Relevance
                  </span>
                  <span className="font-mono text-[10px] text-[var(--ink)]">
                    {(c.relevance_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-[3px] w-full bg-[var(--rule-soft)]">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{
                      width: `${Math.min(100, Math.max(0, c.relevance_score * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] group-hover:text-[var(--accent)]">
                view detail →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
