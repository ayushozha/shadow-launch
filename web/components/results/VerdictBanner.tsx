"use client";

import type { Run, Wedge, WedgeVerdict } from "@/lib/types";

// Winning wedge banner — huge Fraunces headline, score + confidence,
// "why it won" paragraph, and the surviving objections list.
// Matches the editorial margin feel of shadow-launch.html (§ numbered header,
// Fraunces display type, paper/ink palette).

export default function VerdictBanner({ run }: { run: Run }) {
  const winner: WedgeVerdict = run.winner;
  const winningWedge: Wedge | undefined = run.wedges.find(
    (w) => w.id === winner.wedge_id,
  );
  const confidence = run.confidence ?? winner.final_score;

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §01 · Verdict
          </span>
          <span className="font-serif text-[13px] italic text-[var(--muted)]">
            the wedge that survived the room
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            {run.hero_target
              ? `${run.hero_target.toUpperCase()} · ${winner.wedge_id.toUpperCase()}`
              : winner.wedge_id.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
              Winning wedge · {winner.wedge_id}
            </p>
            <h1
              className="mt-5 font-serif text-[clamp(48px,8vw,112px)] leading-[0.92] tracking-[-0.03em] text-[var(--ink)]"
              style={{ fontVariationSettings: '"opsz" 144, "wght" 420, "SOFT" 20' }}
            >
              {winningWedge?.headline ?? "Winner"}
            </h1>
            {winningWedge?.thesis && (
              <p className="mt-8 max-w-[620px] font-serif text-[19px] leading-[1.55] text-[var(--ink-soft)]">
                {winningWedge.thesis}
              </p>
            )}
          </div>

          <aside className="flex flex-col gap-0 self-start border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] p-6">
            <Stat label="Final score" value={winner.final_score.toFixed(3)} big />
            <Stat
              label="Runner-up delta"
              value={`+${winner.runner_up_delta.toFixed(3)}`}
            />
            <Stat label="Confidence" value={confidence.toFixed(3)} />
            <Stat
              label="Runtime"
              value={
                run.runtime_seconds
                  ? `${Math.floor(run.runtime_seconds / 60)}m ${run.runtime_seconds % 60}s`
                  : "—"
              }
            />
          </aside>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Why it won
            </p>
            <p className="mt-4 font-serif text-[18px] leading-[1.6] text-[var(--ink-soft)]">
              {winner.why_it_won}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Surviving objections · {winner.surviving_objections.length}
            </p>
            <ul className="mt-4 flex flex-col divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)]">
              {winner.surviving_objections.map((obj, i) => (
                <li
                  key={i}
                  className="flex gap-3 py-3 font-serif text-[15px] leading-[1.5] text-[var(--ink-soft)]"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  big = false,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-dashed border-[var(--rule-soft)] py-3 last:border-b-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
      <span
        className={
          big
            ? "font-serif text-[36px] leading-none tracking-[-0.02em] text-[var(--accent)]"
            : "font-serif text-[18px] italic text-[var(--ink)]"
        }
      >
        {value}
      </span>
    </div>
  );
}
