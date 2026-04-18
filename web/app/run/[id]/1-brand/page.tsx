"use client";

import { use } from "react";

import {
  BrandDossier,
  BrandDossierSkeleton,
} from "@/components/brand/BrandDossier";
import { WizardLayout } from "@/components/wizard/WizardLayout";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <WizardLayout runId={id} active="1-brand">
      {({ run, ready }) => {
        if (!run?.product_profile) return <BrandDossierSkeleton />;
        return <BrandDossier profile={run.product_profile} ready={ready} />;
      }}
    </WizardLayout>
  );
}
