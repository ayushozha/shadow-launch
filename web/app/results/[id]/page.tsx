import Link from "next/link";
import { getRun } from "@/lib/api";
import type { Run, ImageAsset } from "@/lib/types";
import ProductProfileCard from "@/components/results/ProductProfileCard";
import CompetitorGrid from "@/components/results/CompetitorGrid";
import SocialTractionChart from "@/components/results/SocialTractionChart";
import CampaignProposal from "@/components/results/CampaignProposal";
import CreativeGallery from "@/components/results/CreativeGallery";
import ContentCalendarCompact from "@/components/results/ContentCalendarCompact";
import PersonaDebateSummary from "@/components/results/PersonaDebateSummary";
import VerdictList from "@/components/results/VerdictList";
import KalibrSummary from "@/components/results/KalibrSummary";
import ExportActions from "@/components/results/ExportActions";

// v2 · results-v2 (docs/features.md §5). Server component. Real API only —
// no cache fallback. Next 16 `params` is a Promise.
type PageParams = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: { params: PageParams }) {
  const { id: runId } = await params;

  let run: Run | null = null;
  let loadError: string | null = null;
  try {
    run = await getRun(runId);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  if (loadError || !run) {
    return (
      <main className="relative z-[1]">
        <div className="border-b border-[var(--rule)] px-5 py-4 md:px-10">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3">
            <Link
              href="/"
              className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] hover:text-[var(--ink)]"
            >
              ← shadow launch
            </Link>
          </div>
        </div>
        <section className="mx-auto max-w-3xl px-6 py-24 font-serif">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
            Run unavailable
          </p>
          <h1 className="mt-3 font-serif text-[48px] leading-[1.02] tracking-[-0.02em] text-[var(--ink)]">
            Run not found or still in progress.
          </h1>
          <p className="mt-5 font-serif text-[17px] text-[var(--ink-soft)]">
            Could not load <code className="font-mono">{runId}</code> from the
            backend. It may still be running, or the id may be wrong.
          </p>
          {loadError && (
            <pre className="mt-6 max-w-full overflow-x-auto border border-[var(--rule)] bg-[rgba(255,252,244,0.4)] p-4 font-mono text-[11px] text-[var(--ink-soft)]">
              {loadError}
            </pre>
          )}
          <Link
            href="/"
            className="mt-8 inline-block border border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--paper)] transition-colors hover:bg-[var(--accent)] hover:border-[var(--accent)]"
          >
            start a new run
          </Link>
        </section>
      </main>
    );
  }

  // Derive the asset list from the campaign angles. Assets themselves don't
  // live at the top of the Run in this schema; pull from embedded angles.
  const assets: ImageAsset[] = collectAssetsFromCampaign(run);

  return (
    <main className="relative z-[1]">
      {/* Section 1 — Meta bar */}
      <div className="border-b border-[var(--rule)] bg-[rgba(236,228,210,0.92)] px-5 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] hover:text-[var(--ink)]"
            >
              ← shadow launch
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
              /
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]">
              RUN · {run.run_id}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              · {fmtTs(run.created_at)}
              {run.completed_at ? ` → ${fmtTs(run.completed_at)}` : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]">
              cost · ${run.cost_usd_total.toFixed(3)}
            </span>
            {run.kalibr_trace_capsule_id && (
              <a
                href={`https://app.kalibr.ai/capsule/${encodeURIComponent(run.kalibr_trace_capsule_id)}`}
                target="_blank"
                rel="noreferrer"
                className="border border-[var(--accent)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--paper)]"
              >
                trace capsule ↗
              </a>
            )}
            <Link
              href={`/run/${run.run_id}`}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] hover:text-[var(--accent)]"
            >
              replay live →
            </Link>
          </div>
        </div>
      </div>

      {/* Section 2 — Product profile */}
      {run.product_profile && <ProductProfileCard profile={run.product_profile} />}

      {/* Section 3 — Competitor grid */}
      {run.competitors.length > 0 && (
        <CompetitorGrid runId={run.run_id} competitors={run.competitors} />
      )}

      {/* Section 4 — Social traction */}
      {run.social_snapshots.length > 0 && (
        <SocialTractionChart
          competitors={run.competitors}
          snapshots={run.social_snapshots}
        />
      )}

      {/* Section 5 — Campaign proposal */}
      {run.campaign && run.campaign.angles.length > 0 && (
        <CampaignProposal campaign={run.campaign} competitors={run.competitors} />
      )}

      {/* Section 6 — Creative gallery */}
      {run.campaign && assets.length > 0 && (
        <CreativeGallery
          runId={run.run_id}
          campaign={run.campaign}
          assets={assets}
          verdicts={run.verdicts}
        />
      )}

      {/* Section 7 — Calendar compact */}
      {run.calendar && run.calendar.slots.length > 0 && (
        <ContentCalendarCompact runId={run.run_id} calendar={run.calendar} />
      )}

      {/* Section 8 — Persona debate summary */}
      {run.reactions.length > 0 && (
        <PersonaDebateSummary runId={run.run_id} reactions={run.reactions} />
      )}

      {/* Section 9 — Verdict list */}
      {run.verdicts.length > 0 && <VerdictList verdicts={run.verdicts} />}

      {/* Section 10 — Kalibr summary */}
      <KalibrSummary
        events={run.kalibr_events}
        costTotal={run.cost_usd_total}
        capsuleId={run.kalibr_trace_capsule_id}
      />

      {/* Section 11 — Export + re-run actions */}
      <ExportActions run={run} />
    </main>
  );
}

function fmtTs(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function collectAssetsFromCampaign(run: Run): ImageAsset[] {
  // Backend may deliver assets either embedded in angles OR as a separate
  // collection. Types only allow asset_ids on the angle; the ImageAsset
  // records typically arrive as a sibling field (e.g. `assets`) on the Run.
  // We accept either shape via a loose probe, since the Run contract here
  // doesn't pin it down.
  const loose = run as unknown as { assets?: ImageAsset[] };
  if (Array.isArray(loose.assets)) return loose.assets;
  return [];
}
