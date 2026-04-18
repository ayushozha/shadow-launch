"use client";

import type { PersonaId, PersonaReaction } from "@/lib/types";
import { PERSONA_LABELS, PERSONA_WEIGHTS } from "@/lib/types";

const PERSONA_ORDER: PersonaId[] = [
  "marketing_vp",
  "cfo_skeptic",
  "engineering_lead",
  "target_end_user",
  "social_media_manager",
  "pr_brand_authority",
];

const PERSONA_INITIALS: Record<PersonaId, string> = {
  marketing_vp: "M",
  cfo_skeptic: "C",
  engineering_lead: "E",
  target_end_user: "U",
  social_media_manager: "S",
  pr_brand_authority: "P",
};

interface Props {
  /** Round-1 reactions scoped to this angle. */
  reactions: PersonaReaction[];
}

function scoreColor(s: number): string {
  if (s > 0.05) return "var(--phosphor)";
  if (s < -0.05) return "var(--accent)";
  return "var(--muted)";
}

/**
 * Inline 6-persona score strip for one angle. Chips render the persona
 * initial and signed score from `round=1` reactions. Beneath, the
 * weighted-average consensus (using PERSONA_WEIGHTS) is shown.
 *
 * When no reactions exist for this angle yet, returns null so the
 * caller can render its own "jury deliberating" placeholder.
 */
export function JuryPollStrip({ reactions }: Props) {
  if (reactions.length === 0) return null;

  // latest reaction per persona (in case multiple rounds/duplicates)
  const latestByPersona = new Map<PersonaId, PersonaReaction>();
  for (const r of reactions) {
    latestByPersona.set(r.persona_id, r);
  }

  let weightedSum = 0;
  let weightTotal = 0;
  for (const [p, r] of latestByPersona) {
    const w = PERSONA_WEIGHTS[p] ?? 0;
    weightedSum += r.score * w;
    weightTotal += w;
  }
  const consensus = weightTotal > 0 ? weightedSum / weightTotal : 0;
  const tone =
    consensus > 0.2
      ? "strong"
      : consensus > 0.05
        ? "favorable"
        : consensus < -0.2
          ? "dissenting"
          : consensus < -0.05
            ? "cautious"
            : "mixed";

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Jury verdict
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {PERSONA_ORDER.map((p) => {
          const r = latestByPersona.get(p);
          if (!r) {
            return (
              <span
                key={p}
                title={`${PERSONA_LABELS[p]} · no vote`}
                className="inline-flex items-baseline gap-1 border border-dashed border-[var(--rule)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]"
              >
                <span>{PERSONA_INITIALS[p]}</span>
                <span>—</span>
              </span>
            );
          }
          const color = scoreColor(r.score);
          return (
            <span
              key={p}
              title={`${PERSONA_LABELS[p]} · ${r.quote}`}
              className="inline-flex items-baseline gap-1 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color, borderColor: color }}
            >
              <span>{PERSONA_INITIALS[p]}</span>
              <span>
                {r.score >= 0 ? "+" : ""}
                {r.score.toFixed(2)}
              </span>
            </span>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Consensus{" "}
        <span style={{ color: scoreColor(consensus) }}>
          {consensus >= 0 ? "+" : ""}
          {consensus.toFixed(2)}
        </span>{" "}
        · {tone}
      </p>
    </div>
  );
}
