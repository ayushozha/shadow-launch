"use client";

import { ReactNode } from "react";

import { SourceTag } from "./SourceTag";

interface Props {
  /** Mono label, rendered small and uppercased. */
  label: string;
  /** Main field value — prose or rich node. */
  children: ReactNode;
  /** Optional source tags rendered below. */
  sources?: string[];
  /** Show the "(editable)" affordance chip. Real editing is a later pass. */
  editable?: boolean;
}

/**
 * A single section inside the Brand Dossier. Mono label rule, serif
 * body, optional source attribution and editable affordance chip.
 */
export function DossierField({ label, children, sources, editable }: Props) {
  return (
    <section className="group/field border-t border-[var(--rule)] pt-6">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          {label}
        </span>
        {editable && (
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)] opacity-0 transition-opacity duration-200 group-hover/field:opacity-100">
            (editable)
          </span>
        )}
      </header>
      <div className="font-serif text-[17px] leading-[1.55] text-[var(--ink)]">
        {children}
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-3">
          <SourceTag sources={sources} />
        </div>
      )}
    </section>
  );
}
