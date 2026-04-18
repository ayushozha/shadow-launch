import Link from "next/link";

interface Props {
  runId: string;
}

export function WizardNav({ runId }: Props) {
  return (
    <nav
      className="flex items-center justify-between border-b border-[var(--rule)] px-6 py-4 md:px-10"
      aria-label="wizard nav"
    >
      <Link href="/" className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-4 w-4 rounded-full border border-[var(--ink)]"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, transparent 60%, var(--accent) 62%)",
          }}
        />
        <span className="font-serif text-[15px] tracking-tight">
          Shadow Launch
        </span>
      </Link>

      <div className="flex items-center gap-6 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        <span className="hidden md:inline font-mono">
          Run · <span className="text-[var(--ink-soft)]">{runId}</span>
        </span>
        <Link
          href="/"
          className="font-mono transition-colors hover:text-[var(--accent)]"
        >
          Exit ↗
        </Link>
      </div>
    </nav>
  );
}
