"use client";

import { use } from "react";

import {
  CalendarSkeleton,
  WizardCalendarGrid,
} from "@/components/calendar-wizard/WizardCalendarGrid";
import { WizardLayout } from "@/components/wizard/WizardLayout";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <WizardLayout runId={id} active="7-calendar">
      {({ run }) => {
        if (!run?.calendar) return <CalendarSkeleton />;
        return (
          <WizardCalendarGrid runId={id} calendar={run.calendar} run={run} />
        );
      }}
    </WizardLayout>
  );
}
