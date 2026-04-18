import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { Run } from "@/lib/types";
import VerdictBanner from "@/components/results/VerdictBanner";
import JuryTranscript from "@/components/results/JuryTranscript";
import AdGrid from "@/components/results/AdGrid";
import LaunchBoardCard from "@/components/results/LaunchBoardCard";
import KalibrSummary from "@/components/results/KalibrSummary";
import ReRunExport from "@/components/results/ReRunExport";

// Shareable Results Page · spec §6.3.
// Server component: reads the pre-baked Run JSON from /public/cache at
// request time so the full transcript is in the initial HTML (matters for
// sharing and for the headline to appear before hydration).
//
// Next 16: dynamic-route params are a Promise on both server and client.
// Server components `await params`. Verified against
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md.
type PageParams = Promise<{ id: string }>;

// Opt into dynamic rendering — we want a fresh read of cache/demo-linear.json
// while iterating; once the backend ships this will flip to real fetch.
export const dynamic = "force-dynamic";

async function loadDemoRunServer(): Promise<Run> {
  // public/cache/demo-linear.json — resolved relative to the web/ project root.
  const file = path.join(process.cwd(), "public", "cache", "demo-linear.json");
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as Run;
}

export default async function ResultsPage({ params }: { params: PageParams }) {
  const { id: runId } = await params;

  // Lane A: every id routes through the pre-baked demo JSON. Unknown ids
  // still render, flagged with a "· demo fallback" hint — same pattern as
  // the Live Run View at /run/[id].
  const isDemoId = runId === "demo-linear-001" || runId.startsWith("demo-");

  let run: Run | null = null;
  let loadError: string | null = null;
  try {
    run = await loadDemoRunServer();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  if (loadError || !run) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 font-serif">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
          Results failed to load
        </p>
        <h1 className="mt-3 text-3xl text-[var(--ink)]">{loadError ?? "unknown error"}</h1>
        <p className="mt-4 text-[var(--ink-soft)]">
          Expected <code className="font-mono">cache/demo-linear.json</code> in{" "}
          <code className="font-mono">web/public/cache/</code>.
        </p>
      </main>
    );
  }

  return (
    <main className="relative z-[1]">
      {/* Top rail — back link, run id, fallback tag */}
      <div className="border-b border-[var(--rule)] px-5 py-4 md:px-10">
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
              RESULTS · {runId}
            </span>
            {!isDemoId && (
              <span
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]"
                title="unknown run id — serving demo-linear for Lane A"
              >
                · demo fallback
              </span>
            )}
          </div>
          <Link
            href={`/run/${runId}`}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] hover:text-[var(--accent)]"
          >
            replay live view →
          </Link>
        </div>
      </div>

      <VerdictBanner run={run} />
      <JuryTranscript
        deliberation={run.deliberation}
        wedges={run.wedges}
        winner={run.winner}
      />
      <AdGrid ads={run.ads} winner={run.winner} wedges={run.wedges} />
      <LaunchBoardCard board={run.launch_board} />
      <KalibrSummary events={run.kalibr_events ?? []} />
      <ReRunExport />
    </main>
  );
}
