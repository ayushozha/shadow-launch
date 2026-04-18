import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found · Shadow Launch",
};

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-0px)] flex-col">
      <section className="relative flex flex-1 flex-col justify-center px-10 py-24 md:px-16">
        <div className="mx-auto w-full max-w-[960px]">
          <div className="mono mb-10 flex items-baseline justify-between border-b border-[var(--rule-soft)] pb-4 text-[var(--muted)]">
            <span>Error 404 / Off the map</span>
            <span
              className="font-serif text-[13px] italic text-[var(--muted)]"
              style={{ fontVariationSettings: '"opsz" 14, "wght" 400' }}
            >
              No such route in this field manual
            </span>
          </div>

          <h1
            className="mb-8 font-serif leading-[0.92] tracking-[-0.035em] text-[var(--ink)]"
            style={{
              fontVariationSettings: '"opsz" 144, "wght" 420, "SOFT" 20',
              fontSize: "clamp(56px, 9vw, 132px)",
            }}
          >
            Not <span className="italic text-[var(--ink-soft)]">found.</span>
          </h1>

          <p
            className="mb-10 max-w-[560px] text-[20px] leading-[1.5] text-[var(--ink-soft)]"
            style={{ fontVariationSettings: '"opsz" 14, "wght" 400, "SOFT" 50' }}
          >
            The route you tried doesn&apos;t exist on this site. It may have
            been renamed, never existed, or the link that sent you here is
            stale. Try one of the paths below instead.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="mono inline-flex items-center gap-2 border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[var(--paper)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]"
            >
              Run a new simulation <span aria-hidden>→</span>
            </Link>
            <Link
              href="/demo"
              className="mono inline-flex items-center gap-2 border border-[var(--ink)] px-5 py-3 text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              See a demo <span aria-hidden>→</span>
            </Link>
            <Link
              href="/"
              className="mono inline-flex items-center gap-2 border-b border-transparent px-2 py-3 text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)]"
            >
              Home <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
