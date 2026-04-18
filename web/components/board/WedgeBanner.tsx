import type { Run, Wedge, WedgeVerdict } from "@/lib/types";

// Compact winning-wedge banner. The results page has VerdictBanner which is
// cinematic and takes the whole hero. This version is ~1/3 the height and
// works as a quick context strip under the board header.

type Props = {
  run: Run;
};

export default function WedgeBanner({ run }: Props) {
  const winner: WedgeVerdict = run.winner;
  const winningWedge: Wedge | undefined = run.wedges.find(
    (w) => w.id === winner.wedge_id,
  );
  const confidence =
    typeof run.confidence === "number"
      ? `${Math.round(run.confidence * 100)}%`
      : `${Math.round(winner.final_score * 100)}%`;
  const score = winner.final_score.toFixed(3);

  return (
    <section className="border-b border-[var(--rule)] bg-[var(--paper-deep)] px-5 py-10 md:px-14 md:py-12 print:bg-[var(--paper)] print:py-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted)]">
              Winning wedge · {winner.wedge_id}
            </p>
            <h2
              className="mt-3 font-serif text-[clamp(28px,4vw,48px)] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]"
              style={{ fontVariationSettings: '"opsz" 60, "wght" 420, "SOFT" 40' }}
            >
              <em className="italic text-[var(--accent)]">
                {winningWedge?.headline ?? winner.wedge_id}
              </em>
            </h2>
            {winningWedge && (
              <p className="mt-3 max-w-[780px] font-serif text-[16px] leading-[1.55] text-[var(--ink-soft)]">
                {winningWedge.thesis}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-[var(--rule)] pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--muted)]">
                Score
              </p>
              <p
                className="mt-1 font-serif text-[28px] leading-[1] text-[var(--ink)]"
                style={{ fontVariationSettings: '"opsz" 48, "wght" 500' }}
              >
                {score}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--muted)]">
                Confidence
              </p>
              <p
                className="mt-1 font-serif text-[28px] leading-[1] text-[var(--accent)]"
                style={{ fontVariationSettings: '"opsz" 48, "wght" 500' }}
              >
                {confidence}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
