// Long-form executive summary for the standalone board. Renders the
// pre-baked summary string at reading-length measure in Fraunces. Keeps
// paragraph breaks from the source JSON.

type Props = {
  summary: string;
};

export default function ExecutiveSummary({ summary }: Props) {
  const paragraphs = summary.split(/\n\n+/).filter(Boolean);
  return (
    <section className="border-b border-[var(--rule)] px-5 py-14 md:px-14 md:py-20 print:py-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-[1fr_3fr] md:items-baseline">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
            Executive summary
          </p>
          <h2
            className="font-serif text-[clamp(26px,3.5vw,42px)] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]"
            style={{ fontVariationSettings: '"opsz" 60, "wght" 400, "SOFT" 40' }}
          >
            The argument in <em className="italic text-[var(--accent)]">200 words.</em>
          </h2>
        </div>

        <div className="mx-auto max-w-[760px] font-serif text-[19px] leading-[1.65] text-[var(--ink)]">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="mb-6 last:mb-0"
              style={{ fontVariationSettings: '"opsz" 18, "wght" 400, "SOFT" 30' }}
            >
              {i === 0 ? (
                <>
                  <span
                    className="float-left mr-3 mt-1 font-serif text-[64px] leading-[0.85] text-[var(--accent)]"
                    style={{ fontVariationSettings: '"opsz" 72, "wght" 500' }}
                  >
                    {p.charAt(0)}
                  </span>
                  {p.slice(1)}
                </>
              ) : (
                p
              )}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
