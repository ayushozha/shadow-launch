"use client";

import Link from "next/link";

import type { Competitor } from "@/lib/types";

interface Props {
  runId: string;
  competitorIds: string[];
  competitors: Competitor[];
}

/**
 * Evidence list for a GTM angle. Maps `angle.evidence_competitor_ids` to
 * named competitors, linking each to its drilldown page. Graceful
 * fallback when the angle grounds in category-level reasoning only.
 */
export function EvidenceTrail({ runId, competitorIds, competitors }: Props) {
  const byId = new Map(competitors.map((c) => [c.competitor_id, c]));
  const resolved = competitorIds
    .map((id) => byId.get(id))
    .filter((c): c is Competitor => !!c);

  if (resolved.length === 0) {
    return (
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Evidence
        </p>
        <p className="mt-1.5 font-serif text-[14px] italic leading-snug text-[var(--ink-soft)]">
          Grounded in category gap analysis.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Evidence
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {resolved.map((c) => (
          <li key={c.competitor_id} className="flex items-baseline gap-2">
            <span
              aria-hidden
              className="font-mono text-[10px] text-[var(--muted)]"
            >
              →
            </span>
            <Link
              href={`/run/${encodeURIComponent(runId)}/competitor/${encodeURIComponent(c.competitor_id)}`}
              className="font-serif text-[14px] leading-snug text-[var(--ink)] underline decoration-[var(--rule)] decoration-1 underline-offset-[3px] transition-colors hover:decoration-[var(--accent)] hover:text-[var(--accent-ink)]"
            >
              {c.name}
            </Link>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
              · {c.positioning.slice(0, 64)}
              {c.positioning.length > 64 ? "…" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
