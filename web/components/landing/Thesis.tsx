import SectionHead from "./SectionHead";

const ASIDE_ROWS: { l: string; v: string }[] = [
  { l: "Typical ramp", v: "6 to 10 weeks" },
  { l: "Median spend to signal", v: "$18K to $40K" },
  { l: "Wedges tested before launch", v: "~1.3" },
  { l: "Shadow Launch ramp", v: "under 2 hours" },
  { l: "Wedges pressure-tested", v: "3 to 6" },
  { l: "Cost per simulation", v: "$3 to $14" },
];

export default function Thesis() {
  return (
    <section className="relative border-b border-[var(--rule)] px-10 py-24">
      <SectionHead marker="§01 · Thesis">
        Every launch is a{" "}
        <em
          className="italic text-[var(--accent)]"
          style={{ fontVariationSettings: '"opsz" 60, "wght" 360, "SOFT" 80' }}
        >
          live experiment
        </em>{" "}
        on customers who never agreed to be the test group.
      </SectionHead>

      <div className="thesis-grid reveal grid items-start gap-20 md:grid-cols-2">
        <div className="thesis-body">
          <p
            className="lead mb-[22px] font-serif text-[28px] leading-[1.3] text-[var(--ink)]"
            style={{
              fontVariationSettings: '"opsz" 40, "wght" 420, "SOFT" 60',
            }}
          >
            <span
              className="drop float-left font-serif text-[var(--accent)]"
              style={{
                fontVariationSettings: '"opsz" 144, "wght" 500, "SOFT" 20',
                fontSize: 84,
                lineHeight: 0.86,
                padding: "6px 12px 0 0",
              }}
            >
              T
            </span>
            he modern go-to-market stack is astonishingly efficient at
            producing outputs. Ads, sequences, landing pages, launches. It is
            terrible at one thing: knowing, before the spend, whether any of
            it will land.
          </p>
          <p
            className="mb-[22px] font-serif text-[20px] leading-[1.55] text-[var(--ink-soft)]"
            style={{ fontVariationSettings: '"opsz" 14, "wght" 400, "SOFT" 40' }}
          >
            So teams do what teams have always done. They guess. They A/B.
            They argue in rooms. They pick a positioning on a Tuesday and pay
            the market to tell them on a Friday that it was wrong. By then the
            quarter is half gone and the budget is half spent.
          </p>
          <p
            className="font-serif text-[20px] leading-[1.55] text-[var(--ink-soft)]"
            style={{ fontVariationSettings: '"opsz" 14, "wght" 400, "SOFT" 40' }}
          >
            Shadow Launch is a different premise. Build a synthetic version of
            the market first. Rehearse the launch against it. Let the wedge
            that works reveal itself in simulation, not in production. The
            real launch is the encore, not the experiment.
          </p>
        </div>

        <aside className="thesis-aside border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] p-6">
          {ASIDE_ROWS.map((row, i) => (
            <div
              key={i}
              className={`row flex items-center justify-between py-[14px] ${
                i < ASIDE_ROWS.length - 1
                  ? "border-b border-dashed border-[var(--rule-soft)]"
                  : ""
              }`}
            >
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--muted)] flex-shrink-0">
                {row.l}
              </span>
              <span className="font-serif italic text-[18px] text-[var(--ink)] text-right">
                {row.v}
              </span>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}
