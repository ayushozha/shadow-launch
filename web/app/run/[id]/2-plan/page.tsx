"use client";

import { use } from "react";

import { PlanDocument } from "@/components/plan/PlanDocument";
import { WizardLayout } from "@/components/wizard/WizardLayout";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Stage 2 · Marketing Plan. Renders a 5-section plan document synthesized
 * from `run.product_profile` + `run.campaign.angles`. There is no dedicated
 * backend "plan" object — everything is derived. See `docs/demo-flow.md` §4.
 */
export default function PlanStagePage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <WizardLayout runId={id} active="2-plan">
      {({ run, ready }) => {
        if (!run?.product_profile || !run.campaign) {
          return <PlanSkeleton />;
        }
        return <PlanDocument run={run} ready={ready} />;
      }}
    </WizardLayout>
  );
}

/**
 * Calm empty state. No spinners, no fake numbers — just a mono line that
 * reports what's happening while we wait for research + campaign to land.
 */
function PlanSkeleton() {
  return (
    <div className="flex min-h-[280px] flex-col justify-center border border-[var(--rule)] bg-[rgba(255,252,244,0.4)] px-6 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
        Drafting the plan from research &amp; campaign outputs…
      </p>
      <p className="mt-3 font-serif text-[15px] italic text-[var(--muted)]">
        The five sections compose from the brand dossier and the first
        campaign angles. Nothing&apos;s fabricated.
      </p>
    </div>
  );
}
