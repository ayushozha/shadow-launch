"use client";

import { use } from "react";

import { CreativeGrid, CreativeSkeleton } from "@/components/creative/CreativeGrid";
import { WizardLayout } from "@/components/wizard/WizardLayout";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <WizardLayout runId={id} active="6-creative">
      {({ run }) => {
        if (!run?.campaign) return <CreativeSkeleton />;
        return <CreativeGrid runId={id} campaign={run.campaign} run={run} />;
      }}
    </WizardLayout>
  );
}
