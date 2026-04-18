import type { PersonaId, PersonaReaction } from "@/lib/types";
import { PERSONA_LABELS } from "@/lib/types";

// One persona column within a target's row. Shows round-1 reaction + any
// round-2 rebuttals threaded underneath.

export default function DebateColumn({
  personaId,
  reactions,
}: {
  personaId: PersonaId;
  reactions: PersonaReaction[];
}) {
  const r1 = reactions.find((r) => r.round === 1);
  const r2s = reactions.filter((r) => r.round === 2);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
          {PERSONA_LABELS[personaId]}
        </span>
        {r1 && (
          <span
            className="font-serif text-[14px] italic"
            style={{
              color:
                r1.score > 0.15
                  ? "var(--phosphor)"
                  : r1.score < -0.15
                    ? "var(--accent)"
                    : "var(--ink)",
            }}
          >
            {r1.score >= 0 ? "+" : ""}
            {r1.score.toFixed(2)}
          </span>
        )}
      </div>
      {r1 ? (
        <blockquote
          className="border-l-2 bg-[rgba(255,252,244,0.6)] px-2.5 py-1.5 font-serif text-[12px] italic leading-[1.45] text-[var(--ink-soft)]"
          style={{
            borderLeftColor:
              r1.score > 0.15
                ? "var(--phosphor)"
                : r1.score < -0.15
                  ? "var(--accent)"
                  : "var(--rule)",
          }}
        >
          &ldquo;{r1.quote}&rdquo;
          {r1.top_objection && (
            <p className="mt-1 font-mono text-[9px] uppercase not-italic tracking-[0.14em] text-[var(--accent)]">
              ◆ {r1.top_objection}
            </p>
          )}
        </blockquote>
      ) : (
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
          no round-1 reaction
        </p>
      )}

      {r2s.length > 0 && (
        <div className="ml-3 flex flex-col gap-1.5 border-l border-dashed border-[var(--rule)] pl-2">
          {r2s.map((r) => (
            <div
              key={r.reaction_id}
              className="border-l-2 border-[var(--ink)] bg-[rgba(255,252,244,0.4)] px-2.5 py-1.5"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                round 2
                {r.rebuts_persona_id && (
                  <> · rebuts {PERSONA_LABELS[r.rebuts_persona_id]}</>
                )}
              </p>
              <blockquote className="mt-1 font-serif text-[12px] italic leading-[1.45] text-[var(--ink-soft)]">
                &ldquo;{r.quote}&rdquo;
              </blockquote>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
