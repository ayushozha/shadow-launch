import Link from "next/link";

type PagerLink = { label: string; marker: string; href: string } | null;

export default function StepPager({
  prev,
  next,
}: {
  prev: PagerLink;
  next: PagerLink;
}) {
  return (
    <nav className="mt-[96px] border-t border-[var(--rule)] px-10 py-14 md:px-20">
      <div className="grid items-end gap-10 md:grid-cols-2">
        <div className="min-h-[72px]">
          {prev ? (
            <Link href={prev.href} className="group block">
              <span className="block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
                ← {prev.marker}
              </span>
              <span
                className="mt-2 block font-serif text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]"
                style={{
                  fontVariationSettings: '"opsz" 60, "wght" 380, "SOFT" 40',
                  fontSize: "clamp(24px, 2.4vw, 34px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                <em>{prev.label}</em>
              </span>
            </Link>
          ) : null}
        </div>

        <div className="min-h-[72px] md:text-right">
          {next ? (
            <Link href={next.href} className="group block">
              <span className="block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
                {next.marker} →
              </span>
              <span
                className="mt-2 block font-serif text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]"
                style={{
                  fontVariationSettings: '"opsz" 60, "wght" 380, "SOFT" 40',
                  fontSize: "clamp(24px, 2.4vw, 34px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                <em>{next.label}</em>
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
