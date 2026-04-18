"use client";

import { useEffect, useState } from "react";

export type PlayDecision = "accept" | "modify" | "reject" | null;

interface Props {
  runId: string;
  angleId: string;
  onChange?: (decision: PlayDecision) => void;
}

const STORAGE_PREFIX = "play_decision";

export function storageKey(runId: string, angleId: string): string {
  return `${STORAGE_PREFIX}:${runId}:${angleId}`;
}

export function readDecision(runId: string, angleId: string): PlayDecision {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(runId, angleId));
    if (raw === "accept" || raw === "modify" || raw === "reject") return raw;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Three-state decision toggle per GTM angle. Local UI state only — persists
 * to `localStorage` keyed by `play_decision:{runId}:{angleId}`. Nothing is
 * sent to the backend. Intended to be read back by the creative stage to
 * filter accepted angles.
 *
 * Accept = accent fill.
 * Modify = accent outline (inline rewrite UI is v2; here it's a pressed state).
 * Reject = muted outline with a strike on label.
 */
export function AcceptModifyReject({ runId, angleId, onChange }: Props) {
  const [decision, setDecision] = useState<PlayDecision>(null);

  useEffect(() => {
    setDecision(readDecision(runId, angleId));
  }, [runId, angleId]);

  function pick(next: PlayDecision) {
    // Toggle off if clicked again
    const value: PlayDecision = decision === next ? null : next;
    setDecision(value);
    try {
      if (value) {
        window.localStorage.setItem(storageKey(runId, angleId), value);
      } else {
        window.localStorage.removeItem(storageKey(runId, angleId));
      }
      // Nudge other listeners on this page without waiting for storage events.
      window.dispatchEvent(
        new CustomEvent("play-decision-change", {
          detail: { runId, angleId, decision: value },
        }),
      );
    } catch {
      // ignore
    }
    onChange?.(value);
  }

  const options: Array<{
    key: Exclude<PlayDecision, null>;
    label: string;
    activeStyle: string;
    inactiveStyle: string;
    activeContent: string;
  }> = [
    {
      key: "accept",
      label: "Accept",
      activeStyle:
        "border-[var(--accent)] bg-[var(--accent)] text-[var(--paper)]",
      inactiveStyle:
        "border-[var(--rule)] bg-transparent text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent-ink)]",
      activeContent: "✓ Accepted",
    },
    {
      key: "modify",
      label: "Modify",
      activeStyle:
        "border-[var(--accent)] bg-[rgba(227,51,18,0.06)] text-[var(--accent-ink)]",
      inactiveStyle:
        "border-[var(--rule)] bg-transparent text-[var(--ink)] hover:border-[var(--ink-soft)]",
      activeContent: "✎ Modifying",
    },
    {
      key: "reject",
      label: "Reject",
      activeStyle:
        "border-[var(--muted)] bg-transparent text-[var(--muted)] line-through",
      inactiveStyle:
        "border-[var(--rule)] bg-transparent text-[var(--ink)] hover:border-[var(--ink-soft)]",
      activeContent: "✕ Rejected",
    },
  ];

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Angle decision"
    >
      {options.map((opt) => {
        const active = decision === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => pick(opt.key)}
            aria-pressed={active}
            className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
              active ? opt.activeStyle : opt.inactiveStyle
            }`}
          >
            {active ? opt.activeContent : opt.label}
          </button>
        );
      })}
    </div>
  );
}
