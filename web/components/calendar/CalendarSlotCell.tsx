"use client";

import { useState } from "react";
import type { CalendarSlot, Channel } from "@/lib/types";
import { assetUrl } from "@/lib/api";

// One slot row inside a day cell. Click toggles an inline expansion showing
// the full copy + rationale + (if present) full asset image.

const CHANNEL_COLOR: Record<Channel, string> = {
  linkedin: "#0a66c2",
  twitter: "#0c0c0a",
  facebook: "#1877f2",
  instagram: "#e1306c",
  tiktok: "#00f2ea",
  blog: "#6a6454",
  email: "#b3260a",
  youtube: "#ff0000",
};

const CHANNEL_LABEL: Record<Channel, string> = {
  linkedin: "LI",
  twitter: "X",
  facebook: "FB",
  instagram: "IG",
  tiktok: "TT",
  blog: "BL",
  email: "EM",
  youtube: "YT",
};

export default function CalendarSlotCell({
  runId,
  slot,
}: {
  runId: string;
  slot: CalendarSlot;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="calendar-slot border border-[var(--rule-soft)] bg-[rgba(255,252,244,0.5)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-col items-start gap-1.5 p-2 text-left transition-colors hover:bg-[rgba(255,252,244,0.9)]"
      >
        <div className="flex w-full items-center justify-between gap-2">
          <span
            className="flex h-4 items-center rounded-sm px-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--paper)]"
            style={{ backgroundColor: CHANNEL_COLOR[slot.channel] }}
          >
            {CHANNEL_LABEL[slot.channel]}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {slot.posting_time}
          </span>
        </div>
        <p className="font-serif text-[12px] leading-[1.35] text-[var(--ink-soft)] line-clamp-2">
          {slot.copy}
        </p>
        {slot.asset_id && (
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
            ◆ {slot.post_type}
          </span>
        )}
      </button>

      {open && (
        <div className="calendar-slot-expand flex flex-col gap-3 border-t border-[var(--rule-soft)] bg-[rgba(255,252,244,0.9)] p-3">
          <div className="flex items-baseline justify-between">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ color: CHANNEL_COLOR[slot.channel] }}
            >
              {slot.channel} · {slot.post_type}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {slot.posting_time}
            </span>
          </div>
          <p className="font-serif text-[14px] leading-[1.55] text-[var(--ink)]">
            {slot.copy}
          </p>
          {slot.asset_id && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(runId, slot.asset_id)}
              alt={`Asset for ${slot.channel} post`}
              className="w-full border border-[var(--rule-soft)]"
            />
          )}
          <div className="border-t border-[var(--rule-soft)] pt-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Rationale
            </p>
            <p className="mt-1 font-serif text-[13px] italic leading-[1.5] text-[var(--ink-soft)]">
              {slot.rationale}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
