import type { Platform, SocialSnapshot } from "@/lib/types";

// One card per social platform. Handle, followers, avg engagement rate,
// posting cadence, and top 3 posts.

const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export default function CompetitorSocialCard({
  platform,
  snapshot,
}: {
  platform: Platform;
  snapshot?: SocialSnapshot;
}) {
  const top3 = (snapshot?.top_posts ?? []).slice(0, 3);

  return (
    <div className="flex flex-col gap-4 border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]">
          {PLATFORM_LABELS[platform]}
        </h3>
        {snapshot ? (
          <span
            className="font-mono text-[9px] uppercase tracking-[0.14em]"
            style={{
              color:
                snapshot.status === "ok"
                  ? "var(--phosphor)"
                  : "var(--accent)",
            }}
          >
            ● {snapshot.status}
          </span>
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            ● not harvested
          </span>
        )}
      </div>

      {snapshot && snapshot.handle && (
        <p className="font-mono text-[11px] text-[var(--ink)]">
          {snapshot.handle}
        </p>
      )}

      <div className="grid grid-cols-3 gap-0 border border-[var(--rule-soft)]">
        <Stat
          label="Followers"
          value={snapshot?.followers != null ? fmtCount(snapshot.followers) : "—"}
        />
        <Stat
          label="Avg engmt"
          value={
            snapshot?.avg_engagement_rate != null
              ? `${(snapshot.avg_engagement_rate * 100).toFixed(2)}%`
              : "—"
          }
        />
        <Stat
          label="Posts/wk"
          value={
            snapshot?.posting_cadence_per_week != null
              ? snapshot.posting_cadence_per_week.toFixed(1)
              : "—"
          }
        />
      </div>

      {top3.length > 0 ? (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Top posts · {top3.length}
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)]">
            {top3.map((p, i) => (
              <li key={p.post_id ?? i} className="flex flex-col gap-1.5 py-3">
                {p.content && (
                  <p className="font-serif text-[14px] leading-[1.5] text-[var(--ink-soft)] line-clamp-3">
                    {p.content}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {p.likes != null && <span>{fmtCount(p.likes)} likes</span>}
                  {p.comments != null && <span>{fmtCount(p.comments)} cmts</span>}
                  {p.shares != null && <span>{fmtCount(p.shares)} shares</span>}
                  {p.views != null && <span>{fmtCount(p.views)} views</span>}
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--ink)] hover:text-[var(--accent)]"
                    >
                      open ↗
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="font-serif text-[13px] italic text-[var(--muted)]">
          No sample posts captured.
        </p>
      )}

      {snapshot?.error_detail && (
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--accent)]">
          error: {snapshot.error_detail}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-r border-[var(--rule-soft)] p-3 last:border-r-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </span>
      <span className="font-serif text-[18px] leading-none text-[var(--ink)]">
        {value}
      </span>
    </div>
  );
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
