"use client";

import { ReactNode } from "react";

import { useRunData } from "@/lib/useRunData";
import type { WizardStageSlug } from "@/lib/wizard";
import { WIZARD_STAGES } from "@/lib/wizard";

import { JuryRail } from "./JuryRail";
import { StageReadout } from "./StageReadout";
import { Stepper } from "./Stepper";
import { WizardFooter } from "./WizardFooter";
import { WizardNav } from "./WizardNav";

interface Props {
  runId: string;
  active: WizardStageSlug;
  children: (ctx: {
    run: ReturnType<typeof useRunData>["run"];
    ready: boolean;
    connection: ReturnType<typeof useRunData>["connection"];
    error: string | null;
  }) => ReactNode;
}

/**
 * Wizard page shell. Every Stage 1–7 page uses this as its outer layout.
 * Renders:
 *   [trace nav]   TopNav
 *   [stepper]     7 dots
 *   [workspace]   (children)          |  [JuryRail]
 *                                     |  [StageReadout]
 *   [footer]      Back / Next
 *
 * `children` is a render-prop so the page can gate its content on `ready`
 * without duplicating the status bar logic.
 */
export function WizardLayout({ runId, active, children }: Props) {
  const { run, trace, connection, error } = useRunData(runId);
  const stageMeta = WIZARD_STAGES.find((s) => s.slug === active);
  const ready = stageMeta?.ready(run) ?? false;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <WizardNav runId={runId} />
      <Stepper runId={runId} active={active} run={run} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 md:px-10 md:py-12">
        <header className="mb-6 flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
            Stage {stageMeta?.num.toString().padStart(2, "0")} · {stageMeta?.title}
          </span>
          <h1 className="font-serif text-[28px] leading-tight tracking-tight md:text-[36px]">
            {stageMeta?.narrativeBeat}
          </h1>
          <p className="font-serif text-[15px] italic text-[var(--muted)]">
            {stageMeta?.subtitle}
          </p>
        </header>

        {error && (
          <div className="mb-4 border border-[var(--accent)] bg-[rgba(227,51,18,0.05)] p-4 font-mono text-[11px] text-[var(--accent-ink)]">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)]">
          <section className="min-w-0">
            {children({ run, ready, connection, error })}
          </section>

          <div className="flex flex-col gap-6">
            <JuryRail run={run} />
            <StageReadout
              stage={stageMeta?.num}
              events={trace}
              connection={connection}
              startTime={run?.created_at ?? null}
            />
          </div>
        </div>
      </main>

      <WizardFooter
        runId={runId}
        active={active}
        run={run}
        pendingReason={
          error
            ? "Backend error — check the readout."
            : ready
              ? undefined
              : "Waiting for this stage to finish…"
        }
      />
    </div>
  );
}
