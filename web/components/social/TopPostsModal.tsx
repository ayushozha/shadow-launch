"use client";

import { useEffect } from "react";

import type { Competitor, Platform, SocialSnapshot } from "@/lib/types";

const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

interface Props {
  competitor: Competitor;
  platform: Platform;
  snapshot: SocialSnapshot | null;
  onClose: () => void;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat("en-US").format(n);
}

function fmtDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function TopPostsModal({ competitor, platform, snapshot, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const topPosts = [...(snapshot?.top_posts ?? [])]
    .sort((a, b) => {
      const ea = a.engagement ?? (a.likes ?? 0) + (a.comments ?? 0) + (a.shares ?? 0);
      const eb = b.engagement ?? (b.likes ?? 0) + (b.comments ?? 0) + (b.shares ?? 0);
      return eb - ea;
    })
    .slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-[rgba(12,12,10,0.55)] backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border border-[var(--rule)] bg-[var(--paper)] shadow-[0_20px_60px_rgba(12,12,10,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--rule)] px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--accent)]">
              Top posts
            </span>
            <h2 className="font-serif text-[22px] leading-tight tracking-tight">
              {competitor.name}{" "}
              <span className="text-[var(--muted)]">· {PLATFORM_LABELS[platform]}</span>
            </h2>
            {snapshot?.handle && (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                {snapshot.handle}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center border border-[var(--rule)] font-mono text-[14px] text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {snapshot?.status !== "ok" ? (
            <p className="font-serif text-[14px] italic text-[var(--muted)]">
              {snapshot?.status === "error"
                ? `Scrape failed. ${snapshot.error_detail ?? ""}`
                : "No data available for this platform."}
            </p>
          ) : topPosts.length === 0 ? (
            <p className="font-serif text-[14px] italic text-[var(--muted)]">
              No sample posts captured for this snapshot.
            </p>
          ) : (
            <ol className="flex flex-col gap-0 divide-y divide-[var(--rule-soft)]">
              {topPosts.map((p, i) => (
                <li key={p.post_id ?? i} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--accent)]">
                      #{i + 1}
                    </span>
                    {fmtDate(p.posted_at) && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {fmtDate(p.posted_at)}
                      </span>
                    )}
                  </div>
                  {p.content && (
                    <p className="font-serif text-[15px] leading-[1.55] text-[var(--ink)]">
                      {p.content}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {p.likes != null && <span>{fmtCount(p.likes)} likes</span>}
                    {p.comments != null && <span>{fmtCount(p.comments)} comments</span>}
                    {p.shares != null && <span>{fmtCount(p.shares)} shares</span>}
                    {p.views != null && <span>{fmtCount(p.views)} views</span>}
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--ink-soft)] hover:text-[var(--accent)]"
                      >
                        open ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {snapshot && snapshot.status === "ok" && (
            <footer className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[var(--rule-soft)] pt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
              {snapshot.followers != null && (
                <span>
                  <span className="text-[var(--ink-soft)]">
                    {fmtCount(snapshot.followers)}
                  </span>{" "}
                  followers
                </span>
              )}
              {snapshot.avg_engagement_rate != null && (
                <span>
                  <span className="text-[var(--ink-soft)]">
                    {(snapshot.avg_engagement_rate * 100).toFixed(1)}%
                  </span>{" "}
                  avg engagement
                </span>
              )}
              {snapshot.posting_cadence_per_week != null && (
                <span>
                  <span className="text-[var(--ink-soft)]">
                    {snapshot.posting_cadence_per_week.toFixed(1)}
                  </span>{" "}
                  posts / wk
                </span>
              )}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
