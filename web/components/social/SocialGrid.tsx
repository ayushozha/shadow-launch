"use client";

import { useMemo, useState } from "react";

import type { Competitor, Platform, SocialSnapshot } from "@/lib/types";

import { PatternCallout } from "./PatternCallout";
import { ProgressCounter } from "./ProgressCounter";
import { SocialCell } from "./SocialCell";
import { TopPostsModal } from "./TopPostsModal";

const PLATFORM_ORDER: Platform[] = [
  "linkedin",
  "twitter",
  "facebook",
  "instagram",
  "tiktok",
];

const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

const MAX_ROWS = 7;
const STAGGER_MS = 60;
const TOTAL_CELLS = 25;

interface Props {
  snapshots: SocialSnapshot[];
  competitors: Competitor[];
}

interface Selection {
  competitor: Competitor;
  platform: Platform;
}

export function SocialGrid({ snapshots, competitors }: Props) {
  // Select up to MAX_ROWS competitors — selected=true preferred, then by
  // relevance score, then original order.
  const rows = useMemo<Competitor[]>(() => {
    const selected = competitors.filter((c) => c.selected);
    const pool = selected.length > 0 ? selected : competitors;
    return pool.slice(0, MAX_ROWS);
  }, [competitors]);

  // Index snapshots by (competitor_id, platform) for O(1) lookup.
  const snapshotIndex = useMemo(() => {
    const map = new Map<string, SocialSnapshot>();
    for (const s of snapshots) {
      map.set(`${s.competitor_id}::${s.platform}`, s);
    }
    return map;
  }, [snapshots]);

  const okCount = useMemo(
    () => snapshots.filter((s) => s.status === "ok").length,
    [snapshots],
  );

  const [selection, setSelection] = useState<Selection | null>(null);

  const selectedSnapshot = selection
    ? snapshotIndex.get(
        `${selection.competitor.competitor_id}::${selection.platform}`,
      ) ?? null
    : null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-serif text-[15px] text-[var(--muted)]">
          25 Apify actors running in parallel. Heat is engagement rate; numerals are
          followers.
        </p>
        <ProgressCounter ok={okCount} total={TOTAL_CELLS} />
      </div>

      <div className="border border-[var(--rule)] bg-[rgba(255,252,244,0.35)] p-4">
        {/* Column header row */}
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `minmax(120px, 1fr) repeat(${PLATFORM_ORDER.length}, minmax(0, 1fr))`,
          }}
        >
          <div />
          {PLATFORM_ORDER.map((p) => (
            <div
              key={p}
              className="pb-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]"
            >
              {PLATFORM_LABELS[p]}
            </div>
          ))}

          {rows.map((comp, rowIdx) => (
            <FragmentRow
              key={comp.competitor_id}
              competitor={comp}
              rowIdx={rowIdx}
              snapshotIndex={snapshotIndex}
              onOpen={(platform) => setSelection({ competitor: comp, platform })}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[var(--rule-soft)] pt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
          <span>▪ followers (top)</span>
          <span>● engagement rate (bottom)</span>
          <span className="text-[var(--phosphor)]">● &gt; 5% phosphor</span>
          <span className="text-[var(--accent)]">● 1–5% accent</span>
          <span>● &lt; 1% muted</span>
        </div>
      </div>

      <PatternCallout snapshots={snapshots} competitors={competitors} />

      {selection && (
        <TopPostsModal
          competitor={selection.competitor}
          platform={selection.platform}
          snapshot={selectedSnapshot}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}

/**
 * Renders a single row inline inside the parent grid (label + 5 cells).
 * Using a Fragment keeps the CSS grid contiguous so columns align.
 */
function FragmentRow({
  competitor,
  rowIdx,
  snapshotIndex,
  onOpen,
}: {
  competitor: Competitor;
  rowIdx: number;
  snapshotIndex: Map<string, SocialSnapshot>;
  onOpen: (platform: Platform) => void;
}) {
  return (
    <>
      <div className="flex min-w-0 items-center border-t border-[var(--rule-soft)] py-2 pr-3">
        <span className="truncate font-serif text-[15px] text-[var(--ink)]">
          {competitor.name}
        </span>
      </div>
      {PLATFORM_ORDER.map((platform, colIdx) => {
        const snap = snapshotIndex.get(
          `${competitor.competitor_id}::${platform}`,
        );
        const cellIdx = rowIdx * PLATFORM_ORDER.length + colIdx;
        return (
          <div
            key={`${competitor.competitor_id}-${platform}`}
            className="border-t border-[var(--rule-soft)] pt-2"
          >
            <SocialCell
              snapshot={snap ?? null}
              delayMs={cellIdx * STAGGER_MS}
              onOpen={() => onOpen(platform)}
            />
          </div>
        );
      })}
    </>
  );
}
