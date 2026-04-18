"use client";

import { useMemo, useState } from "react";

import type { CalendarSlot, ContentCalendar, Run } from "@/lib/types";

import CalendarDayCell from "./CalendarDayCell";
import KeyMomentsList from "./KeyMomentsList";
import PostDetailPanel from "./PostDetailPanel";
import WeekRangeToggle, { type WeekRange } from "./WeekRangeToggle";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function groupByDay(slots: CalendarSlot[]): Map<number, CalendarSlot[]> {
  const m = new Map<number, CalendarSlot[]>();
  for (const s of slots) {
    const bucket = m.get(s.day) ?? [];
    bucket.push(s);
    m.set(s.day, bucket);
  }
  return m;
}

export function WizardCalendarGrid({
  runId,
  calendar,
  run,
}: {
  runId: string;
  calendar: ContentCalendar;
  run?: Run | null;
}) {
  const [range, setRange] = useState<WeekRange>(2);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);

  const grouped = useMemo(() => groupByDay(calendar.slots ?? []), [calendar.slots]);

  // Days to render = range × 7, or the calendar's own span if shorter.
  const maxDay = Math.max(calendar.days_span ?? 0, ...calendar.slots.map((s) => s.day));
  const rows = range;
  const totalDays = Math.min(rows * 7, Math.max(rows * 7, maxDay));
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const postCount = calendar.slots.length;
  const channelCount = new Set(calendar.slots.map((s) => s.channel)).size;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--rule-soft)] pb-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {rows === 2 ? "Two weeks" : "Four weeks"} · {channelCount}{" "}
            {channelCount === 1 ? "channel" : "channels"} · {postCount} scheduled{" "}
            {postCount === 1 ? "post" : "posts"}
          </span>
          <p className="font-serif text-[13px] italic leading-[1.45] text-[var(--ink-soft)]">
            Click a pill to inspect a post. Hover for the rationale.
          </p>
        </div>
        <WeekRangeToggle value={range} onChange={setRange} />
      </header>

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)] gap-5 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAY_HEADERS.map((w) => (
              <div
                key={w}
                className="pb-1 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]"
              >
                {w}
              </div>
            ))}
          </div>

          {Array.from({ length: rows }, (_, rowIdx) => (
            <div key={rowIdx} className="flex items-stretch gap-2">
              <span className="flex w-8 flex-shrink-0 items-start pt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
                W{rowIdx + 1}
              </span>
              <div className="grid flex-1 grid-cols-7 gap-2">
                {days.slice(rowIdx * 7, rowIdx * 7 + 7).map((day) => (
                  <CalendarDayCell
                    key={day}
                    runId={runId}
                    day={day}
                    slots={grouped.get(day) ?? []}
                    selectedSlotId={selectedSlot?.slot_id ?? null}
                    onSelect={(s) =>
                      setSelectedSlot((prev) =>
                        prev?.slot_id === s.slot_id ? null : s,
                      )
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-col">
          {selectedSlot ? (
            <PostDetailPanel
              runId={runId}
              slot={selectedSlot}
              campaign={run?.campaign}
              onClose={() => setSelectedSlot(null)}
            />
          ) : (
            <div className="flex h-full min-h-[12rem] flex-col items-start gap-2 border border-dashed border-[var(--rule)] bg-[rgba(255,252,244,0.3)] p-5">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Post detail
              </span>
              <p className="font-serif text-[13px] italic leading-[1.5] text-[var(--ink-soft)]">
                Select a pill to expand its copy, asset, and rationale.
              </p>
            </div>
          )}
        </div>
      </div>

      <KeyMomentsList
        slots={calendar.slots}
        onSelect={(s) => setSelectedSlot(s)}
      />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between border-b border-[var(--rule-soft)] pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Planning the 14-day cadence…
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)] opacity-60">
          awaiting slots
        </span>
      </header>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 14 }, (_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse border border-[var(--rule-soft)] bg-[rgba(255,252,244,0.5)]"
          />
        ))}
      </div>
    </div>
  );
}
