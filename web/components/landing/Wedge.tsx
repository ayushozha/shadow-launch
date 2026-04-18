import SectionHead from "./SectionHead";

type Item = {
  rank: string;
  title: string;
  body: string;
  score: string;
  winner?: boolean;
};

const ITEMS: Item[] = [
  {
    rank: "01",
    title: "Speed as a feature.",
    body: "The category leaders ship quarterly. We ship nightly. Credible, but underweight with the economic buyer.",
    score: "0.52",
  },
  {
    rank: "02",
    title: "The last tool you buy in this category.",
    body: "Reframes the purchase as a consolidation, not an addition. Champion loves the internal story. Skeptic grudgingly agrees. Jury converges fastest here.",
    score: "0.81",
    winner: true,
  },
  {
    rank: "03",
    title: "Built for the team of one.",
    body: "Resonates narrowly. Plays well to solopreneurs but the blocker flags it as a toy in enterprise conversations.",
    score: "0.44",
  },
];

export default function Wedge() {
  return (
    <section
      id="wedge"
      className="wedge-section relative border-b border-[var(--rule)] bg-[var(--paper-deep)] px-10 py-24"
    >
      <SectionHead marker="§04 · The Wedge">
        Three positioning angles. The jury{" "}
        <em
          className="italic text-[var(--accent)]"
          style={{ fontVariationSettings: '"opsz" 60, "wght" 360, "SOFT" 80' }}
        >
          picks one
        </em>
        .
      </SectionHead>

      <div className="wedge-grid reveal grid items-start gap-[60px] md:grid-cols-2">
        <div className="wedge-viz relative aspect-square max-w-[500px]">
          <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
            {/* rings */}
            <circle
              cx="200" cy="200" r="180"
              fill="none" stroke="rgba(12,12,10,0.2)" strokeWidth="1"
            />
            <circle
              cx="200" cy="200" r="140"
              fill="none" stroke="rgba(12,12,10,0.12)"
              strokeWidth="1" strokeDasharray="2 4"
            />
            <circle
              cx="200" cy="200" r="90"
              fill="none" stroke="rgba(12,12,10,0.12)"
              strokeWidth="1" strokeDasharray="2 4"
            />
            {/* wedge 1 — losing */}
            <path
              d="M 200 200 L 380 200 A 180 180 0 0 0 290 44 Z"
              fill="rgba(12,12,10,0.06)"
              stroke="rgba(12,12,10,0.35)"
              strokeWidth="1"
            />
            {/* wedge 2 — winning */}
            <path
              d="M 200 200 L 290 44 A 180 180 0 0 0 110 44 Z"
              fill="#e33312" fillOpacity="0.85"
              stroke="#0c0c0a" strokeWidth="1.5"
            />
            {/* wedge 3 — losing */}
            <path
              d="M 200 200 L 110 44 A 180 180 0 0 0 20 200 Z"
              fill="rgba(12,12,10,0.06)"
              stroke="rgba(12,12,10,0.35)"
              strokeWidth="1"
            />
            {/* dead space */}
            <path
              d="M 200 200 L 20 200 A 180 180 0 0 0 380 200 Z"
              fill="none"
              stroke="rgba(12,12,10,0.08)"
              strokeWidth="1"
              strokeDasharray="1 6"
            />
            {/* winning wedge callout */}
            <circle cx="200" cy="84" r="5" fill="#0c0c0a" />
            <line x1="200" y1="84" x2="200" y2="-6" stroke="#0c0c0a" strokeWidth="1" />
            <text
              x="200" y="-14" textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize="10"
              fill="#0c0c0a" letterSpacing="2"
            >
              WEDGE 02 · SELECTED
            </text>
            {/* center label */}
            <text
              x="200" y="250" textAnchor="middle"
              fontFamily="var(--font-fraunces)" fontStyle="italic"
              fontSize="16" fill="#6a6454"
            >
              market surface
            </text>
            <text
              x="200" y="272" textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize="9"
              fill="#6a6454" letterSpacing="1.5"
            >
              n = 847 signals
            </text>
            {/* score ticks */}
            <text x="200" y="32" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="rgba(12,12,10,0.4)">0.81</text>
            <text x="354" y="136" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="rgba(12,12,10,0.4)">0.44</text>
            <text x="46" y="136" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="rgba(12,12,10,0.4)">0.52</text>
          </svg>
        </div>

        <div className="wedge-list flex flex-col gap-0">
          {ITEMS.map((item, i) => (
            <div
              key={i}
              className={`wedge-item grid grid-cols-[auto_1fr_auto] items-center gap-6 py-6 ${
                i < ITEMS.length - 1 ? "border-b border-[var(--rule)]" : ""
              }`}
            >
              <div
                className="wedge-rank font-serif"
                style={{
                  fontVariationSettings: '"opsz" 144, "wght" 500, "SOFT" 30',
                  fontSize: 56,
                  lineHeight: 0.8,
                  color: item.winner ? "var(--accent)" : "var(--muted)",
                }}
              >
                {item.rank}
              </div>
              <div className="wedge-copy">
                <h4
                  className="mb-[6px] font-serif text-[22px] leading-[1.15] tracking-[-0.01em]"
                  style={{ fontVariationSettings: '"opsz" 40, "wght" 420, "SOFT" 40' }}
                >
                  {item.title}
                </h4>
                <p className="text-[14px] leading-[1.5] text-[var(--muted)]">
                  {item.body}
                </p>
                {item.winner && (
                  <span className="mt-[6px] inline-block bg-[var(--accent)] px-2 py-[3px] font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--paper)]">
                    Selected
                  </span>
                )}
              </div>
              <div className="wedge-score text-right font-mono text-[11px] tracking-[0.14em]">
                <span
                  className="big mb-1 block font-serif"
                  style={{
                    fontVariationSettings: '"opsz" 60, "wght" 500, "SOFT" 30',
                    fontSize: 36,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    color: item.winner ? "var(--accent)" : undefined,
                  }}
                >
                  {item.score}
                </span>
                <span>jury score</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
