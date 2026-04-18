"use client";

import { useEffect, useMemo, useState } from "react";

import type { PersonaReaction, Run, Verdict } from "@/lib/types";

import { GTMPlayCard } from "./GTMPlayCard";
import { readDecision, storageKey } from "./AcceptModifyReject";

interface Props {
  runId: string;
  run: Run;
}

/**
 * Stage 5 workspace. Renders 1–3 GTM angle cards (one per
 * `run.campaign.angles`) with verdict + reactions looked up by
 * `target_type="angle"` + `target_id=angle.angle_id`.
 *
 * Backend spec calls these "plays" but currently produces 1–3 angles,
 * so the UI is titled "GTM Angles" to match reality.
 *
 * The accumulator at the bottom is driven off localStorage so it
 * updates whenever any `<AcceptModifyReject>` writes a new decision.
 */
export function PlaysList({ runId, run }: Props) {
  const angles = run.campaign?.angles ?? [];

  // Index verdicts by target_id for O(1) lookup
  const verdictByAngle = useMemo(() => {
    const map = new Map<string, Verdict>();
    for (const v of run.verdicts ?? []) {
      if (v.target_type === "angle") {
        map.set(v.target_id, v);
      }
    }
    return map;
  }, [run.verdicts]);

  // Index round-1 reactions by angle target_id
  const reactionsByAngle = useMemo(() => {
    const map = new Map<string, PersonaReaction[]>();
    for (const r of run.reactions ?? []) {
      if (r.target_type !== "angle" || r.round !== 1) continue;
      const arr = map.get(r.target_id) ?? [];
      arr.push(r);
      map.set(r.target_id, arr);
    }
    return map;
  }, [run.reactions]);

  // Accumulator: count accepted angles by scanning localStorage.
  const [acceptedCount, setAcceptedCount] = useState(0);

  useEffect(() => {
    function recompute() {
      let n = 0;
      for (const angle of angles) {
        if (readDecision(runId, angle.angle_id) === "accept") n += 1;
      }
      setAcceptedCount(n);
    }
    recompute();

    function onDecision() {
      recompute();
    }
    function onStorage(e: StorageEvent) {
      if (!e.key) return;
      // only refresh if it looks like one of our keys
      if (angles.some((a) => e.key === storageKey(runId, a.angle_id))) {
        recompute();
      }
    }

    window.addEventListener("play-decision-change", onDecision);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("play-decision-change", onDecision);
      window.removeEventListener("storage", onStorage);
    };
  }, [runId, angles]);

  if (angles.length === 0) {
    return (
      <div className="border border-[var(--rule)] bg-[rgba(255,252,244,0.4)] p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
          The campaign generator returned no angles for this run. Try re-running
          Stage 04.
        </p>
      </div>
    );
  }

  const total = angles.length;

  return (
    <div className="flex flex-col">
      <header className="mb-4 flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          {total} angle{total === 1 ? "" : "s"} · the jury has voted on each
        </p>
        <p className="font-serif text-[15px] italic text-[var(--muted)]">
          Accept what fits, modify what needs a tweak, reject the rest. Your
          picks feed the creative stage.
        </p>
      </header>

      <div>
        {angles.map((angle, idx) => (
          <GTMPlayCard
            key={angle.angle_id}
            runId={runId}
            index={idx + 1}
            angle={angle}
            competitors={run.competitors ?? []}
            verdict={verdictByAngle.get(angle.angle_id) ?? null}
            reactions={reactionsByAngle.get(angle.angle_id) ?? []}
          />
        ))}
      </div>

      {/* Accumulator */}
      <footer className="mt-8 border-t border-[var(--rule)] pt-4">
        <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--accent)]">
          {acceptedCount.toString().padStart(2, "0")} of{" "}
          {total.toString().padStart(2, "0")} accepted
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Stored locally on this device · carried into the creative stage
        </p>
      </footer>
    </div>
  );
}

export function PlaysSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="border-t border-[var(--rule)] py-8 first:border-t-0 first:pt-0"
        >
          <div className="mb-3 h-2.5 w-24 bg-[var(--rule)]" />
          <div className="mb-4 h-6 w-2/3 bg-[var(--rule-soft)]" />
          <div className="mb-2 h-3 w-full bg-[var(--rule-soft)]" />
          <div className="mb-2 h-3 w-5/6 bg-[var(--rule-soft)]" />
          <div className="h-3 w-4/6 bg-[var(--rule-soft)]" />
        </div>
      ))}
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Synthesizing angles from competitive + social intel…
      </p>
    </div>
  );
}
