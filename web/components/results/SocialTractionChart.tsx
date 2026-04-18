import type { Competitor, Platform, SocialSnapshot } from "@/lib/types";

// Section 4 — Social traction comparison. One row per platform; one bar per
// competitor. Pure CSS bars, no client JS. Scale is per-platform so the
// biggest bar in each row is pinned to full width (comparison within-platform
// is the useful one).

const PLATFORM_ORDER: Platform[] = [
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
  "tiktok",
];

const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export default function SocialTractionChart({
  competitors,
  snapshots,
}: {
  competitors: Competitor[];
  snapshots: SocialSnapshot[];
}) {
  const selected = competitors.filter((c) => c.selected);
  const list =
    selected.length > 0
      ? selected
      : [...competitors].sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 5);

  // index snapshots by (competitor_id, platform)
  const byKey = new Map<string, SocialSnapshot>();
  for (const s of snapshots) {
    byKey.set(`${s.competitor_id}::${s.platform}`, s);
  }

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §04 · Cross-competitor social traction
          </span>
          <span className="font-serif text-[13px] italic text-[var(--muted)]">
            engagement rate per platform · via Apify
          </span>
        </div>

        <div className="flex flex-col gap-8">
          {PLATFORM_ORDER.map((platform) => {
            const rows = list.map((c) => {
              const snap = byKey.get(`${c.competitor_id}::${platform}`);
              return {
                competitor: c,
                rate: snap?.avg_engagement_rate ?? 0,
                followers: snap?.followers ?? null,
                status: snap?.status ?? "error",
              };
            });
            const max = Math.max(0.001, ...rows.map((r) => r.rate));

            return (
              <div key={platform} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]">
                    {PLATFORM_LABELS[platform]}
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    max {(max * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {rows.map((r) => {
                    const pct = r.rate > 0 ? (r.rate / max) * 100 : 0;
                    return (
                      <div
                        key={r.competitor.competitor_id}
                        className="grid grid-cols-[minmax(90px,140px)_1fr_minmax(72px,96px)] items-center gap-3 text-[13px]"
                      >
                        <span className="truncate font-serif text-[14px] text-[var(--ink)]">
                          {r.competitor.name}
                        </span>
                        <div className="relative h-[18px] w-full border border-[var(--rule-soft)] bg-[rgba(255,252,244,0.4)]">
                          <div
                            className="h-full"
                            style={{
                              width: `${pct}%`,
                              background:
                                r.status === "ok"
                                  ? "var(--ink)"
                                  : "var(--rule)",
                            }}
                          />
                        </div>
                        <span className="text-right font-mono text-[10px] text-[var(--ink)]">
                          {r.status === "ok"
                            ? `${(r.rate * 100).toFixed(2)}%`
                            : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
