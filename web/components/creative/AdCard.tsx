"use client";

import { useState } from "react";

import { assetUrl } from "@/lib/api";
import type { CampaignAngle, Channel, ImageAsset } from "@/lib/types";

import { PromptPreview } from "./PromptPreview";

const CHANNEL_LABELS: Record<Channel, string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  blog: "Blog",
  email: "Email",
  youtube: "YouTube",
};

interface Props {
  runId: string;
  assetId: string;
  angle: CampaignAngle;
  assetMeta?: ImageAsset | null;
  onOpen: () => void;
}

/**
 * One ad in the grid. Channel tag (Fraunces italic), square image well,
 * short caption (angle.hook). While the image loads the well shows the
 * prompt (or the hook, if no prompt metadata is available).
 */
export function AdCard({ runId, assetId, angle, assetMeta, onOpen }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const channel = angle.channel_mix?.[0];
  const channelLabel = channel ? CHANNEL_LABELS[channel] : "Creative";
  const previewText = assetMeta?.prompt ?? angle.hook;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group/ad flex flex-col gap-3 text-left"
    >
      <span
        className="font-serif text-[13px] italic leading-none tracking-[-0.01em] text-[var(--ink-soft)]"
        style={{ fontVariationSettings: '"opsz" 14, "wght" 420, "SOFT" 60' }}
      >
        {channelLabel}
      </span>

      <div className="relative aspect-square w-full overflow-hidden border border-[var(--rule)] bg-[var(--paper-deep)] transition-colors duration-150 group-hover/ad:border-[var(--accent)]">
        {!errored && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(runId, assetId)}
            alt={angle.hook}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out"
            style={{ opacity: loaded ? 1 : 0 }}
          />
        )}
        {!loaded && !errored && <PromptPreview text={previewText} />}
        {errored && (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              asset unavailable
            </span>
          </div>
        )}
      </div>

      <p className="line-clamp-2 font-serif text-[14px] italic leading-[1.4] text-[var(--ink)]">
        {angle.hook}
      </p>
    </button>
  );
}
