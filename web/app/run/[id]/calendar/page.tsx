import Link from "next/link";
import { getCalendar, getRun } from "@/lib/api";
import type { CalendarSlot, ContentCalendar, Run } from "@/lib/types";
import CalendarSlotCell from "@/components/calendar/CalendarSlotCell";
import PrintButton from "@/components/calendar/PrintButton";

// Full 14-day calendar view. 7 cols × 2 rows (responsive). Print-friendly.
// Server component. Prefers the dedicated /calendar endpoint; falls back to
// the calendar embedded on the Run.

type PageParams = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function CalendarPage({ params }: { params: PageParams }) {
  const { id: runId } = await params;

  let calendar: ContentCalendar | null = null;
  let run: Run | null = null;
  let loadError: string | null = null;
  try {
    calendar = await getCalendar(runId);
  } catch {
    // Dedicated endpoint not available — fall back to the full Run.
    try {
      run = await getRun(runId);
      calendar = run.calendar ?? null;
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!calendar || loadError) {
    return (
      <main className="relative z-[1]">
        <TopBar runId={runId} />
        <section className="mx-auto max-w-3xl px-6 py-24 font-serif">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
            Calendar unavailable
          </p>
          <h1 className="mt-3 font-serif text-[40px] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]">
            Run not found or still in progress.
          </h1>
          {loadError && (
            <pre className="mt-6 max-w-full overflow-x-auto border border-[var(--rule)] bg-[rgba(255,252,244,0.4)] p-4 font-mono text-[11px] text-[var(--ink-soft)]">
              {loadError}
            </pre>
          )}
          <Link
            href={`/results/${runId}`}
            className="mt-8 inline-block border border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--paper)] transition-colors hover:bg-[var(--accent)] hover:border-[var(--accent)]"
          >
            back to results
          </Link>
        </section>
      </main>
    );
  }

  const span = calendar.days_span ?? 14;
  const byDay = new Map<number, CalendarSlot[]>();
  for (const s of calendar.slots) {
    const list = byDay.get(s.day) ?? [];
    list.push(s);
    byDay.set(s.day, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.posting_time.localeCompare(b.posting_time));
  }

  const days = Array.from({ length: span }, (_, i) => i + 1);

  return (
    <main className="relative z-[1]">
      <TopBar runId={runId} />

      <section className="border-b border-[var(--rule)] px-5 py-10 md:px-10 md:py-14 print:py-4">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
              Content calendar · {span} days · {calendar.slots.length} posts
            </span>
            <span className="font-serif text-[13px] italic text-[var(--muted)]">
              click any slot to expand · print-friendly
            </span>
          </div>

          <h1
            className="font-serif text-[clamp(40px,6vw,80px)] leading-[0.96] tracking-[-0.02em] text-[var(--ink)] print:text-[32px]"
            style={{ fontVariationSettings: '"opsz" 144, "wght" 420' }}
          >
            14 days. Every post. Every slot.
          </h1>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 print:grid-cols-7">
            {days.map((day) => {
              const slots = byDay.get(day) ?? [];
              return (
                <div
                  key={day}
                  className="flex min-h-[160px] flex-col gap-2 border border-[var(--rule)] bg-[rgba(255,252,244,0.3)] p-2 print:min-h-0"
                >
                  <div className="flex items-baseline justify-between border-b border-[var(--rule-soft)] pb-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      Day
                    </span>
                    <span className="font-serif text-[20px] leading-none text-[var(--ink)]">
                      {day}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {slots.map((s) => (
                      <CalendarSlotCell key={s.slot_id} runId={runId} slot={s} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <style>{`
        @media print {
          nav, .print\\:hidden { display: none !important; }
          body::before, body::after { display: none !important; }
          .calendar-slot-expand { display: block !important; }
        }
      `}</style>
    </main>
  );
}

function TopBar({ runId }: { runId: string }) {
  return (
    <div className="border-b border-[var(--rule)] bg-[rgba(236,228,210,0.92)] px-5 py-4 backdrop-blur md:px-10 print:hidden">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            ← shadow launch
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            /
          </span>
          <Link
            href={`/results/${runId}`}
            className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            results · {runId}
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            /
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]">
            calendar
          </span>
        </div>
        <PrintButton />
      </div>
    </div>
  );
}

