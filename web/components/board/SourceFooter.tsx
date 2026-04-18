import type { Run } from "@/lib/types";

// Source-of-truth footer for the shareable launch board. Prints the run id,
// timestamp, wedge + juror counts, and a pointer back to /results/{id}.

type Props = {
  run: Run;
};

function formatCreatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function jurorCount(run: Run): number {
  // deliberation.reactions has one entry per (juror, wedge). The distinct
  // juror count is what we want on the footer — the synthetic buyer N.
  const ids = new Set<string>();
  for (const r of run.deliberation?.reactions ?? []) ids.add(r.juror_id);
  return ids.size;
}

export default function SourceFooter({ run }: Props) {
  const created = formatCreatedAt(run.created_at);
  const wedgeCount = run.wedges?.length ?? 0;
  const jurors = jurorCount(run);

  return (
    <footer className="px-5 py-12 md:px-14 md:py-16 print:py-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="border-t border-[var(--rule)] pt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
            Source of truth
          </p>
          <p
            className="mt-3 max-w-[760px] font-serif text-[16px] leading-[1.6] text-[var(--ink-soft)]"
            style={{ fontVariationSettings: '"opsz" 18, "wght" 400' }}
          >
            Generated from Shadow Launch run{" "}
            <span className="font-mono text-[13px] tracking-[0.04em] text-[var(--ink)]">
              {run.run_id}
            </span>{" "}
            on{" "}
            <span className="font-mono text-[13px] tracking-[0.04em] text-[var(--ink)]">
              {created}
            </span>
            . Based on{" "}
            <span className="text-[var(--ink)]">
              {wedgeCount} {wedgeCount === 1 ? "wedge" : "wedges"}
            </span>{" "}
            across{" "}
            <span className="text-[var(--ink)]">
              {jurors} synthetic {jurors === 1 ? "buyer" : "buyers"}
            </span>
            . Shareable at{" "}
            <a
              href={`/results/${run.run_id}`}
              className="font-mono text-[13px] text-[var(--accent)] underline decoration-[var(--rule)] underline-offset-4 hover:decoration-[var(--accent)]"
            >
              /results/{run.run_id}
            </a>
            .
          </p>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            Shadow Launch · synthetic GTM rehearsal · this board is the deliverable
          </p>
        </div>
      </div>
    </footer>
  );
}
