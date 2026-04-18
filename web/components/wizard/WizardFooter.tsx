"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { Run } from "@/lib/types";
import {
  getNextStage,
  getPrevStage,
  runPath,
  WizardStageSlug,
  WIZARD_STAGES,
} from "@/lib/wizard";

interface Props {
  runId: string;
  active: WizardStageSlug;
  run: Run | null;
  /** Hint shown when Next is disabled because this stage hasn't finished. */
  pendingReason?: string;
}

export function WizardFooter({
  runId,
  active,
  run,
  pendingReason,
}: Props) {
  const router = useRouter();
  const prev = getPrevStage(active);
  const next = getNextStage(active);
  const activeMeta = WIZARD_STAGES.find((s) => s.slug === active);
  if (!activeMeta) return null;

  const ready = activeMeta.ready(run);
  const finishHref =
    next === null ? `/results/${encodeURIComponent(runId)}` : null;
  const nextHref = next ? runPath(runId, next.slug) : finishHref;
  const nextLabel = next ? activeMeta.nextLabel : "View command center →";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable)
          return;
      }
      if (e.key === "ArrowRight" && ready && nextHref)
        router.push(nextHref);
      else if (e.key === "ArrowLeft" && prev)
        router.push(runPath(runId, prev.slug));
      else if (e.key === "Escape") router.push("/");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, nextHref, prev, runId, router]);

  return (
    <footer
      className="sticky bottom-0 z-20 border-t border-[var(--rule)] bg-[var(--paper)]/92 px-6 py-4 backdrop-blur-sm md:px-10"
      aria-label="wizard footer"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => prev && router.push(runPath(runId, prev.slug))}
          disabled={!prev}
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)] disabled:text-[var(--rule)] disabled:hover:text-[var(--rule)]"
        >
          {prev ? activeMeta.prevLabel : "·"}
        </button>

        <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--muted)]">
          {ready
            ? "← / → to navigate · Esc to exit"
            : (pendingReason ?? "Waiting for this stage to finish…")}
        </span>

        <button
          type="button"
          onClick={() => ready && nextHref && router.push(nextHref)}
          disabled={!ready || !nextHref}
          className="inline-flex items-center gap-2 border border-[var(--ink)] bg-[var(--ink)] px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--paper)] transition-colors enabled:hover:bg-[var(--accent)] enabled:hover:border-[var(--accent)] disabled:border-[var(--rule)] disabled:bg-transparent disabled:text-[var(--rule)]"
          aria-disabled={!ready}
        >
          {nextLabel}
        </button>
      </div>
    </footer>
  );
}
