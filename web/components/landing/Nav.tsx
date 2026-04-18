"use client";

function scrollToAccess(e: React.MouseEvent) {
  e.preventDefault();
  document
    .getElementById("access")
    ?.scrollIntoView({ behavior: "smooth" });
}

export default function Nav() {
  return (
    <nav className="top sticky top-0 z-50 flex items-center justify-between border-b border-[var(--rule)] bg-[rgba(236,228,210,0.92)] px-10 py-[22px] backdrop-blur-md">
      <a href="#" className="logo flex items-center gap-[10px] font-serif text-[15px] tracking-[-0.01em]" style={{ fontVariationSettings: '"opsz" 14, "wght" 500' }}>
        <span className="logo-mark relative block h-[22px] w-[22px]" />
        Shadow Launch
      </a>

      <div className="nav-links hidden md:flex gap-8">
        <a href="#method" className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]">
          Method
        </a>
        <a href="#jury" className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]">
          The Jury
        </a>
        <a href="#wedge" className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]">
          Wedge
        </a>
        <a href="#stack" className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]">
          Stack
        </a>
      </div>

      <button
        type="button"
        onClick={scrollToAccess}
        className="nav-cta cursor-pointer border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--paper)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]"
      >
        Request Access
      </button>

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
