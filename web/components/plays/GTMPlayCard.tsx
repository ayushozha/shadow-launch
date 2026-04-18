"use client";

import type {
  CampaignAngle,
  Competitor,
  PersonaReaction,
  Verdict,
} from "@/lib/types";
import { PERSONA_LABELS } from "@/lib/types";

import { AcceptModifyReject } from "./AcceptModifyReject";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EvidenceTrail } from "./EvidenceTrail";
import { JuryPollStrip } from "./JuryPollStrip";

interface Props {
  runId: string;
  index: number;
  angle: CampaignAngle;
  competitors: Competitor[];
  verdict: Verdict | null;
  reactions: PersonaReaction[];
}

/**
 * One GTM angle card. Header shows numbered Fraunces-italic hook and a
 * confidence badge derived from the matching verdict. Body: positioning
 * claim, rationale, evidence, jury poll strip, dissent banner (if
 * verdict.action_required), and Accept/Modify/Reject actions.
 */
export function GTMPlayCard({
  runId,
  index,
  angle,
  competitors,
  verdict,
  reactions,
}: Props) {
  const number = index.toString().padStart(2, "0");
  const hasReactions = reactions.length > 0;
  const dissent = verdict?.action_required === true;
  const dissentCount = verdict?.dissenting_personas?.length ?? 0;

  return (
    <article
      id={`angle-${angle.angle_id}`}
      className="flex flex-col gap-5 border-t border-[var(--rule)] py-8 first:border-t-0 first:pt-2"
    >
      {/* Header: Angle NN · hook · confidence */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Angle {number}
          </span>
          <h3
            className="mt-1 font-serif text-[24px] italic leading-[1.15] tracking-tight text-[var(--ink)] md:text-[28px]"
            style={{ fontVariationSettings: '"opsz" 48, "wght" 420, "SOFT" 40' }}
          >
            {angle.hook}
          </h3>
        </div>
        <div className="flex flex-shrink-0 items-start">
          <ConfidenceBadge score={verdict?.consensus_score ?? null} />
        </div>
      </header>

      {/* Positioning + rationale */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Positioning
          </p>
          <p className="mt-1 font-serif text-[16px] leading-[1.5] text-[var(--ink)]">
            “{angle.positioning}”
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Rationale
          </p>
          <p className="mt-1 font-serif text-[14.5px] leading-[1.55] text-[var(--ink-soft)]">
            {angle.rationale}
          </p>
        </div>
        {angle.channel_mix.length > 0 && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Channels
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {angle.channel_mix.map((c) => (
                <span
                  key={c}
                  className="border border-[var(--rule)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evidence */}
      <EvidenceTrail
        runId={runId}
        competitorIds={angle.evidence_competitor_ids}
        competitors={competitors}
      />

      {/* Jury poll strip — or "deliberating" placeholder */}
      {hasReactions ? (
        <JuryPollStrip reactions={reactions} />
      ) : (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Jury verdict
          </p>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Jury is still deliberating…
          </p>
        </div>
      )}

      {/* Dissent banner */}
      {dissent && (
        <div
          role="status"
          className="border-l-2 border-[var(--accent)] bg-[rgba(227,51,18,0.04)] px-3 py-2"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent-ink)]">
            ◆ Action required
          </p>
          <p className="mt-0.5 font-serif text-[13.5px] italic leading-snug text-[var(--ink-soft)]">
            {dissentCount} persona{dissentCount === 1 ? "" : "s"} dissent
            {dissentCount === 1 ? "s" : ""} — review objections before launch
            {verdict?.dissenting_personas && verdict.dissenting_personas.length > 0
              ? ` (${verdict.dissenting_personas
                  .map((p) => PERSONA_LABELS[p])
                  .join(", ")})`
              : ""}
            .
          </p>
        </div>
      )}

      {/* Accept / Modify / Reject */}
      <AcceptModifyReject runId={runId} angleId={angle.angle_id} />
    </article>
  );
}
