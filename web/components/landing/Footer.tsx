export default function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-[var(--rule)] bg-[var(--paper)] p-10">
      <span className="mono text-[var(--muted)]">
        Shadow Launch · a synthetic market for GTM teams
      </span>
      <div className="foot-links flex gap-7">
        {[
          { href: "#method", label: "Method" },
          { href: "#jury", label: "Jury" },
          { href: "#wedge", label: "Wedge" },
          { href: "#stack", label: "Stack" },
          { href: "#access", label: "Access" },
        ].map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            {l.label}
          </a>
        ))}
      </div>
      <span className="mono text-[var(--muted)]">© 26 · Field Note N° 01</span>
    </footer>
  );
}
