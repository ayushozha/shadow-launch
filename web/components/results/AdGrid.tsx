"use client";

import type { AdVariant, Wedge, WedgeVerdict } from "@/lib/types";

// 5 Pixero ad variants in a bordered-card grid. Mirrors the homepage juror
// card vocabulary from shadow-launch.html (paper-on-paper, hover lift, mono
// meta line, serif copy).

export default function AdGrid({
  ads,
  winner,
  wedges,
}: {
  ads: AdVariant[];
  winner: WedgeVerdict;
  wedges: Wedge[];
}) {
  const winningWedge = wedges.find((w) => w.id === winner.wedge_id);

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_3fr] md:items-baseline">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §03 · Ad set
          </span>
          <div>
            <h2
              className="font-serif text-[clamp(30px,4vw,52px)] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]"
              style={{ fontVariationSettings: '"opsz" 60, "wght" 380, "SOFT" 40' }}
            >
              Five variants, <em className="italic text-[var(--accent)]">pre-validated</em> against the jury.
            </h2>
            <p className="mt-3 max-w-[640px] font-serif text-[16px] leading-[1.55] text-[var(--ink-soft)]">
              Pixero built these from the winning brief — {" "}
              <span className="font-mono text-[13px] uppercase tracking-[0.1em] text-[var(--accent)]">
                {winningWedge?.headline ?? winner.wedge_id}
              </span>
              . Only the copy the synthetic room already agreed with ships.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad, i) => (
            <AdCard key={i} ad={ad} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AdCard({ ad, index }: { ad: AdVariant; index: number }) {
  return (
    <article className="group flex flex-col gap-4 border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[8px_10px_0_var(--shadow)]">
      <div className="flex items-baseline justify-between border-b border-dashed border-[var(--rule-soft)] pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
          Variant {String(index + 1).padStart(2, "0")} / 05
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
          meta · pixero
        </span>
      </div>

      <h3
        className="font-serif text-[22px] leading-[1.15] tracking-[-0.01em] text-[var(--ink)]"
        style={{ fontVariationSettings: '"opsz" 40, "wght" 420, "SOFT" 50' }}
      >
        {ad.headline}
      </h3>

      <p className="font-serif text-[15px] leading-[1.5] text-[var(--ink-soft)]">
        {ad.body}
      </p>

      <div className="mt-auto flex flex-col gap-3 border-t border-dashed border-[var(--rule-soft)] pt-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Call to action
          </p>
          <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--ink)]">
            {ad.cta} →
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Visual brief
          </p>
          <p className="mt-1 font-serif text-[13px] italic leading-[1.5] text-[var(--ink-soft)]">
            {ad.visual_brief}
          </p>
        </div>
        {ad.pixero_url && (
          <a
            href={ad.pixero_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 self-start border-b border-[var(--accent)] pb-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] hover:text-[var(--accent-ink)]"
          >
            Open in Pixero
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        )}
      </div>
    </article>
  );
}
