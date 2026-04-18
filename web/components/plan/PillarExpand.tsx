"use client";

import { useState } from "react";

interface Props {
  label: string;
  rationale?: string;
}

/**
 * One pillar row. Click to toggle a short rationale. Rationale is optional —
 * if omitted, the caret is rendered but the expansion is inert.
 */
export function PillarExpand({ label, rationale }: Props) {
  const [open, setOpen] = useState(false);
  const hasRationale = !!rationale && rationale.trim().length > 0;

  return (
    <div className="border-b border-[var(--rule-soft)] last:border-b-0">
      <button
        type="button"
        onClick={() => hasRationale && setOpen((v) => !v)}
        className="flex w-full items-center gap-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span
          className={`font-mono text-[10px] text-[var(--muted)] transition-transform ${
            open ? "rotate-90" : ""
          }`}
        >
          ▸
        </span>
        <span className="font-serif text-[17px] text-[var(--ink)]">
          {label}
        </span>
        {hasRationale && (
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">
            {open ? "hide" : "why"}
          </span>
        )}
      </button>
      {open && hasRationale && (
        <p className="pb-3 pl-6 pr-2 font-serif text-[14px] italic leading-[1.5] text-[var(--muted)]">
          {rationale}
        </p>
      )}
    </div>
  );
}
