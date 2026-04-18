"use client";

import { useMemo } from "react";

import type { Channel, Run } from "@/lib/types";

import { ChannelMixBar } from "./ChannelMixBar";
import { PillarExpand } from "./PillarExpand";
import { PlanSection } from "./PlanSection";

interface Props {
  run: Run;
  ready: boolean;
}

const CHANNEL_LABELS: Record<Channel, string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  blog: "Blog",
  email: "Email",
  youtube: "YouTube",
};

const BUDGET_BANDS: Record<"lean" | "standard" | "premium", string> = {
  lean: "Lean · ~$5K / month pilot to validate the first wedge.",
  standard: "Standard · ~$25K / month to staff 90 days across the core channels.",
  premium: "Premium · ~$75K / month to signal at category scale.",
};

/**
 * Marketing Plan document — 5 numbered sections synthesized from
 * `run.product_profile` + `run.campaign.angles`. No dummy data; every value
 * is derived from the real Run. See `docs/demo-flow.md` §4 for the spec.
 */
export function PlanDocument({ run }: Props) {
  const profile = run.product_profile;
  const angles = run.campaign?.angles ?? [];
  const primaryAngle = angles[0];

  // --- 01 · POSITIONING ----------------------------------------------------
  // Prefer the campaign's first-angle positioning; fall back to the first
  // positioning_claim from research if the campaign hasn't landed yet.
  const positioning =
    primaryAngle?.positioning?.trim() ||
    profile?.positioning_claims?.[0]?.trim() ||
    "";

  // --- 02 · PILLARS --------------------------------------------------------
  // Merge up to 3 tone descriptors with up to 2 angle hooks, dedupe by
  // lowercase, cap at 5. This keeps the list grounded in both the brand's
  // voice and the campaign's sharpest lines.
  const pillars = useMemo(() => {
    const toneSlice = (profile?.tone_inventory ?? []).slice(0, 3);
    const hookSlice = angles.slice(0, 2).map((a) => a.hook);
    const seen = new Set<string>();
    const merged: { label: string; rationale?: string }[] = [];
    for (const t of toneSlice) {
      const key = t.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push({
        label: capitalize(t),
        rationale: profile
          ? `Pulled from the brand dossier's tone inventory — ${profile.brand_name} consistently reads as ${t.toLowerCase()} across its surfaces.`
          : undefined,
      });
    }
    for (const h of hookSlice) {
      const key = h.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push({
        label: h,
        rationale: "Carried forward from the campaign's top-ranked angle.",
      });
    }
    return merged.slice(0, 5);
  }, [profile, angles]);

  // --- 03 · CHANNEL MIX ----------------------------------------------------
  // Aggregate channel counts across every angle's channel_mix, convert to
  // percentages, sort descending.
  const channelMix = useMemo(() => {
    const counts = new Map<Channel, number>();
    for (const a of angles) {
      for (const c of a.channel_mix ?? []) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    const total = Array.from(counts.values()).reduce((s, n) => s + n, 0);
    if (total === 0) return [];
    const entries = Array.from(counts.entries())
      .map(([channel, n]) => ({
        channel,
        percent: Math.round((n / total) * 100),
      }))
      .sort((a, b) => b.percent - a.percent);
    return entries;
  }, [angles]);

  // --- 04 · NORTH-STAR METRIC ---------------------------------------------
  // If the first angle's rationale names a metric, surface it; otherwise
  // construct a simple, honest string from the product category. Never
  // fabricate specific numbers.
  const northStar = useMemo(() => {
    const rationale = primaryAngle?.rationale ?? "";
    const metric = extractMetricPhrase(rationale);
    if (metric) return metric;
    const category = profile?.category?.trim();
    return category
      ? `Weekly active ${category.toLowerCase()} teams.`
      : "Weekly active teams.";
  }, [primaryAngle, profile]);

  // --- 05 · BUDGET GUIDANCE -----------------------------------------------
  const budgetGuidance = useMemo(() => {
    const band = run.input?.budget_constraint;
    if (band && BUDGET_BANDS[band]) return BUDGET_BANDS[band];
    return "Scales with acceptance rate of GTM plays.";
  }, [run.input]);

  const brandName = profile?.brand_name ?? "This brand";

  return (
    <div className="flex flex-col">
      {/* Document header */}
      <header className="flex flex-col gap-2 border-b border-[var(--rule)] pb-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
          The plan · {brandName}
        </span>
        <h2
          className="font-serif text-[32px] leading-[1.05] tracking-[-0.01em] text-[var(--ink)] md:text-[40px]"
          style={{ fontVariationSettings: '"opsz" 144, "wght" 420' }}
        >
          A GTM playbook, drafted in{" "}
          <span className="italic">{brandName}&apos;s</span> voice.
        </h2>
        {profile?.one_liner && (
          <p className="font-serif text-[15px] italic text-[var(--muted)]">
            {profile.one_liner}
          </p>
        )}
      </header>

      {/* 01 · POSITIONING */}
      <PlanSection
        number="01"
        title="Positioning"
        primaryAction="Use this"
        secondaryAction="Try another"
      >
        {positioning ? (
          <p className="font-serif text-[22px] leading-[1.35] text-[var(--ink)] md:text-[26px]">
            &ldquo;{positioning}&rdquo;
          </p>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            No positioning yet — campaign not landed.
          </p>
        )}
      </PlanSection>

      {/* 02 · PILLARS */}
      <PlanSection
        number="02"
        title="Pillars"
        primaryAction="Use this"
        secondaryAction="Try another"
      >
        {pillars.length > 0 ? (
          <div className="flex flex-col">
            {pillars.map((p, i) => (
              <PillarExpand
                key={`${p.label}-${i}`}
                label={p.label}
                rationale={p.rationale}
              />
            ))}
          </div>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Not enough tone or angle data to derive pillars yet.
          </p>
        )}
      </PlanSection>

      {/* 03 · CHANNEL MIX */}
      <PlanSection
        number="03"
        title="Channel mix"
        primaryAction="Use this"
        secondaryAction="Try another"
      >
        {channelMix.length > 0 ? (
          <div className="flex flex-col gap-3">
            {channelMix.map((row, i) => (
              <ChannelMixBar
                key={row.channel}
                channel={CHANNEL_LABELS[row.channel] ?? row.channel}
                percent={row.percent}
                index={i}
              />
            ))}
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Aggregated from {angles.length} angle
              {angles.length === 1 ? "" : "s"}.
            </p>
          </div>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            No channel mix yet — angles haven&apos;t declared one.
          </p>
        )}
      </PlanSection>

      {/* 04 · NORTH-STAR METRIC */}
      <PlanSection number="04" title="North-star metric">
        <p className="font-serif text-[20px] leading-[1.4] text-[var(--ink)]">
          {northStar}
        </p>
      </PlanSection>

      {/* 05 · BUDGET GUIDANCE */}
      <PlanSection number="05" title="Budget guidance">
        <p className="font-serif text-[17px] leading-[1.55] text-[var(--ink)]">
          {budgetGuidance}
        </p>
        {!run.input?.budget_constraint && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            No budget constraint provided — bands omitted.
          </p>
        )}
      </PlanSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t[0].toUpperCase() + t.slice(1);
}

/**
 * Heuristic: scan a rationale string for a metric-shaped phrase. We look for
 * common GTM metric keywords and return the sentence they appear in. If none
 * match, return null and the caller falls back to a category-derived string.
 * Deliberately conservative — we'd rather fall back than invent.
 */
function extractMetricPhrase(rationale: string): string | null {
  if (!rationale) return null;
  const keywords = [
    "weekly active",
    "monthly active",
    "daily active",
    "signups",
    "sign-ups",
    "activation",
    "retention",
    "conversion",
    "arr",
    "mrr",
    "pipeline",
    "qualified leads",
    "nps",
    "churn",
  ];
  const sentences = rationale.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (keywords.some((k) => lower.includes(k))) {
      return s.trim();
    }
  }
  return null;
}
