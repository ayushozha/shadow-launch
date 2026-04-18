"use client";

import { useMemo, useState } from "react";

import type { Competitor } from "@/lib/types";

import { CompetitorCard } from "./CompetitorCard";
import { PositioningMap } from "./PositioningMap";

interface Props {
  runId: string;
  competitors: Competitor[];
  productName: string;
}

/**
 * Stage 3 workspace: positioning map above a responsive grid of competitor
 * cards. Hover on either side links via a shared `hoverId` state.
 *
 * Map shows only `selected=true` competitors (per spec). Grid shows every
 * discovered competitor; the non-selected ones render dimmed.
 */
export function CompetitiveMap({ runId, competitors, productName }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const { plotted, all } = useMemo(() => {
    const selected = competitors.filter((c) => c.selected);
    // Stable sort by relevance desc for a readable grid order.
    const sorted = [...competitors].sort(
      (a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0),
    );
    return { plotted: selected, all: sorted };
  }, [competitors]);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--rule-soft)] pb-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink)]">
            Positioning map
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {plotted.length} plotted · {all.length} discovered
          </span>
        </div>

        <PositioningMap
          competitors={plotted}
          productName={productName}
          hoverId={hoverId}
          onHover={setHoverId}
        />

        <p className="font-serif text-[13px] italic text-[var(--muted)]">
          Axes are derived from what we scraped — positioning length as a proxy
          for specialist focus, relevance score as a crude fast/modern axis.
          Click-to-re-axis is coming.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--rule-soft)] pb-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink)]">
            Competitors
          </h2>
          <span className="font-serif text-[13px] italic text-[var(--muted)]">
            dimmed = discovered but not plotted
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {all.map((c, i) => (
            <CompetitorCard
              key={c.competitor_id}
              competitor={c}
              runId={runId}
              index={i}
              hovered={hoverId === c.competitor_id}
              onHover={setHoverId}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Loading skeleton — same rough shape as <CompetitiveMap> so the layout
 * doesn't jump when real data lands.
 */
export function MapSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-10 opacity-60">
      <div className="flex flex-col gap-3">
        <div className="h-3 w-40 bg-[var(--rule)]" />
        <div className="h-[440px] w-full border border-[var(--rule)] bg-[rgba(255,252,244,0.35)]" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-3 w-32 bg-[var(--rule)]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex h-[170px] flex-col gap-3 border border-[var(--rule)] bg-[rgba(255,252,244,0.4)] p-4"
            >
              <div className="h-4 w-2/3 bg-[var(--rule)]" />
              <div className="h-2 w-1/2 bg-[var(--rule-soft)]" />
              <div className="h-2 w-full bg-[var(--rule-soft)]" />
              <div className="h-2 w-5/6 bg-[var(--rule-soft)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
