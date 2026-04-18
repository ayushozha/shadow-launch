"use client";

import Link from "next/link";
import PaperCard from "./PaperCard";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  homeHref?: string;
};

export default function ErrorState({
  title = "Something went sideways.",
  message,
  onRetry,
  homeHref,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2
        className="font-serif text-4xl leading-[0.98] tracking-[-0.02em] text-[var(--ink)] md:text-5xl"
        style={{ fontVariationSettings: '"opsz" 60, "wght" 420, "SOFT" 40' }}
      >
        {title}
      </h2>

      <PaperCard>
        <p
          className="font-mono text-[12px] leading-relaxed text-[var(--ink-soft)] break-words whitespace-pre-wrap"
          style={{ letterSpacing: "0.02em", textTransform: "none" }}
        >
          {message}
        </p>
      </PaperCard>

      <div className="flex flex-wrap items-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mono inline-flex items-center gap-2 border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[var(--paper)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]"
          >
            Try again
          </button>
        ) : null}
        {homeHref ? (
          <Link
            href={homeHref}
            className="mono inline-flex items-center gap-2 border-b border-transparent px-2 py-3 text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)]"
          >
            Go home <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
