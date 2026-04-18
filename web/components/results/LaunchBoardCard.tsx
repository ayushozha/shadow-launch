"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LaunchBoard, Milestone, Task } from "@/lib/types";

// Launch-board card on the results page. The CTA now always links to our
// standalone /board/{run_id} page — we own the launch-plan deliverable
// end-to-end, so the old "Open in Rory / fallback board" branching is gone.

// The cached JSON uses a wider task/milestone shape than the TS types
// declare today (due_day, description, milestone). We access defensively
// and fall back to what the type guarantees.

type RichTask = Task & { description?: string; due_day?: number };
type RichMilestone = Milestone & { milestone?: string };

// We derive the run id from the URL because the results page passes only
// the board payload into this component. This avoids editing the (forbidden)
// results page signature while still producing a correct /board/{id} link.
function runIdFromPath(pathname: string | null): string {
  if (!pathname) return "demo-linear-001";
  // expected shape: /results/<id>[/...]
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("results");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return "demo-linear-001";
}

export default function LaunchBoardCard({ board }: { board: LaunchBoard }) {
  const tasks = (board.tasks ?? []) as RichTask[];
  const timeline = (board.timeline ?? []) as RichMilestone[];
  const pathname = usePathname();
  const runId = runIdFromPath(pathname);

  return (
    <section className="border-b border-[var(--rule)] bg-[var(--ink)] px-5 py-16 text-[var(--paper)] md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-12">
        <div className="grid grid-cols-1 gap-6 border-b border-[rgba(236,228,210,0.18)] pb-6 md:grid-cols-[1fr_3fr] md:items-baseline">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(236,228,210,0.55)]">
            §04 · Launch board
          </span>
          <h2
            className="font-serif text-[clamp(30px,4vw,52px)] leading-[1.05] tracking-[-0.02em] text-[var(--paper)]"
            style={{ fontVariationSettings: '"opsz" 60, "wght" 380, "SOFT" 40' }}
          >
            A 14-day sprint. <em className="italic text-[var(--accent)]">Owners, days, dissent answers.</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Tasks */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(236,228,210,0.55)]">
              Tasks · {tasks.length}
            </p>
            <ul className="mt-4 flex flex-col divide-y divide-[rgba(236,228,210,0.15)] border-y border-[rgba(236,228,210,0.15)]">
              {tasks.map((t, i) => {
                const day = t.day ?? t.due_day;
                return (
                  <li key={t.id ?? i} className="grid grid-cols-[auto_1fr_auto] items-start gap-4 py-4">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
                      {t.id ?? `T${String(i + 1).padStart(2, "0")}`}
                    </span>
                    <div>
                      <p className="font-serif text-[18px] leading-[1.25] text-[var(--paper)]">
                        {t.title}
                      </p>
                      {(t.description || t.notes) && (
                        <p className="mt-2 font-serif text-[14px] leading-[1.5] text-[rgba(236,228,210,0.72)]">
                          {t.description ?? t.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(236,228,210,0.55)]">
                        {t.owner}
                      </span>
                      {day !== undefined && (
                        <span className="font-serif text-[20px] italic text-[var(--paper)]">
                          D{day}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Timeline */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(236,228,210,0.55)]">
              Timeline · {timeline.length} milestones
            </p>
            <ol className="mt-4 flex flex-col gap-4 border-l border-[rgba(236,228,210,0.25)] pl-6">
              {timeline.map((m, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[29px] top-2 h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
                      DAY {m.day}
                    </span>
                  </div>
                  <p className="mt-1 font-serif text-[15px] leading-[1.45] text-[rgba(236,228,210,0.85)]">
                    {m.milestone ?? m.label}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Executive summary */}
        <div className="grid grid-cols-1 gap-8 border-t border-[rgba(236,228,210,0.18)] pt-10 lg:grid-cols-[1fr_3fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(236,228,210,0.55)]">
              Executive summary
            </p>
            <p className="mt-2 font-serif text-[13px] italic text-[rgba(236,228,210,0.6)]">
              drop this into the Monday investor update.
            </p>
          </div>
          <div className="max-w-[720px] font-serif text-[17px] leading-[1.6] text-[rgba(236,228,210,0.9)]">
            {board.executive_summary.split(/\n\n+/).map((para, i) => (
              <p key={i} className="mb-4 last:mb-0">
                {para}
              </p>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-[rgba(236,228,210,0.18)] pt-8">
          <Link
            href={`/board/${runId}`}
            className="inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--paper)] transition-colors hover:bg-[var(--accent-ink)] hover:border-[var(--accent-ink)]"
          >
            Open board
            <span>→</span>
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(236,228,210,0.5)]">
            shareable launch plan · /board/{runId}
          </span>
        </div>
      </div>
    </section>
  );
}
