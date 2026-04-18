"use client";

import Link from "next/link";

import type { Run } from "@/lib/types";
import { WIZARD_STAGES, WizardStageSlug, runPath } from "@/lib/wizard";

interface Props {
  runId: string;
  active: WizardStageSlug;
  run: Run | null;
  allowJumpAhead?: boolean;
}

export function Stepper({ runId, active, run, allowJumpAhead }: Props) {
  const activeIndex = WIZARD_STAGES.findIndex((s) => s.slug === active);

  return (
    <div
      className="sticky top-0 z-20 border-b border-[var(--rule)] bg-[var(--paper)]/92 px-6 py-3 backdrop-blur-sm md:px-10"
      aria-label={`Stage ${activeIndex + 1} of ${WIZARD_STAGES.length}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <ol className="flex flex-1 items-center gap-2">
          {WIZARD_STAGES.map((s, i) => {
            const isActive = s.slug === active;
            const isPast = i < activeIndex;
            const isReady = s.ready(run);
            const canVisit = isPast || isActive || allowJumpAhead || isReady;
            const dot = (
              <span
                className="block h-2 w-2 rounded-full"
                style={{
                  background: isActive
                    ? "var(--accent)"
                    : isPast
                      ? "var(--ink-soft)"
                      : isReady
                        ? "var(--phosphor)"
                        : "var(--rule)",
                }}
                aria-hidden
              />
            );
            return (
              <li
                key={s.slug}
                className="flex items-center gap-2"
                aria-current={isActive ? "step" : undefined}
              >
                {canVisit ? (
                  <Link
                    href={runPath(runId, s.slug)}
                    className="group flex items-center gap-2"
                    title={`Stage ${s.num} · ${s.title}`}
                  >
                    {dot}
                    <span
                      className={`hidden font-mono text-[10px] uppercase tracking-[0.12em] transition-colors md:inline ${
                        isActive
                          ? "text-[var(--ink)]"
                          : "text-[var(--muted)] group-hover:text-[var(--ink-soft)]"
                      }`}
                    >
                      {s.title}
                    </span>
                  </Link>
                ) : (
                  <span
                    className="flex items-center gap-2"
                    title={`Stage ${s.num} · ${s.title} — not ready yet`}
                  >
                    {dot}
                    <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--rule)] md:inline">
                      {s.title}
                    </span>
                  </span>
                )}
                {i < WIZARD_STAGES.length - 1 && (
                  <span
                    aria-hidden
                    className="h-px w-6 flex-shrink-0"
                    style={{ background: "var(--rule-soft)" }}
                  />
                )}
              </li>
            );
          })}
        </ol>

        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] md:ml-4">
          Stage {activeIndex + 1} / {WIZARD_STAGES.length}
        </span>
      </div>
    </div>
  );
}
