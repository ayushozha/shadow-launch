"use client";

import { use } from "react";

import { CompetitiveMap, MapSkeleton } from "@/components/competitors/CompetitiveMap";
import { WizardLayout } from "@/components/wizard/WizardLayout";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <WizardLayout runId={id} active="3-competitors">
      {({ run }) => {
        if (!run || run.competitors.length === 0) return <MapSkeleton />;
        return (
          <CompetitiveMap
            runId={id}
            competitors={run.competitors}
            productName={run.product_profile?.brand_name ?? "You"}
          />
        );
      }}
    </WizardLayout>
  );
}
