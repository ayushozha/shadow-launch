import Link from "next/link";

export default function DemoNav({ step }: { step?: string }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--rule)] bg-[rgba(236,228,210,0.92)] px-10 py-[22px] backdrop-blur-md">
      <Link
        href="/demo"
        className="flex items-center gap-[10px] font-serif text-[15px] tracking-[-0.01em]"
        style={{ fontVariationSettings: '"opsz" 14, "wght" 500' }}
      >
        <span className="logo-mark relative block h-[22px] w-[22px]" />
        Shadow Launch
      </Link>

      <div className="hidden md:flex items-center gap-8">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
          Walkthrough
        </span>
        {step ? (
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--ink)]">
            {step}
          </span>
        ) : null}
      </div>

      <Link
        href="/demo"
        className="border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--paper)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]"
      >
        Index
      </Link>

      <style>{`
        .logo-mark::before,
        .logo-mark::after {
          content: "";
          position: absolute;
          inset: 2px;
          border: 1.5px solid var(--ink);
          border-radius: 50%;
        }
        .logo-mark::after {
          transform: translate(4px, 3px);
          border-color: var(--accent);
          mix-blend-mode: multiply;
        }
      `}</style>
    </nav>
  );
}
