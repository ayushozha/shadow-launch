"use client";

import { useEffect, useState } from "react";

import type { CalendarSlot, Campaign, CampaignAngle } from "@/lib/types";
import { assetUrl } from "@/lib/api";

// Side drawer that opens when a slot pill is clicked. All edits are visual
// only — no persistence. The related angle is derived by scanning the
// campaign for the angle that owns this slot's asset_id.

function findOwningAngle(
  campaign: Campaign | null | undefined,
  slot: CalendarSlot,
): CampaignAngle | null {
  if (!campaign || !slot.asset_id) return null;
  return (
    campaign.angles.find((a) => (a.asset_ids ?? []).includes(slot.asset_id!)) ??
    null
  );
}

export default function PostDetailPanel({
  runId,
  slot,
  campaign,
  onClose,
}: {
  runId: string;
  slot: CalendarSlot;
  campaign: Campaign | null | undefined;
  onClose: () => void;
}) {
  // Local editable copy — reset each time a different slot opens.
  const [draftCopy, setDraftCopy] = useState(slot.copy);
  useEffect(() => {
    setDraftCopy(slot.copy);
  }, [slot.slot_id, slot.copy]);

  const angle = findOwningAngle(campaign, slot);

  return (
    <aside
      aria-label={`Post detail for day ${slot.day}`}
      className="flex flex-col gap-4 border border-[var(--rule)] bg-[var(--paper)] p-5"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[var(--rule-soft)] pb-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--accent)]">
            Day {String(slot.day).padStart(2, "0")} · {slot.channel} · {slot.post_type}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {slot.posting_time}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close post detail"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          close ×
        </button>
      </header>

      {slot.asset_id && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetUrl(runId, slot.asset_id)}
          alt={`Asset for ${slot.channel} post on day ${slot.day}`}
          className="w-full border border-[var(--rule-soft)]"
        />
      )}

      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Copy
        </span>
        <textarea
          value={draftCopy}
          onChange={(e) => setDraftCopy(e.target.value)}
          rows={4}
          className="w-full resize-y border border-[var(--rule-soft)] bg-[rgba(255,252,244,0.9)] p-2 font-serif text-[13px] leading-[1.5] text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
        />
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)] opacity-70">
          Edits are local to this preview.
        </span>
      </div>

      <div className="border-t border-[var(--rule-soft)] pt-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Rationale
        </span>
        <p className="mt-1.5 font-serif text-[13px] italic leading-[1.55] text-[var(--ink-soft)]">
          {slot.rationale}
        </p>
      </div>

      {angle && (
        <div className="border-t border-[var(--rule-soft)] pt-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Related angle
          </span>
          <p className="mt-1.5 font-serif text-[14px] leading-[1.45] text-[var(--ink)]">
            {angle.hook}
          </p>
          <p className="mt-1 font-serif text-[12px] italic leading-[1.45] text-[var(--muted)]">
            {angle.positioning}
          </p>
        </div>
      )}

      <div className="border-t border-[var(--rule-soft)] pt-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
          slot_id
        </span>
        <p className="mt-1 break-all font-mono text-[10px] text-[var(--ink-soft)]">
          {slot.slot_id}
        </p>
      </div>
    </aside>
  );
}
