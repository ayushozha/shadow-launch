"use client";

import { useMemo, useState } from "react";

import type { Campaign, CampaignAngle, ImageAsset, Run } from "@/lib/types";

import { AdCard } from "./AdCard";
import { AdDetailOverlay } from "./AdDetailOverlay";

interface Props {
  runId: string;
  campaign: Campaign;
  /** Optional full Run — used to best-effort probe for inline ImageAsset metadata. */
  run?: Run | null;
}

interface GridItem {
  assetId: string;
  angle: CampaignAngle;
}

/**
 * Build a flat list of (assetId, owning angle) tuples from the campaign.
 * Also best-effort probe the Run response for any inline ImageAsset metadata
 * — the backend doesn't always serialize full records, so we handle both.
 */
function extractAssets(campaign: Campaign): GridItem[] {
  const items: GridItem[] = [];
  for (const angle of campaign.angles ?? []) {
    for (const assetId of angle.asset_ids ?? []) {
      items.push({ assetId, angle });
    }
  }
  return items;
}

function extractAssetMetaMap(run?: Run | null): Map<string, ImageAsset> {
  const map = new Map<string, ImageAsset>();
  if (!run) return map;
  // Loose probe: the Run type doesn't declare an assets field, but the backend
  // may attach one. Treat as unknown and narrow.
  const loose = run as unknown as Record<string, unknown>;
  const candidates: unknown[] = [];
  if (Array.isArray(loose.assets)) candidates.push(...(loose.assets as unknown[]));
  if (Array.isArray(loose.image_assets))
    candidates.push(...(loose.image_assets as unknown[]));

  for (const raw of candidates) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Partial<ImageAsset>;
    if (typeof a.asset_id === "string") {
      map.set(a.asset_id, a as ImageAsset);
    }
  }
  return map;
}

/**
 * Stage 6 · Creative workspace.
 *
 * Responsive grid: 4 columns desktop, 2 tablet, 1 mobile. Each cell is an
 * AdCard — channel tag, asset image, short caption. Clicking opens the
 * detail overlay with full-size image and angle context.
 */
export function CreativeGrid({ runId, campaign, run }: Props) {
  const items = useMemo(() => extractAssets(campaign), [campaign]);
  const metaMap = useMemo(() => extractAssetMetaMap(run), [run]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (items.length === 0) {
    return <CreativeSkeleton />;
  }

  const active = activeIdx !== null ? items[activeIdx] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          {items.length} asset{items.length === 1 ? "" : "s"} generated across{" "}
          {campaign.angles?.length ?? 0} angle
          {(campaign.angles?.length ?? 0) === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, idx) => (
          <AdCard
            key={`${item.angle.angle_id}-${item.assetId}`}
            runId={runId}
            assetId={item.assetId}
            angle={item.angle}
            assetMeta={metaMap.get(item.assetId) ?? null}
            onOpen={() => setActiveIdx(idx)}
          />
        ))}
      </div>

      {active && (
        <AdDetailOverlay
          runId={runId}
          assetId={active.assetId}
          angle={active.angle}
          assetMeta={metaMap.get(active.assetId) ?? null}
          onClose={() => setActiveIdx(null)}
        />
      )}
    </div>
  );
}

/**
 * Empty / generating state. Mono status line + up to 9 paper-tinted
 * skeleton tiles (3 angles × 3 images), subtle pulse.
 */
export function CreativeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Images generating… this takes 1–2 min per asset.
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="h-[12px] w-16 animate-pulse bg-[rgba(225,216,195,0.7)]" />
            <div
              className="aspect-square w-full animate-pulse border border-[var(--rule)] bg-[var(--paper-deep)]"
              style={{ animationDelay: `${i * 90}ms` }}
            />
            <div className="h-[12px] w-4/5 animate-pulse bg-[rgba(225,216,195,0.7)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
