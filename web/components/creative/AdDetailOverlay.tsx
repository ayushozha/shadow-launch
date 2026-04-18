"use client";

import { useEffect, useState } from "react";

import { assetUrl } from "@/lib/api";
import type { CampaignAngle, Channel, ImageAsset } from "@/lib/types";

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
  onClose: () => void;
}

/**
 * Full-size modal for an ad. Backdrop-dimmed, Esc closes.
 * Shows enlarged image, caption, channel, and the angle context
 * (hook / rationale / evidence). Regenerate is a visible-but-disabled
 * tease; Include is a local-state checkbox (not yet persisted).
 */
export function AdDetailOverlay({
  runId,
  assetId,
  angle,
  assetMeta,
  onClose,
}: Props) {
  const [include, setInclude] = useState(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // lock background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const channel = angle.channel_mix?.[0];
  const channelLabel = channel ? CHANNEL_LABELS[channel] : "Creative";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ad detail"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(20,18,14,0.72)] backdrop-blur-sm"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden border border-[var(--rule)] bg-[var(--paper)] shadow-2xl md:flex-row">
        {/* Image pane */}
        <div className="relative flex min-h-[280px] flex-1 items-center justify-center bg-[var(--paper-deep)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl(runId, assetId)}
            alt={angle.hook}
            className="max-h-[92vh] w-full object-contain"
          />
        </div>

        {/* Context pane */}
        <div className="flex w-full flex-col gap-5 overflow-y-auto border-t border-[var(--rule)] p-6 md:w-[360px] md:border-l md:border-t-0">
          <div className="flex items-start justify-between gap-4">
            <span
              className="font-serif text-[15px] italic leading-none tracking-[-0.01em] text-[var(--ink-soft)]"
              style={{ fontVariationSettings: '"opsz" 14, "wght" 420, "SOFT" 60' }}
            >
              {channelLabel}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] hover:text-[var(--accent)]"
            >
              close · esc
            </button>
          </div>

          <section className="flex flex-col gap-2 border-t border-[var(--rule)] pt-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Hook
            </span>
            <p className="font-serif text-[16px] italic leading-[1.4] text-[var(--ink)]">
              {angle.hook}
            </p>
          </section>

          {angle.positioning && (
            <section className="flex flex-col gap-2 border-t border-[var(--rule)] pt-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Positioning
              </span>
              <p className="font-serif text-[14px] leading-[1.5] text-[var(--ink)]">
                {angle.positioning}
              </p>
            </section>
          )}

          {angle.rationale && (
            <section className="flex flex-col gap-2 border-t border-[var(--rule)] pt-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Rationale
              </span>
              <p className="font-serif text-[14px] leading-[1.5] text-[var(--ink-soft)]">
                {angle.rationale}
              </p>
            </section>
          )}

          {angle.evidence_competitor_ids?.length > 0 && (
            <section className="flex flex-col gap-2 border-t border-[var(--rule)] pt-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Evidence
              </span>
              <ul className="flex flex-wrap gap-1.5">
                {angle.evidence_competitor_ids.map((id) => (
                  <li
                    key={id}
                    className="border border-[var(--rule)] bg-[rgba(255,252,244,0.6)] px-2 py-1 font-mono text-[10px] text-[var(--ink-soft)]"
                  >
                    {id}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {assetMeta?.prompt && (
            <section className="flex flex-col gap-2 border-t border-[var(--rule)] pt-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Prompt
              </span>
              <p className="font-mono text-[11px] leading-[1.55] text-[var(--ink-soft)]">
                {assetMeta.prompt}
              </p>
            </section>
          )}

          <section className="mt-auto flex flex-col gap-3 border-t border-[var(--rule)] pt-4">
            <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink)]">
              <input
                type="checkbox"
                checked={include}
                onChange={(e) => setInclude(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              Include in campaign
            </label>

            <button
              type="button"
              disabled
              title="Regenerate is coming in a later iteration."
              className="cursor-not-allowed border border-dashed border-[var(--rule)] bg-transparent px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]"
            >
              Regenerate (coming soon)
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
