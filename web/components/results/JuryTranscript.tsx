"use client";

import type {
  Deliberation,
  Dissent,
  JurorId,
  JurorReaction,
  Wedge,
  WedgeVerdict,
} from "@/lib/types";

// Jury transcript section. 4 jurors × 3 wedges grid, winner column highlighted.
// Dissent log rendered below in its own panel.

const JUROR_ORDER: JurorId[] = ["champion", "economic", "blocker", "skeptic"];

const JUROR_META: Record<
  JurorId,
  { name: string; role: string; initial: string; weight: number }
> = {
  champion: { name: "Champion", role: "VP Engineering", initial: "C", weight: 0.2 },
  economic: { name: "Economic Buyer", role: "CFO", initial: "E", weight: 0.35 },
  blocker: { name: "Technical Blocker", role: "Staff Platform Eng", initial: "B", weight: 0.25 },
  skeptic: { name: "Skeptic", role: "Head of PMO", initial: "S", weight: 0.2 },
};

export default function JuryTranscript({
  deliberation,
  wedges,
  winner,
}: {
  deliberation: Deliberation;
  wedges: Wedge[];
  winner: WedgeVerdict;
}) {
  // Look up a reaction by juror+wedge pair.
  const byKey = new Map<string, JurorReaction>();
  for (const r of deliberation.reactions) {
    byKey.set(`${r.juror_id}:${r.wedge_id}`, r);
  }

  return (
    <section className="border-b border-[var(--rule)] bg-[var(--paper-deep)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_3fr] md:items-baseline">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §02 · Jury transcript
          </span>
          <h2
            className="font-serif text-[clamp(30px,4vw,52px)] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]"
            style={{ fontVariationSettings: '"opsz" 60, "wght" 380, "SOFT" 40' }}
          >
            Four buyers, three wedges, twelve on-the-record reactions.
          </h2>
        </div>

        {/* Grid: rows = jurors, cols = wedges. Winner column highlighted. */}
        <div className="overflow-x-auto">
          <div className="grid min-w-[960px] grid-cols-[180px_repeat(3,minmax(0,1fr))] border border-[var(--rule)] bg-[rgba(255,252,244,0.5)]">
            {/* header row */}
            <div className="border-b border-[var(--rule)] p-4" />
            {wedges.map((w) => {
              const isWinner = w.id === winner.wedge_id;
              return (
                <div
                  key={w.id}
                  className={`border-b border-l border-[var(--rule)] p-4 ${
                    isWinner ? "bg-[var(--ink)] text-[var(--paper)]" : ""
                  }`}
                >
                  <p
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                      isWinner ? "text-[var(--accent)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {w.id.toUpperCase()} {isWinner && "· winner"}
                  </p>
                  <p
                    className={`mt-2 font-serif text-[18px] leading-[1.15] tracking-[-0.01em] ${
                      isWinner ? "text-[var(--paper)]" : "text-[var(--ink)]"
                    }`}
                  >
                    {w.headline}
                  </p>
                </div>
              );
            })}

            {/* juror rows */}
            {JUROR_ORDER.map((jid) => {
              const meta = JUROR_META[jid];
              return (
                <Row key={jid} jurorId={jid} meta={meta}>
                  {wedges.map((w) => {
                    const rxn = byKey.get(`${jid}:${w.id}`);
                    const isWinner = w.id === winner.wedge_id;
                    return (
                      <Cell
                        key={w.id}
                        reaction={rxn}
                        jurorInitial={meta.initial}
                        wedgeId={w.id}
                        isWinner={isWinner}
                      />
                    );
                  })}
                </Row>
              );
            })}
          </div>
        </div>

        {/* Dissent log */}
        <DissentLog entries={deliberation.dissent_log ?? []} />
      </div>
    </section>
  );
}

function Row({
  jurorId,
  meta,
  children,
}: {
  jurorId: JurorId;
  meta: { name: string; role: string; initial: string; weight: number };
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="border-b border-[var(--rule-soft)] p-4 last:border-b-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] font-serif text-[16px] italic text-[var(--paper)]">
            {meta.initial}
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {jurorId}
            </p>
            <p className="font-serif text-[15px] leading-tight text-[var(--ink)]">
              {meta.name}
            </p>
          </div>
        </div>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
          {meta.role} · weight {meta.weight.toFixed(2)}
        </p>
      </div>
      {children}
    </>
  );
}

function Cell({
  reaction,
  jurorInitial,
  wedgeId,
  isWinner,
}: {
  reaction: JurorReaction | undefined;
  jurorInitial: string;
  wedgeId: string;
  isWinner: boolean;
}) {
  if (!reaction) {
    return (
      <div
        className={`border-b border-l border-[var(--rule-soft)] p-4 ${
          isWinner ? "bg-[rgba(227,51,18,0.06)]" : ""
        }`}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          no reaction
        </p>
      </div>
    );
  }

  const scoreColor =
    reaction.score > 0.3
      ? "text-[var(--phosphor)]"
      : reaction.score < -0.05
        ? "text-[var(--accent)]"
        : "text-[var(--ink-soft)]";

  return (
    <div
      className={`flex flex-col gap-3 border-b border-l border-[var(--rule-soft)] p-4 ${
        isWinner ? "bg-[rgba(227,51,18,0.06)]" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
          {jurorInitial} · {wedgeId}
        </span>
        <span
          className={`font-mono text-[13px] tracking-[0.04em] ${scoreColor}`}
        >
          {reaction.score >= 0 ? "+" : ""}
          {reaction.score.toFixed(2)}
        </span>
      </div>
      <blockquote className="font-serif text-[15px] italic leading-[1.45] text-[var(--ink-soft)]">
        <span className="mr-1 text-[var(--accent)]">&ldquo;</span>
        {reaction.quote}
        <span className="ml-1 text-[var(--accent)]">&rdquo;</span>
      </blockquote>
      {reaction.top_objection && (
        <p className="border-t border-dashed border-[var(--rule-soft)] pt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Objection · {reaction.top_objection}
        </p>
      )}
    </div>
  );
}

function DissentLog({ entries }: { entries: Dissent[] }) {
  if (!entries.length) return null;
  return (
    <div className="border border-[var(--accent)] bg-[rgba(227,51,18,0.05)] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-dashed border-[var(--rule-soft)] pb-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
          Dissent log · {entries.length} objection{entries.length === 1 ? "" : "s"} survive on the winner
        </p>
        <p className="font-serif text-[13px] italic text-[var(--muted)]">
          these come back, if you don&rsquo;t answer them
        </p>
      </div>
      <ul className="mt-4 flex flex-col divide-y divide-[var(--rule-soft)]">
        {entries.map((d, i) => {
          const sev = (d as Dissent & { severity?: string }).severity;
          return (
            <li key={i} className="flex gap-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                {String(i + 1).padStart(2, "0")} · {d.juror_id}
              </span>
              <p className="flex-1 font-serif text-[15px] leading-[1.5] text-[var(--ink-soft)]">
                {d.objection}
              </p>
              {sev && (
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  {sev}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
