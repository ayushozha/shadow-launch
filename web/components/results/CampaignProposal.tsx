import type { Campaign, Competitor } from "@/lib/types";

// Section 5 — Campaign proposal. 1–3 angle cards. Each: hook (big Fraunces
// italic), positioning paragraph, channel chips, rationale, evidence list.

export default function CampaignProposal({
  campaign,
  competitors,
}: {
  campaign: Campaign;
  competitors: Competitor[];
}) {
  const compById = new Map(competitors.map((c) => [c.competitor_id, c]));

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §05 · Proposed GTM campaign
          </span>
          <span className="font-serif text-[13px] italic text-[var(--muted)]">
            {campaign.angles.length} angles · grounded in competitor gaps
          </span>
        </div>

        <div className="flex flex-col gap-8">
          {campaign.angles.map((angle, i) => (
            <article
              key={angle.angle_id}
              className="grid grid-cols-1 gap-8 border-t border-[var(--rule-soft)] pt-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">
                  Angle {String(i + 1).padStart(2, "0")} · {angle.angle_id}
                </p>
                <h3
                  className="mt-4 font-serif text-[clamp(32px,5vw,60px)] italic leading-[1.02] tracking-[-0.02em] text-[var(--ink)]"
                  style={{ fontVariationSettings: '"opsz" 144, "wght" 400' }}
                >
                  &ldquo;{angle.hook}&rdquo;
                </h3>
                <p className="mt-6 max-w-[620px] font-serif text-[17px] leading-[1.6] text-[var(--ink-soft)]">
                  {angle.positioning}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {angle.channel_mix.map((ch) => (
                    <span
                      key={ch}
                      className="border border-[var(--ink)] bg-[var(--ink)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--paper)]"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>

              <aside className="flex flex-col gap-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Rationale
                  </p>
                  <p className="mt-3 font-serif text-[15px] leading-[1.6] text-[var(--ink-soft)]">
                    {angle.rationale}
                  </p>
                </div>

                {angle.evidence_competitor_ids.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      Evidence · {angle.evidence_competitor_ids.length}
                    </p>
                    <ul className="mt-3 flex flex-col divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)]">
                      {angle.evidence_competitor_ids.map((cid) => {
                        const c = compById.get(cid);
                        if (!c)
                          return (
                            <li
                              key={cid}
                              className="py-2 font-mono text-[11px] text-[var(--muted)]"
                            >
                              {cid}
                            </li>
                          );
                        return (
                          <li key={cid} className="py-3">
                            <p className="font-serif text-[14px] italic text-[var(--ink)]">
                              {c.name}
                            </p>
                            <p className="mt-0.5 font-serif text-[13px] leading-[1.5] text-[var(--ink-soft)] line-clamp-2">
                              {c.positioning}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Generated assets · {angle.asset_ids.length}
                  </p>
                </div>
              </aside>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
