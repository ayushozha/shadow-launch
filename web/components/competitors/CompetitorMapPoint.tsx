"use client";

import type { Competitor } from "@/lib/types";

interface Props {
  competitor: Competitor;
  x: number; // 0..1
  y: number; // 0..1
  hovered: boolean;
  index: number;
  onHover: (id: string | null) => void;
}

/**
 * A single competitor dot + label on the positioning map.
 * Coordinates are pre-computed 0..1 and mapped to the SVG viewBox by the
 * parent (<PositioningMap>).
 *
 * Animation: fade+rise in with a staggered delay driven by `index`. The
 * stagger is 80ms as called out by the stage spec so points land one
 * after another rather than all at once.
 */
export function CompetitorMapPoint({
  competitor,
  x,
  y,
  hovered,
  index,
  onHover,
}: Props) {
  // Map 0..1 into the padded plot area (5..95 on both axes in viewBox).
  const cx = 5 + x * 90;
  const cy = 5 + (1 - y) * 90; // invert Y so higher = up

  return (
    <g
      className="competitor-point"
      style={{
        // Using inline CSS vars so the keyframes can pick up the delay.
        ["--delay" as string]: `${index * 80}ms`,
      }}
      onMouseEnter={() => onHover(competitor.competitor_id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(competitor.competitor_id)}
      onBlur={() => onHover(null)}
      tabIndex={0}
      aria-label={competitor.name}
    >
      <circle
        cx={cx}
        cy={cy}
        r={hovered ? 1.6 : 1.1}
        fill="var(--ink)"
        stroke="var(--paper)"
        strokeWidth={0.4}
        style={{
          transition: "r 160ms ease-out",
          cursor: "pointer",
        }}
      />
      {hovered && (
        <circle
          cx={cx}
          cy={cy}
          r={2.6}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={0.3}
          opacity={0.4}
        />
      )}
      <text
        x={cx + 2}
        y={cy + 0.6}
        fontSize={2.2}
        fill="var(--ink-soft)"
        style={{
          fontFamily: "var(--font-fraunces), Georgia, serif",
          fontStyle: "italic",
          pointerEvents: "none",
          opacity: hovered ? 1 : 0.78,
          transition: "opacity 160ms ease-out",
        }}
      >
        {competitor.name}
      </text>
    </g>
  );
}
