// Wizard stage registry. Each of the 7 wizard pages is described here once,
// so routing, the stepper, the footer, and the readiness checks all agree.
//
// Stage slugs map to routes under `/run/[id]/{slug}/page.tsx`.

import type { Run } from "./types";

export type WizardStageSlug =
  | "1-brand"
  | "2-plan"
  | "3-competitors"
  | "4-social"
  | "5-plays"
  | "6-creative"
  | "7-calendar";

export interface WizardStageMeta {
  slug: WizardStageSlug;
  num: number;
  title: string;
  subtitle: string;
  narrativeBeat: string;
  nextLabel: string;
  prevLabel: string | null;
  /** Returns true once the backend has populated whatever data this stage needs to render. */
  ready: (run: Run | null) => boolean;
}

export const WIZARD_STAGES: WizardStageMeta[] = [
  {
    slug: "1-brand",
    num: 1,
    title: "Brand Read",
    subtitle: "Apify reads your site. We correct anything wrong.",
    narrativeBeat: "First, we read you.",
    nextLabel: "Next · Build the plan",
    prevLabel: null,
    ready: (r) => !!r?.product_profile,
  },
  {
    slug: "2-plan",
    num: 2,
    title: "Marketing Plan",
    subtitle: "Drafting the GTM playbook in your voice.",
    narrativeBeat: "Now we plan.",
    nextLabel: "Next · Find competitors",
    prevLabel: "Back · Brand Read",
    ready: (r) =>
      !!r?.product_profile && !!r?.campaign && (r.campaign?.angles?.length ?? 0) > 0,
  },
  {
    slug: "3-competitors",
    num: 3,
    title: "Competitive Map",
    subtitle: "Discovered competitors, plotted by positioning.",
    narrativeBeat: "Now we find the category.",
    nextLabel: "Next · Read their socials",
    prevLabel: "Back · Marketing Plan",
    ready: (r) => (r?.competitors?.length ?? 0) >= 3,
  },
  {
    slug: "4-social",
    num: 4,
    title: "Social Intelligence",
    subtitle: "25 Apify actors across 5 platforms.",
    narrativeBeat: "Now we watch what they're doing.",
    nextLabel: "Next · GTM recommendations",
    prevLabel: "Back · Competitive Map",
    ready: (r) => (r?.social_snapshots?.length ?? 0) >= 5,
  },
  {
    slug: "5-plays",
    num: 5,
    title: "GTM Plays",
    subtitle: "Concrete angles, with the jury's vote on each.",
    narrativeBeat: "Now the jury votes.",
    nextLabel: "Next · Generate creative",
    prevLabel: "Back · Social Intelligence",
    ready: (r) =>
      !!r?.campaign && (r.verdicts?.length ?? 0) > 0,
  },
  {
    slug: "6-creative",
    num: 6,
    title: "Creative",
    subtitle: "Generated ad creative for every accepted play.",
    narrativeBeat: "Now we make the work.",
    nextLabel: "Next · Schedule the launch",
    prevLabel: "Back · GTM Plays",
    ready: (r) => {
      if (!r?.campaign) return false;
      const hasAssets = (r.campaign.angles ?? []).some(
        (a) => (a.asset_ids?.length ?? 0) > 0,
      );
      return hasAssets;
    },
  },
  {
    slug: "7-calendar",
    num: 7,
    title: "Content Calendar",
    subtitle: "Two weeks, scheduled across channels.",
    narrativeBeat: "Now we time it.",
    nextLabel: "Finish · View command center",
    prevLabel: "Back · Creative",
    ready: (r) => !!r?.calendar && (r.calendar?.slots?.length ?? 0) > 0,
  },
];

export function getStageBySlug(slug: string): WizardStageMeta | null {
  return WIZARD_STAGES.find((s) => s.slug === slug) ?? null;
}

export function getNextStage(slug: WizardStageSlug): WizardStageMeta | null {
  const idx = WIZARD_STAGES.findIndex((s) => s.slug === slug);
  return idx >= 0 && idx < WIZARD_STAGES.length - 1
    ? WIZARD_STAGES[idx + 1]
    : null;
}

export function getPrevStage(slug: WizardStageSlug): WizardStageMeta | null {
  const idx = WIZARD_STAGES.findIndex((s) => s.slug === slug);
  return idx > 0 ? WIZARD_STAGES[idx - 1] : null;
}

export function runPath(runId: string, slug?: WizardStageSlug): string {
  if (!slug) return `/run/${encodeURIComponent(runId)}`;
  return `/run/${encodeURIComponent(runId)}/${slug}`;
}
