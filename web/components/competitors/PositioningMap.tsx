"use client";

import type { Competitor } from "@/lib/types";

import { CompetitorMapPoint } from "./CompetitorMapPoint";

interface Props {
  competitors: Competitor[]; // only selected ones
  productName: string;
  hoverId: string | null;
  onHover: (id: string | null) => void;
}

/**
 * 2D scatter plot of competitors, inline SVG.
 *
 * Axes (both flagged "derived"):
 *   X = Generalist → Specialist   (proxy: word-count of positioning, clamped)
 *   Y = Slow/Enterprise → Fast/Modern (proxy: relevance_score, clamped)
 *
 * Coordinate synthesis (see computeCoords). The result is deterministic:
 * calling with the same competitor yields the same (x, y) every render.
 */
export function PositioningMap({
  competitors,
  productName,
  hoverId,
  onHover,
}: Props) {
  // User anchor dot is pinned. Middle-right of the plot = a generalist-ish
  // fast/modern position. Placement is intentional: it's a stable visual
  // anchor that the spec calls out, not derived from scraped data.
  const userX = 0.62;
  const userY = 0.68;

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 100 100"
        className="h-[440px] w-full border border-[var(--rule)] bg-[rgba(255,252,244,0.35)]"
        role="img"
        aria-label="Positioning map of competitors"
      >
        {/* Axes — center cross. Dashed so they read as derived/provisional. */}
        <line
          x1={50}
          y1={5}
          x2={50}
          y2={95}
          stroke="var(--rule)"
          strokeWidth={0.3}
          strokeDasharray="1.2 1.2"
        />
        <line
          x1={5}
          y1={50}
          x2={95}
          y2={50}
          stroke="var(--rule)"
          strokeWidth={0.3}
          strokeDasharray="1.2 1.2"
        />

        {/* Axis labels — "derived — click to re-axis". Click isn't wired
            yet per spec. */}
        <AxisLabel x={5} y={99} anchor="start" label="Generalist" />
        <AxisLabel x={95} y={99} anchor="end" label="Specialist" />
        <AxisLabel x={1} y={8} anchor="start" label="Fast / Modern" rotate={false} />
        <AxisLabel x={1} y={96} anchor="start" label="Slow / Enterprise" rotate={false} />

        {/* Derived caption, top-center. */}
        <text
          x={50}
          y={3.5}
          textAnchor="middle"
          fontSize={1.8}
          fill="var(--muted)"
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          derived axes · click to re-axis
        </text>

        {/* Competitor points */}
        {competitors.map((c, i) => {
          const { x, y } = computeCoords(c);
          return (
            <CompetitorMapPoint
              key={c.competitor_id}
              competitor={c}
              x={x}
              y={y}
              hovered={hoverId === c.competitor_id}
              index={i}
              onHover={onHover}
            />
          );
        })}

        {/* YOU dot — accent red, drawn last so it sits on top. */}
        <g>
          <circle
            cx={5 + userX * 90}
            cy={5 + (1 - userY) * 90}
            r={3.4}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={0.4}
            opacity={0.45}
          />
          <circle
            cx={5 + userX * 90}
            cy={5 + (1 - userY) * 90}
            r={1.8}
            fill="var(--accent)"
            stroke="var(--paper)"
            strokeWidth={0.5}
          />
          <text
            x={5 + userX * 90 + 2.5}
            y={5 + (1 - userY) * 90 + 0.8}
            fontSize={2.6}
            fill="var(--accent)"
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            You · {productName.length > 18 ? productName.slice(0, 18) + "…" : productName}
          </text>
        </g>
      </svg>

      <style>{`
        .competitor-point {
          opacity: 0;
          transform: translateY(4px);
          animation: competitor-point-in 320ms cubic-bezier(0.2, 0.7, 0.2, 1)
            var(--delay, 0ms) forwards;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes competitor-point-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .competitor-point {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

function AxisLabel({
  x,
  y,
  label,
  anchor,
}: {
  x: number;
  y: number;
  label: string;
  anchor: "start" | "middle" | "end";
  rotate?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={2.1}
      fill="var(--muted)"
      style={{
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </text>
  );
}

/**
 * Deterministic 0..1 coordinates for a competitor.
 *
 * X (generalist → specialist): positioning word-count, softly clamped
 *   via a smooth squash so the plot never crowds at one edge. A longer,
 *   more specific positioning string drifts right (more "specialist").
 *
 * Y (slow/enterprise → fast/modern): relevance_score directly (it's
 *   already in 0..1), nudged by a small stable jitter derived from
 *   `name.length % 7` so two competitors with the same score don't
 *   sit on top of each other.
 *
 * Both outputs are clamped into [0.08, 0.92] to keep points inside the
 * visible plot and away from axis labels. The jitter is hash-based so
 * points DO NOT move between renders — this matters for the hover-pulse
 * interaction; we can't have dots drifting under the cursor.
 */
export function computeCoords(c: Competitor): { x: number; y: number } {
  const words = (c.positioning ?? "").trim().split(/\s+/).filter(Boolean).length;
  // 4 words → very generalist, 22+ words → very specialist.
  const rawX = (words - 4) / 18;
  const xBase = clamp01(rawX);

  const rawY = clamp01(c.relevance_score ?? 0);

  // Stable jitter: keyed off name.length (mod 7) per spec. Deterministic,
  // small amplitude, sign alternates so adjacent hashes spread apart.
  const h = (c.name ?? "").length % 7; // 0..6
  const jitterX = ((h - 3) / 3) * 0.06; // -0.06..+0.06
  const jitterY = (((h * 3) % 7) - 3) / 3 * 0.06;

  const x = clamp(xBase + jitterX, 0.08, 0.92);
  const y = clamp(rawY + jitterY, 0.08, 0.92);
  return { x, y };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return (lo + hi) / 2;
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
