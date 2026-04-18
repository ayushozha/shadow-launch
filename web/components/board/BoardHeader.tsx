import type { Run } from "@/lib/types";

// Header for the standalone /board/[id] page.
// Server component. No nav. No footer. Just a brand mark, the product
// the board is for, and when it was generated. Lives at the very top
// of the page and sets the editorial tone.

type Props = {
  run: Run;
};

function formatCreatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function BoardHeader({ run }: Props) {
  const product = run.hero_target ?? run.input?.product_url ?? run.run_id;
  const created = formatCreatedAt(run.created_at);

  return (
    <header className="border-b border-[var(--rule)] px-5 py-10 md:px-14 md:py-14 print:py-6">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
            Launch board
          </p>
          <h1
            className="mt-3 font-serif text-[clamp(36px,5vw,72px)] leading-[1.02] tracking-[-0.02em] text-[var(--ink)]"
            style={{ fontVariationSettings: '"opsz" 72, "wght" 380, "SOFT" 40' }}
          >
            {product}
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Run {run.run_id} · {created}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 md:items-end">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted)]">
            Created by
          </p>
          <p
            className="font-serif text-[22px] leading-[1] tracking-[-0.01em] text-[var(--ink)]"
            style={{ fontVariationSettings: '"opsz" 36, "wght" 500, "SOFT" 30' }}
          >
            Shadow Launch<span className="text-[var(--accent)]">.</span>
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            synthetic GTM rehearsal
          </p>
        </div>
      </div>
    </header>
  );
}
