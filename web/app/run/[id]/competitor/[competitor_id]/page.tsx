import Link from "next/link";
import { getRun } from "@/lib/api";
import type { Platform, Run } from "@/lib/types";
import CompetitorSocialCard from "@/components/competitor/CompetitorSocialCard";

// Competitor detail: header + one card per social platform + top 3 posts.
// Server component. Data comes from the full Run (so one fetch covers both
// competitor metadata + its social snapshots).

type PageParams = Promise<{ id: string; competitor_id: string }>;

export const dynamic = "force-dynamic";

const ALL_PLATFORMS: Platform[] = [
  "linkedin",
  "twitter",
  "facebook",
  "instagram",
  "tiktok",
];

export default async function CompetitorDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const { id: runId, competitor_id: competitorId } = await params;

  let run: Run | null = null;
  let loadError: string | null = null;
  try {
    run = await getRun(runId);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const competitor = run?.competitors.find(
    (c) => c.competitor_id === competitorId,
  );

  if (!run || !competitor || loadError) {
    return (
      <main className="relative z-[1]">
        <TopBar runId={runId} competitorName={null} />
        <section className="mx-auto max-w-3xl px-6 py-24 font-serif">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
            Competitor unavailable
          </p>
          <h1 className="mt-3 font-serif text-[40px] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]">
            Run not found or still in progress.
          </h1>
          <p className="mt-4 font-serif text-[16px] text-[var(--ink-soft)]">
            Could not load competitor{" "}
            <code className="font-mono">{competitorId}</code> on run{" "}
            <code className="font-mono">{runId}</code>.
          </p>
          {loadError && (
            <pre className="mt-6 max-w-full overflow-x-auto border border-[var(--rule)] bg-[rgba(255,252,244,0.4)] p-4 font-mono text-[11px] text-[var(--ink-soft)]">
              {loadError}
            </pre>
          )}
          <Link
            href={`/results/${runId}`}
            className="mt-8 inline-block border border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--paper)] transition-colors hover:bg-[var(--accent)] hover:border-[var(--accent)]"
          >
            back to results
          </Link>
        </section>
      </main>
    );
  }

  const byPlatform = new Map(
    run.social_snapshots
      .filter((s) => s.competitor_id === competitorId)
      .map((s) => [s.platform, s]),
  );

  return (
    <main className="relative z-[1]">
      <TopBar runId={runId} competitorName={competitor.name} />

      <section className="border-b border-[var(--rule)] px-5 py-14 md:px-10 md:py-20">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
              Competitor profile · {competitor.discovery_source.replace("_", " ")}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]">
              relevance · {(competitor.relevance_score * 100).toFixed(0)}%
            </span>
          </div>

          <h1
            className="font-serif text-[clamp(44px,7vw,96px)] leading-[0.95] tracking-[-0.02em] text-[var(--ink)]"
            style={{ fontVariationSettings: '"opsz" 144, "wght" 420' }}
          >
            {competitor.name}
          </h1>

          {competitor.url && (
            <a
              href={competitor.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)] hover:text-[var(--accent)]"
            >
              {competitor.url} ↗
            </a>
          )}

          <p className="mt-4 max-w-[720px] font-serif text-[19px] leading-[1.6] text-[var(--ink-soft)]">
            {competitor.positioning}
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--rule)] px-5 py-14 md:px-10 md:py-20">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
              Social presence · 5 platforms
            </span>
            <span className="font-serif text-[13px] italic text-[var(--muted)]">
              harvested via Apify
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ALL_PLATFORMS.map((p) => (
              <CompetitorSocialCard
                key={p}
                platform={p}
                snapshot={byPlatform.get(p)}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function TopBar({
  runId,
  competitorName,
}: {
  runId: string;
  competitorName: string | null;
}) {
  return (
    <div className="border-b border-[var(--rule)] bg-[rgba(236,228,210,0.92)] px-5 py-4 backdrop-blur md:px-10">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← shadow launch
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
          /
        </span>
        <Link
          href={`/results/${runId}`}
          className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          results · {runId}
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
          /
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]">
          competitor{competitorName ? ` · ${competitorName}` : ""}
        </span>
      </div>
    </div>
  );
}
