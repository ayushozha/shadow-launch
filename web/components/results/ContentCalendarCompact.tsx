import Link from "next/link";
import type { Channel, ContentCalendar } from "@/lib/types";

// Section 7 — Compact 14-day overview. 7-col × 2-row grid. Each day cell shows
// colored dots per slot (one per channel). Links out to the full calendar page.

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

export default function ContentCalendarCompact({
  runId,
  calendar,
}: {
  runId: string;
  calendar: ContentCalendar;
}) {
  const span = calendar.days_span ?? 14;
  const byDay = new Map<number, typeof calendar.slots>();
  for (const s of calendar.slots) {
    const list = byDay.get(s.day) ?? [];
    list.push(s);
    byDay.set(s.day, list);
  }

  const days = Array.from({ length: span }, (_, i) => i + 1);

  // Channel legend computed from actually-used channels
  const usedChannels = Array.from(
    new Set(calendar.slots.map((s) => s.channel)),
  ) as Channel[];

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §07 · 14-day content calendar · {calendar.slots.length} slots
          </span>
          <Link
            href={`/run/${runId}/calendar`}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] hover:text-[var(--accent)]"
          >
            open full calendar →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {usedChannels.map((ch) => (
            <div key={ch} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CHANNEL_COLOR[ch] }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                {ch}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const slots = byDay.get(day) ?? [];
            return (
              <div
                key={day}
                className="flex min-h-[96px] flex-col gap-2 border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] p-2"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    Day
                  </span>
                  <span className="font-serif text-[18px] leading-none text-[var(--ink)]">
                    {day}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {slots.map((s) => (
                    <span
                      key={s.slot_id}
                      title={`${s.channel} · ${s.post_type} · ${s.posting_time}`}
                      className="flex h-4 items-center gap-0.5 rounded-sm px-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--paper)]"
                      style={{ backgroundColor: CHANNEL_COLOR[s.channel] }}
                    >
                      {CHANNEL_LABEL[s.channel]}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
