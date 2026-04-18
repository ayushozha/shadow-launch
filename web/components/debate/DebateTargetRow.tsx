import type {
  PersonaId,
  PersonaReaction,
  TargetType,
  Verdict,
} from "@/lib/types";
import DebateColumn from "./DebateColumn";

const PERSONAS: PersonaId[] = [
  "marketing_vp",
  "cfo_skeptic",
  "engineering_lead",
  "target_end_user",
  "social_media_manager",
  "pr_brand_authority",
];

// One row per debated target. 6 persona columns side-by-side + dissent
// indicator (red if verdict.action_required).

export default function DebateTargetRow({
  targetType,
  targetId,
  label,
  reactions,
  verdict,
}: {
  targetType: TargetType;
  targetId: string;
  label?: string;
  reactions: PersonaReaction[];
  verdict?: Verdict;
}) {
  const byPersona = new Map<PersonaId, PersonaReaction[]>();
  for (const r of reactions) {
    const list = byPersona.get(r.persona_id) ?? [];
    list.push(r);
    byPersona.set(r.persona_id, list);
  }

  const dissent = verdict?.action_required ?? false;

  return (
    <article className="flex flex-col gap-4 border-t border-[var(--rule)] py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            {targetType} · {targetId}
          </p>
          {label && (
            <p className="mt-1 max-w-[760px] font-serif text-[16px] italic leading-[1.45] text-[var(--ink)]">
              {label}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {verdict && (
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]">
              consensus {verdict.consensus_score >= 0 ? "+" : ""}
              {verdict.consensus_score.toFixed(2)}
            </span>
          )}
          {dissent ? (
            <span className="border border-[var(--accent)] bg-[var(--accent)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--paper)]">
              ◆ action required
            </span>
          ) : (
            <span className="border border-[var(--phosphor)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--phosphor)]">
              ● endorsed
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {PERSONAS.map((pid) => (
          <DebateColumn
            key={pid}
            personaId={pid}
            reactions={byPersona.get(pid) ?? []}
          />
        ))}
      </div>
    </article>
  );
}
