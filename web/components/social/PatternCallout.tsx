"use client";

import { useMemo } from "react";

import type { Competitor, Platform, SocialSnapshot } from "@/lib/types";

const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  twitter: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

interface Props {
  snapshots: SocialSnapshot[];
  competitors: Competitor[];
}

interface Pattern {
  id: string;
  headline: string;
  detail?: string;
}

/**
 * Derive up to 3 patterns from real snapshot data:
 *  1. Platform with highest average engagement across competitors.
 *  2. Platform with lowest average engagement across competitors.
 *  3. Competitor that outperforms its peers on a specific platform by Nx.
 *
 * If fewer than 5 ok snapshots are available, show a "gathering signal"
 * placeholder so patterns don't surface prematurely on flaky data.
 */
export function PatternCallout({ snapshots, competitors }: Props) {
  const patterns = useMemo<Pattern[]>(() => {
    const ok = snapshots.filter(
      (s) => s.status === "ok" && s.avg_engagement_rate != null,
    );
    if (ok.length < 5) return [];

    const compById = new Map(competitors.map((c) => [c.competitor_id, c]));

    // Average engagement per platform
    const byPlatform = new Map<Platform, number[]>();
    for (const s of ok) {
      const arr = byPlatform.get(s.platform) ?? [];
      arr.push(s.avg_engagement_rate as number);
      byPlatform.set(s.platform, arr);
    }

    const platformAvgs: Array<{ platform: Platform; avg: number; n: number }> = [];
    for (const [platform, rates] of byPlatform.entries()) {
      if (rates.length < 2) continue;
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      platformAvgs.push({ platform, avg, n: rates.length });
    }
    platformAvgs.sort((a, b) => b.avg - a.avg);

    const out: Pattern[] = [];

    if (platformAvgs.length > 0) {
      const top = platformAvgs[0];
      out.push({
        id: `top-${top.platform}`,
        headline: `${PLATFORM_LABELS[top.platform]} is where competitors are winning.`,
        detail: `Category average ${(top.avg * 100).toFixed(1)}% engagement across ${top.n} actors.`,
      });
    }

    if (platformAvgs.length > 1) {
      const bot = platformAvgs[platformAvgs.length - 1];
      out.push({
        id: `bot-${bot.platform}`,
        headline: `${PLATFORM_LABELS[bot.platform]} is a rounding error across the category.`,
        detail: `${(bot.avg * 100).toFixed(1)}% average engagement. The channel is cold.`,
      });
    }

    // Find anomalous competitor/platform outperformer
    let best: {
      competitor: Competitor;
      platform: Platform;
      rate: number;
      ratio: number;
    } | null = null;

    for (const s of ok) {
      const rate = s.avg_engagement_rate as number;
      const platformAvg = platformAvgs.find((p) => p.platform === s.platform);
      if (!platformAvg || platformAvg.avg <= 0) continue;
      const ratio = rate / platformAvg.avg;
      if (ratio < 1.6) continue; // needs to be meaningfully above the mean
      const comp = compById.get(s.competitor_id);
      if (!comp) continue;
      if (!best || ratio > best.ratio) {
        best = { competitor: comp, platform: s.platform, rate, ratio };
      }
    }

    if (best) {
      out.push({
        id: `out-${best.competitor.competitor_id}-${best.platform}`,
        headline: `${best.competitor.name} outperforms on ${PLATFORM_LABELS[best.platform]} by ${best.ratio.toFixed(1)}x.`,
        detail: `${(best.rate * 100).toFixed(1)}% engagement vs. a category average of ${(
          (best.rate / best.ratio) *
          100
        ).toFixed(1)}%.`,
      });
    }

    return out.slice(0, 3);
  }, [snapshots, competitors]);

  if (patterns.length === 0) {
    return (
      <div className="mt-10 border-t border-[var(--rule)] pt-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          Patterns
        </span>
        <p className="mt-3 font-serif text-[15px] italic text-[var(--muted)]">
          Gathering signal… patterns surface as actors finish.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 border-t border-[var(--rule)] pt-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
        Patterns
      </span>
      <ol className="mt-4 flex flex-col gap-4">
        {patterns.map((p, i) => (
          <li
            key={p.id}
            className="reveal in flex gap-4"
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] pt-1 w-6 shrink-0">
              0{i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-serif text-[17px] leading-[1.4] text-[var(--ink)]">
                {p.headline}
              </p>
              {p.detail && (
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {p.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
