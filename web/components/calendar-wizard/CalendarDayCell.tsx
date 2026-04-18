"use client";

import type { CalendarSlot, Channel } from "@/lib/types";
import { assetUrl } from "@/lib/api";

// One day column in the wizard calendar grid. Shows a day-number header
// followed by a list of stacked slot pills, sorted by posting_time.

const CHANNEL_LABEL: Record<Channel, string> = {
  linkedin: "LI",
  twitter: "TW",
  facebook: "FB",
  instagram: "IG",
  tiktok: "TT",
  blog: "BL",
  email: "EM",
  youtube: "YT",
};

const CHANNEL_COLOR: Record<Channel, string> = {
  linkedin: "#0a66c2",
  twitter: "#0c0c0a",
  facebook: "#1877f2",
  instagram: "#e1306c",
  tiktok: "#00a39a",
  blog: "#6a6454",
  email: "#b3260a",
  youtube: "#ff0000",
};

const WEEKDAY_ABBR = ["M", "T", "W", "T", "F", "S", "S"];

function truncate(s: string, n = 60): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

export default function CalendarDayCell({
  runId,
  day,
  slots,
  selectedSlotId,
  onSelect,
}: {
  runId: string;
  day: number;
  slots: CalendarSlot[];
  selectedSlotId: string | null;
  onSelect: (slot: CalendarSlot) => void;
}) {
  const sorted = [...slots].sort((a, b) =>
    a.posting_time.localeCompare(b.posting_time),
  );
  // day is 1-indexed. Column 0 = Mon.
  const weekday = WEEKDAY_ABBR[(day - 1) % 7];

  return (
    <div className="flex min-h-[9rem] flex-col border border-[var(--rule-soft)] bg-[rgba(255,252,244,0.4)]">
      <div className="flex items-baseline justify-between border-b border-[var(--rule-soft)] px-2 py-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Day {String(day).padStart(2, "0")}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          {weekday}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-1.5">
        {sorted.length === 0 && (
          <span className="px-1 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)] opacity-60">
            ·
          </span>
        )}

        {sorted.map((slot) => {
          const isSelected = selectedSlotId === slot.slot_id;
          const tooltip = `${slot.copy}\n\n— ${slot.rationale}`;
          return (
            <button
              key={slot.slot_id}
              type="button"
              title={tooltip}
              aria-pressed={isSelected}
              onClick={() => onSelect(slot)}
              className={[
                "group flex flex-col gap-1 border p-1.5 text-left transition-colors",
                isSelected
                  ? "border-[var(--accent)] bg-[rgba(227,51,18,0.06)]"
                  : "border-[var(--rule-soft)] bg-[rgba(255,252,244,0.7)] hover:border-[var(--rule)] hover:bg-[rgba(255,252,244,1)]",
              ].join(" ")}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="flex h-4 items-center rounded-sm px-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--paper)]"
                  style={{ backgroundColor: CHANNEL_COLOR[slot.channel] }}
                >
                  {CHANNEL_LABEL[slot.channel]}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  {slot.post_type}
                </span>
                <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {slot.posting_time}
                </span>
              </div>

              <div className="flex items-start gap-1.5">
                {slot.asset_id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(runId, slot.asset_id)}
                    alt=""
                    loading="lazy"
                    className="h-8 w-8 flex-shrink-0 border border-[var(--rule-soft)] object-cover"
                  />
                )}
                <p className="font-serif text-[11px] leading-[1.3] text-[var(--ink-soft)]">
                  {truncate(slot.copy, 60)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
