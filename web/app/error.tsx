"use client";

import { useEffect } from "react";
import Link from "next/link";
import PaperCard from "@/components/common/PaperCard";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log locally only. No third-party reporter.
    console.error("[shadow-launch] route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[calc(100vh-0px)] flex-col">
      <section className="relative flex flex-1 flex-col justify-center px-10 py-24 md:px-16">
        <div className="mx-auto w-full max-w-[960px]">
          <div className="mono mb-10 flex items-baseline justify-between border-b border-[var(--rule-soft)] pb-4 text-[var(--muted)]">
            <span>Runtime fault / Caught by boundary</span>
            {error.digest ? (
              <span className="text-[var(--muted)]">
                digest · {error.digest}
              </span>
            ) : null}
          </div>

          <h1
            className="mb-8 font-serif leading-[0.92] tracking-[-0.035em] text-[var(--ink)]"
            style={{
              fontVariationSettings: '"opsz" 144, "wght" 420, "SOFT" 20',
              fontSize: "clamp(44px, 7vw, 108px)",
            }}
          >
            Something went{" "}
            <span className="italic text-[var(--ink-soft)]">sideways.</span>
          </h1>

          <p
            className="mb-8 max-w-[560px] text-[20px] leading-[1.5] text-[var(--ink-soft)]"
            style={{ fontVariationSettings: '"opsz" 14, "wght" 400, "SOFT" 50' }}
          >
            The page tried to render and threw. Nothing was lost. You can retry
            the segment or head back home.
          </p>

          <div className="mb-8">
            <PaperCard>
              <div className="mono mb-3 text-[var(--muted)]">
                Error message
              </div>
              <pre
                className="font-mono text-[12px] leading-relaxed text-[var(--ink-soft)] whitespace-pre-wrap break-words"
                style={{ letterSpacing: "0.02em", textTransform: "none" }}
              >
                {error.message || "Unknown error"}
              </pre>
            </PaperCard>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="mono inline-flex items-center gap-2 border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[var(--paper)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]"
            >
              Try again
            </button>
            <Link
              href="/"
              className="mono inline-flex items-center gap-2 border-b border-transparent px-2 py-3 text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)]"
            >
              Go home <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
