"use client";

import { use } from "react";

import { PlaysList, PlaysSkeleton } from "@/components/plays/PlaysList";
import { WizardLayout } from "@/components/wizard/WizardLayout";

/**
 * Stage 5 · GTM Angles.
 *
 * Spec calls this "GTM Plays" and promises 3–5. Our backend returns 1–3
 * CampaignAngles, so we render whatever the run contains and title the
 * UI "GTM Angles" to match the data. Each card synthesizes:
 *   run.campaign.angles[i]
 *   + run.verdicts       (target_type="angle", target_id=angle_id)
 *   + run.reactions      (target_type="angle", round=1)
 *   + run.competitors    (for evidence links)
 *
 * No synthetic expansion. No fake scores. If verdicts haven't arrived
 * yet the jury strip is replaced with "deliberating…".
 */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <WizardLayout runId={id} active="5-plays">
      {({ run }) => {
        if (!run?.campaign) return <PlaysSkeleton />;
        return <PlaysList runId={id} run={run} />;
      }}
    </WizardLayout>
  );
}
