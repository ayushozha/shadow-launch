"use client";

import Link from "next/link";

import type { Competitor } from "@/lib/types";

interface Props {
  competitor: Competitor;
  runId: string;
  index: number;
  hovered: boolean;
  onHover: (id: string | null) => void;
}

/**
 * Competitor card in the grid below the map.
 *
 * Two signals layered on the card:
 *   - `selected=false` competitors are dimmed (discovered but not plotted).
 *   - `hovered` (via the shared hoverId state) pulses the card's border
 *     when the user hovers the map point, per the spec.
 *
 * Entire card is a link to /run/{runId}/competitor/{competitor_id}.
 */
export function CompetitorCard({
  competitor,
  runId,
  index,
  hovered,
  onHover,
}: Props) {
  const href = `/run/${encodeURIComponent(runId)}/competitor/${encodeURIComponent(competitor.competitor_id)}`;
  const dimmed = !competitor.selected;

  return (
    <Link
      href={href}
      onMouseEnter={() => onHover(competitor.competitor_id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(competitor.competitor_id)}
      onBlur={() => onHover(null)}
      className="competitor-card group flex flex-col gap-3 border bg-[rgba(255,252,244,0.5)] p-4 transition-[border-color,box-shadow] duration-200"
      style={{
        ["--delay" as string]: `${index * 80}ms`,
        ["--final-opacity" as string]: dimmed ? "0.45" : "1",
        borderColor: hovered ? "var(--ink)" : "var(--rule)",
        boxShadow: hovered ? "0 0 0 1px var(--ink)" : "none",
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3
          className="font-serif leading-tight text-[var(--ink)]"
          style={{ fontSize: "18px" }}
        >
          {competitor.name}
        </h3>
        <span
          className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] whitespace-nowrap"
          title="relevance score"
        >
          r {competitor.relevance_score.toFixed(2)}
        </span>
      </div>

      <p className="font-mono text-[10px] tracking-[0.04em] text-[var(--muted)] truncate">
        {stripHost(competitor.url)}
      </p>

      <p
        className="font-serif italic text-[14px] leading-[1.45] text-[var(--ink-soft)]"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {competitor.positioning || "—"}
      </p>

      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
          {competitor.discovery_source.replace("_", " ")}
          {!competitor.selected && " · not plotted"}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
          open →
        </span>
      </div>

      <style>{`
        .competitor-card {
          opacity: 0;
          transform: translateY(4px);
          animation: competitor-card-in 320ms cubic-bezier(0.2, 0.7, 0.2, 1)
            var(--delay, 0ms) forwards;
        }
        @keyframes competitor-card-in {
          to {
            opacity: var(--final-opacity, 1);
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .competitor-card {
            animation: none;
            opacity: var(--final-opacity, 1);
            transform: none;
          }
        }
      `}</style>
    </Link>
  );
}

function stripHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}
