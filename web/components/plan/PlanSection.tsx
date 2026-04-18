import type { ReactNode } from "react";

interface Props {
  number: string;
  title: string;
  children: ReactNode;
  /** Optional right-aligned action stubs. Rendered but not wired. */
  primaryAction?: string;
  secondaryAction?: string;
}

/**
 * Numbered plan-section block. The numeral is oversized serif italic (Fraunces),
 * echoing the §01 treatment used elsewhere in the site. Body is serif with
 * generous whitespace; optional stub buttons render on the right.
 */
export function PlanSection({
  number,
  title,
  children,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <section className="grid gap-4 border-t border-[var(--rule)] py-8 md:grid-cols-[88px_minmax(0,1fr)] md:gap-8 md:py-10">
      <div className="flex items-start">
        <span
          className="font-serif text-[48px] italic leading-none text-[var(--accent)]"
          style={{ fontVariationSettings: '"opsz" 48, "wght" 380' }}
        >
          {number}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink)]">
            {title}
          </h3>
          {(primaryAction || secondaryAction) && (
            <div className="flex gap-2">
              {secondaryAction && (
                <button
                  type="button"
                  className="border border-[var(--rule)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                >
                  {secondaryAction}
                </button>
              )}
              {primaryAction && (
                <button
                  type="button"
                  className="border border-[var(--ink)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
                >
                  {primaryAction}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="font-serif text-[17px] leading-[1.55] text-[var(--ink)]">
          {children}
        </div>
      </div>
    </section>
  );
}
