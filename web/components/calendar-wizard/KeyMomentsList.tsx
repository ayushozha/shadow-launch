"use client";

import type { CalendarSlot, Channel } from "@/lib/types";

// "Key moments" list: the 3 slots with the longest rationale text. We use
// rationale length as a proxy for importance — the LLM tends to write more
// when a slot is pivotal. Click a row to jump to that slot in the grid.

const CHANNEL_LABEL: Record<Channel, string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  blog: "Blog",
  email: "Email",
  youtube: "YouTube",
};

function firstSentence(s: string): string {
  const trimmed = s.trim();
  const match = trimmed.match(/^[\s\S]*?[.!?](\s|$)/);
  if (match) return match[0].trim();
  // fallback: truncate
  return trimmed.length > 140 ? trimmed.slice(0, 139).trimEnd() + "…" : trimmed;
}

function weekOfDay(day: number): number {
  return Math.floor((day - 1) / 7) + 1;
}

export default function KeyMomentsList({
  slots,
  onSelect,
}: {
  slots: CalendarSlot[];
  onSelect: (slot: CalendarSlot) => void;
}) {
  const top = [...slots]
    .sort((a, b) => (b.rationale?.length ?? 0) - (a.rationale?.length ?? 0))
    .slice(0, 3);

  if (top.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 border-t border-[var(--rule)] pt-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink)]">
          Key moments
        </h3>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
          ranked by rationale depth
        </span>
      </div>

      <ol className="flex flex-col gap-2">
        {top.map((slot, idx) => (
          <li key={slot.slot_id}>
            <button
              type="button"
              onClick={() => onSelect(slot)}
              className="flex w-full items-start gap-3 border border-[var(--rule-soft)] bg-[rgba(255,252,244,0.5)] p-3 text-left transition-colors hover:border-[var(--rule)] hover:bg-[rgba(255,252,244,0.9)]"
            >
              <span className="font-mono text-[18px] leading-none text-[var(--accent)]">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    W{weekOfDay(slot.day)} · Day {String(slot.day).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    {CHANNEL_LABEL[slot.channel]}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    {slot.posting_time}
                  </span>
                </div>
                <p className="font-serif text-[13px] italic leading-[1.5] text-[var(--ink-soft)]">
                  {firstSentence(slot.rationale)}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
