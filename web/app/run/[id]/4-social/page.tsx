"use client";

import { use } from "react";

import { SocialGrid } from "@/components/social/SocialGrid";
import { WizardLayout } from "@/components/wizard/WizardLayout";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <WizardLayout runId={id} active="4-social">
      {({ run }) => {
        if (!run) return <SocialSkeleton />;
        return (
          <SocialGrid
            snapshots={run.social_snapshots ?? []}
            competitors={run.competitors ?? []}
          />
        );
      }}
    </WizardLayout>
  );
}

function SocialSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 flex items-center justify-between">
        <div className="h-4 w-64 bg-[var(--rule-soft)]" />
        <div className="h-6 w-32 bg-[var(--rule-soft)]" />
      </div>
      <div className="border border-[var(--rule)] bg-[rgba(255,252,244,0.3)] p-4">
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className="h-[78px] border border-[var(--rule-soft)] bg-[rgba(12,12,10,0.02)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
