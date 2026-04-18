import type { Task } from "@/lib/types";

// Grouped task list for /board/[id]. Tasks are grouped by owner
// (Marketing / Founder / Design / GTM Eng). Each task renders as a
// bordered editorial card with an unchecked checkbox (visual only —
// this page is a PDF-ready handoff, not an interactive todo app).

type RichTask = Task & { description?: string; due_day?: number };

type Props = {
  tasks: RichTask[];
};

// Canonical owner order for the demo data. Any unknown owner gets
// appended at the end in the order it was first encountered.
const OWNER_ORDER = ["Marketing", "Founder", "Design", "GTM Eng"];

function groupByOwner(tasks: RichTask[]): { owner: string; tasks: RichTask[] }[] {
  const byOwner = new Map<string, RichTask[]>();
  for (const t of tasks) {
    const list = byOwner.get(t.owner) ?? [];
    list.push(t);
    byOwner.set(t.owner, list);
  }
  const ordered: { owner: string; tasks: RichTask[] }[] = [];
  for (const o of OWNER_ORDER) {
    if (byOwner.has(o)) {
      ordered.push({ owner: o, tasks: byOwner.get(o)! });
      byOwner.delete(o);
    }
  }
  for (const [o, list] of byOwner) ordered.push({ owner: o, tasks: list });
  // sort tasks inside each owner by due_day ascending
  for (const g of ordered) {
    g.tasks.sort((a, b) => (a.due_day ?? a.day ?? 99) - (b.due_day ?? b.day ?? 99));
  }
  return ordered;
}

export default function TaskList({ tasks }: Props) {
  const groups = groupByOwner(tasks);

  return (
    <section className="border-b border-[var(--rule)] px-5 py-14 md:px-14 md:py-20 print:py-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-[1fr_3fr] md:items-baseline">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
            Tasks · {tasks.length} total
          </p>
          <h2
            className="font-serif text-[clamp(26px,3.5vw,42px)] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]"
            style={{ fontVariationSettings: '"opsz" 60, "wght" 400, "SOFT" 40' }}
          >
            The 14-day sprint, <em className="italic text-[var(--accent)]">grouped by owner.</em>
          </h2>
        </div>

        <div className="flex flex-col gap-12">
          {groups.map((group) => (
            <div key={group.owner}>
              <div className="flex items-baseline justify-between border-b border-[var(--rule)] pb-3">
                <h3
                  className="font-serif text-[22px] tracking-[-0.01em] text-[var(--ink)]"
                  style={{ fontVariationSettings: '"opsz" 36, "wght" 500' }}
                >
                  {group.owner}
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
                </p>
              </div>
              <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-1">
                {group.tasks.map((t, i) => {
                  const day = t.due_day ?? t.day;
                  return (
                    <li
                      key={t.id ?? `${group.owner}-${i}`}
                      className="flex gap-4 border border-[var(--rule)] bg-[var(--paper)] p-5 shadow-[0_1px_0_var(--rule-soft)] print:shadow-none"
                    >
                      <div className="pt-1">
                        {/* Visual-only checkbox. The board is a PDF-friendly deliverable. */}
                        <span
                          aria-hidden
                          className="block h-5 w-5 border-2 border-[var(--ink)] bg-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">
                            {t.id ?? `T${String(i + 1).padStart(2, "0")}`}
                          </p>
                          {day !== undefined && (
                            <p
                              className="font-serif text-[18px] italic leading-[1] text-[var(--ink)]"
                              style={{ fontVariationSettings: '"opsz" 36, "wght" 500' }}
                            >
                              Day {day}
                            </p>
                          )}
                        </div>
                        <p
                          className="mt-2 font-serif text-[19px] leading-[1.3] tracking-[-0.01em] text-[var(--ink)]"
                          style={{ fontVariationSettings: '"opsz" 36, "wght" 450' }}
                        >
                          {t.title}
                        </p>
                        {(t.description || t.notes) && (
                          <p className="mt-2 font-serif text-[14px] leading-[1.55] text-[var(--ink-soft)]">
                            {t.description ?? t.notes}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
