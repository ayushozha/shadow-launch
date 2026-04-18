"use client";

import { useEffect, useMemo, useState } from "react";

import type { PersonaId, PersonaReaction, Run } from "@/lib/types";
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
  run: Run | null;
  /** Optional label shown when the jury is standing by (before debate runs). */
  standbyLabel?: string;
}

/**
 * Persistent jury rail. 6 persona cards. Reactions accumulate across stages —
 * whatever lives in `run.reactions` is what we render. Before the debate
 * stage completes, the rail shows "Standing by" for each persona.
 */
export function JuryRail({ run, standbyLabel }: Props) {
  const [pinned, setPinned] = useState<PersonaId | null>(null);
  const [expanded, setExpanded] = useState<PersonaId | null>(null);

  // Restore pinned persona from localStorage per-run.
  useEffect(() => {
    if (!run) return;
    try {
      const raw = localStorage.getItem(`jury_pinned:${run.run_id}`);
      if (raw) setPinned(raw as PersonaId);
    } catch {
      // ignore storage failures
    }
  }, [run?.run_id]);

  function togglePin(p: PersonaId) {
    const next = pinned === p ? null : p;
    setPinned(next);
    try {
      if (run) {
        if (next) localStorage.setItem(`jury_pinned:${run.run_id}`, next);
        else localStorage.removeItem(`jury_pinned:${run.run_id}`);
      }
    } catch {
      // ignore
    }
  }

  const byPersona = useMemo(() => {
    const map = new Map<PersonaId, PersonaReaction[]>();
    for (const r of run?.reactions ?? []) {
      const arr = map.get(r.persona_id) ?? [];
      arr.push(r);
      map.set(r.persona_id, arr);
    }
    return map;
  }, [run?.reactions]);

  return (
    <aside
      aria-label="jury rail"
      className="flex h-full flex-col gap-3"
    >
      <header className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
          The Jury · 6 personas
        </span>
        {run?.verdicts && run.verdicts.length > 0 && (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {run.verdicts.length} verdicts
          </span>
        )}
      </header>

      <ul className="flex flex-col gap-2.5">
        {PERSONA_ORDER.map((p) => {
          const reactions = byPersona.get(p) ?? [];
          const latest = reactions[reactions.length - 1];
          const isPinned = pinned === p;
          const isExpanded = expanded === p;
          const avgScore =
            reactions.length > 0
              ? reactions.reduce((acc, r) => acc + r.score, 0) / reactions.length
              : null;

          return (
            <li key={p}>
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : p)}
                onDoubleClick={() => togglePin(p)}
                className={`w-full border text-left transition-colors ${
                  isPinned
                    ? "border-[var(--accent)] bg-[rgba(227,51,18,0.03)]"
                    : "border-[var(--rule)] bg-[rgba(255,252,244,0.4)] hover:border-[var(--ink-soft)]"
                }`}
                aria-pressed={isPinned}
                title={
                  isPinned
                    ? "Pinned · double-click to unpin"
                    : "Double-click to pin"
                }
              >
                <div className="flex items-start gap-3 p-3">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-[var(--ink)] bg-[var(--ink)] font-serif italic text-[16px] text-[var(--paper)]"
                  >
                    {PERSONA_INITIALS[p]}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-serif text-[14px] leading-tight">
                        {PERSONA_LABELS[p]}
                      </span>
                      <span className="font-mono text-[9px] tracking-[0.12em] text-[var(--muted)]">
                        w · {PERSONA_WEIGHTS[p].toFixed(2)}
                      </span>
                    </div>

                    {reactions.length === 0 ? (
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                        {standbyLabel ?? "standing by…"}
                      </p>
                    ) : (
                      <>
                        <div className="mt-1 flex items-baseline justify-between gap-2">
                          <span
                            className="font-mono text-[10px] tracking-[0.14em]"
                            style={{
                              color:
                                (latest?.score ?? 0) > 0
                                  ? "var(--phosphor)"
                                  : (latest?.score ?? 0) < 0
                                    ? "var(--accent)"
                                    : "var(--muted)",
                            }}
                          >
                            {latest && latest.score >= 0 ? "+" : ""}
                            {latest?.score.toFixed(2)}
                          </span>
                          <span className="font-mono text-[9px] tracking-[0.12em] text-[var(--muted)]">
                            {reactions.length} reaction
                            {reactions.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 font-serif italic text-[13px] leading-snug text-[var(--ink-soft)]">
                          “{latest?.quote}”
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && reactions.length > 0 && (
                  <div className="border-t border-[var(--rule-soft)] px-3 py-2 font-serif text-[12.5px] leading-snug text-[var(--ink-soft)]">
                    {avgScore !== null && (
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        Avg · {avgScore >= 0 ? "+" : ""}
                        {avgScore.toFixed(2)}
                      </div>
                    )}
                    <ul className="space-y-2">
                      {reactions.slice(-5).map((r) => (
                        <li key={r.reaction_id} className="flex gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            {r.target_type}·{r.round === 2 ? "r2" : "r1"}
                          </span>
                          <span className="line-clamp-2 italic">“{r.quote}”</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {(!run || run.reactions.length === 0) && (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] leading-relaxed text-[var(--muted)]">
          The jury listens while we establish the baseline. Reactions stream in during Stage 06.
        </p>
      )}
    </aside>
  );
}
