"use client";

import { useState } from "react";
import type { Campaign, ImageAsset, Verdict } from "@/lib/types";
import { assetUrl, postFeedback } from "@/lib/api";

// Section 6 — Creative gallery. Grid of generated images across all angles.
// Each tile: image, model attribution badge, verdict dot, approve/reject.

type AssetTile = {
  asset: ImageAsset;
  angleHook: string;
  verdict?: Verdict;
};

export default function CreativeGallery({
  runId,
  campaign,
  assets,
  verdicts,
}: {
  runId: string;
  campaign: Campaign;
  assets: ImageAsset[];
  verdicts: Verdict[];
}) {
  const assetById = new Map(assets.map((a) => [a.asset_id, a]));
  const verdictByAssetId = new Map(
    verdicts.filter((v) => v.target_type === "asset").map((v) => [v.target_id, v]),
  );

  const tiles: AssetTile[] = [];
  for (const angle of campaign.angles) {
    for (const aid of angle.asset_ids) {
      const a = assetById.get(aid);
      if (!a) continue;
      tiles.push({
        asset: a,
        angleHook: angle.hook,
        verdict: verdictByAssetId.get(aid),
      });
    }
  }

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §06 · Creative gallery · {tiles.length}
          </span>
          <span className="font-serif text-[13px] italic text-[var(--muted)]">
            generated via OpenAI Images routed through Kalibr
          </span>
        </div>

        {tiles.length === 0 ? (
          <p className="font-serif text-[15px] italic text-[var(--muted)]">
            No creative assets generated yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tiles.map((t) => (
              <GalleryTile
                key={t.asset.asset_id}
                runId={runId}
                tile={t}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function GalleryTile({ runId, tile }: { runId: string; tile: AssetTile }) {
  const { asset, angleHook, verdict } = tile;
  const [feedback, setFeedback] = useState<
    "idle" | "approved" | "rejected" | "sending" | "error"
  >("idle");

  const dissent = verdict?.action_required ?? false;

  const submit = async (choice: "approved" | "rejected") => {
    setFeedback("sending");
    try {
      await postFeedback(runId, {
        target_type: "asset",
        target_id: asset.asset_id,
        verdict: choice,
      });
      setFeedback(choice);
    } catch {
      setFeedback("error");
    }
  };

  return (
    <div className="group flex flex-col border border-[var(--rule)] bg-[rgba(255,252,244,0.5)]">
      <div className="relative aspect-square w-full overflow-hidden border-b border-[var(--rule-soft)] bg-[var(--paper-deep)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.asset_url ?? assetUrl(runId, asset.asset_id)}
          alt={asset.prompt}
          className="h-full w-full object-cover"
        />
        {dissent && (
          <div
            className="absolute left-2 top-2 border border-[var(--accent)] bg-[var(--paper)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--accent)]"
            title={verdict?.why ?? "Persona dissent"}
          >
            ◆ dissent
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <p className="font-serif text-[13px] italic leading-[1.4] text-[var(--ink-soft)] line-clamp-2">
          &ldquo;{angleHook}&rdquo;
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
          made by {asset.model}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => submit("approved")}
            disabled={feedback === "sending"}
            className="flex-1 border border-[var(--rule)] bg-[rgba(255,252,244,0.6)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink)] transition-colors hover:border-[var(--phosphor)] hover:text-[var(--phosphor)] disabled:opacity-50"
          >
            {feedback === "approved" ? "approved ✓" : "approve"}
          </button>
          <button
            type="button"
            onClick={() => submit("rejected")}
            disabled={feedback === "sending"}
            className="flex-1 border border-[var(--rule)] bg-[rgba(255,252,244,0.6)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
          >
            {feedback === "rejected" ? "rejected ✕" : "reject"}
          </button>
        </div>
        {feedback === "error" && (
          <p className="font-mono text-[9px] text-[var(--accent)]">
            feedback failed — retry
          </p>
        )}
      </div>
    </div>
  );
}
