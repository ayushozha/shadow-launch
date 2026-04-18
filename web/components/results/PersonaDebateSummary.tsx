import Link from "next/link";
import type { PersonaId, PersonaReaction } from "@/lib/types";
import { PERSONA_LABELS } from "@/lib/types";

// Section 8 — Persona debate summary. Six persona cards showing the aggregate
// average score across all targets + a top quote.

const PERSONAS: PersonaId[] = [
  "marketing_vp",
  "cfo_skeptic",
  "engineering_lead",
  "target_end_user",
  "social_media_manager",
  "pr_brand_authority",
];

export default function PersonaDebateSummary({
  runId,
  reactions,
}: {
  runId: string;
  reactions: PersonaReaction[];
}) {
  const byPersona = new Map<PersonaId, PersonaReaction[]>();
  for (const r of reactions) {
    const list = byPersona.get(r.persona_id) ?? [];
    list.push(r);
    byPersona.set(r.persona_id, list);
  }

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §08 · Persona debate · 6-panel synthesis
          </span>
          <Link
            href={`/run/${runId}/debate`}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] hover:text-[var(--accent)]"
          >
            open full debate →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map((pid) => {
            const list = byPersona.get(pid) ?? [];
            const avg =
              list.length > 0
                ? list.reduce((a, r) => a + r.score, 0) / list.length
                : 0;
            // Top quote — the reaction with the most positive score (endorsement)
            // or, if everything is negative, the least-negative one.
            const topQuote = [...list].sort((a, b) => b.score - a.score)[0];
            const tone: "positive" | "negative" | "mixed" =
              avg > 0.15 ? "positive" : avg < -0.15 ? "negative" : "mixed";

            return (
              <div
                key={pid}
                className="flex flex-col gap-3 border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] p-5"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]">
                    {PERSONA_LABELS[pid]}
                  </h3>
                  <span
                    className="font-serif text-[22px] leading-none"
                    style={{
                      color:
                        tone === "positive"
                          ? "var(--phosphor)"
                          : tone === "negative"
                            ? "var(--accent)"
                            : "var(--ink)",
                    }}
                  >
                    {avg >= 0 ? "+" : ""}
                    {avg.toFixed(2)}
                  </span>
                </div>
                <div className="relative h-[4px] w-full bg-[var(--rule-soft)]">
                  <div
                    className="absolute top-0 h-full"
                    style={{
                      left: "50%",
                      width: `${Math.abs(avg) * 50}%`,
                      transform: avg < 0 ? "translateX(-100%)" : undefined,
                      background:
                        tone === "positive"
                          ? "var(--phosphor)"
                          : tone === "negative"
                            ? "var(--accent)"
                            : "var(--ink)",
                    }}
                  />
                </div>
                {topQuote ? (
                  <blockquote className="border-l-2 border-[var(--rule)] pl-3 font-serif text-[14px] italic leading-[1.5] text-[var(--ink-soft)] line-clamp-4">
                    &ldquo;{topQuote.quote}&rdquo;
                  </blockquote>
                ) : (
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    no reactions yet
                  </p>
                )}
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {list.length} reactions ·{" "}
                  {list.filter((r) => r.round === 2).length} rebuttals
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
