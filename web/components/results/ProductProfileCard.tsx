import type { ProductProfile } from "@/lib/types";

// Section 2 — Product research profile. Brand/one-liner/category, then three
// structured lists (positioning claims, tone inventory, messaging gaps) plus
// implicit-audience prose. Pure server component.

export default function ProductProfileCard({
  profile,
}: {
  profile: ProductProfile;
}) {
  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §02 · Product research profile
          </span>
          <span className="font-serif text-[13px] italic text-[var(--muted)]">
            what the market sees when it looks at you
          </span>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2
                className="font-serif text-[clamp(40px,6vw,76px)] leading-[0.95] tracking-[-0.02em] text-[var(--ink)]"
                style={{ fontVariationSettings: '"opsz" 144, "wght" 420' }}
              >
                {profile.brand_name}
              </h2>
              <span className="inline-flex items-center border border-[var(--rule)] bg-[rgba(255,252,244,0.6)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]">
                {profile.category}
              </span>
            </div>
            <p className="mt-6 max-w-[640px] font-serif text-[20px] italic leading-[1.55] text-[var(--ink-soft)]">
              {profile.one_liner}
            </p>

            <div className="mt-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Implicit audience
              </p>
              <p className="mt-3 max-w-[640px] font-serif text-[16px] leading-[1.6] text-[var(--ink-soft)]">
                {profile.implicit_audience}
              </p>
            </div>

            <div className="mt-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Tone inventory
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.tone_inventory.map((tag) => (
                  <span
                    key={tag}
                    className="border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-10">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Positioning claims · {profile.positioning_claims.length}
              </p>
              <ul className="mt-4 flex flex-col divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)]">
                {profile.positioning_claims.map((claim, i) => (
                  <li
                    key={i}
                    className="flex gap-3 py-3 font-serif text-[15px] leading-[1.5] text-[var(--ink-soft)]"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{claim}</span>
                  </li>
                ))}
              </ul>
            </div>

            {profile.messaging_gaps.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
                  Messaging gaps · {profile.messaging_gaps.length}
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {profile.messaging_gaps.map((gap, i) => (
                    <li
                      key={i}
                      className="border-l-2 border-[var(--accent)] bg-[rgba(227,51,18,0.05)] px-3 py-2 font-serif text-[14px] leading-[1.55] text-[var(--ink-soft)]"
                    >
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
