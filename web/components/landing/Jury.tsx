import SectionHead from "./SectionHead";

type Juror = {
  initial: string;
  role: string;
  name: string;
  quote: string;
  composited: string;
  score: string;
  bg: string;
};

const JURORS: Juror[] = [
  {
    initial: "C",
    role: "Persona 01 / Champion",
    name: "The believer who has to sell it internally.",
    quote:
      "This is the angle. But they will come for the integration story first, and I do not have it yet.",
    composited: "composited · n=212",
    score: "+0.72",
    bg: "var(--ink)",
  },
  {
    initial: "E",
    role: "Persona 02 / Economic Buyer",
    name: "The one who signs the check and counts the months.",
    quote:
      "Show me payback inside a quarter or we wait until Q3. The narrative is nice. The math is not there.",
    composited: "composited · n=184",
    score: "-0.41",
    bg: "#3a4a3a",
  },
  {
    initial: "B",
    role: "Persona 03 / Technical Blocker",
    name: "The quiet no with a veto nobody talks about.",
    quote:
      "The security posture is table stakes. If I cannot drop this into our existing stack in a morning, I will not schedule the second meeting.",
    composited: "composited · n=147",
    score: "-0.22",
    bg: "#5a3a2a",
  },
  {
    initial: "S",
    role: "Persona 04 / Skeptic",
    name: "The pattern-matcher who has heard every promise.",
    quote:
      "I have seen this pitch three times this year under three different logos. What makes this one not fold in eighteen months.",
    composited: "composited · n=304",
    score: "-0.08",
    bg: "#2a3a4a",
  },
];

export default function Jury() {
  return (
    <section
      id="jury"
      className="jury relative border-b border-[var(--rule)] bg-[var(--paper)] px-10 py-24"
    >
      <SectionHead marker="§03 · The Jury">
        Four buyers, instantiated from the{" "}
        <em
          className="italic text-[var(--accent)]"
          style={{ fontVariationSettings: '"opsz" 60, "wght" 360, "SOFT" 80' }}
        >
          actual voices
        </em>{" "}
        of your market.
      </SectionHead>

      <div className="jury-grid reveal grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {JURORS.map((j, i) => (
          <div
            key={i}
            className="juror relative flex cursor-pointer flex-col border border-[var(--rule)] bg-[rgba(255,252,244,0.4)] p-6 transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[8px_10px_0_var(--shadow)]"
            style={{ minHeight: 400 }}
          >
            <div
              className="juror-portrait relative mb-[18px] flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full"
              style={{ background: j.bg }}
            >
              <span
                className="relative z-[1] font-serif italic text-[var(--paper)]"
                style={{
                  fontSize: 30,
                  fontVariationSettings: '"opsz" 40, "wght" 400, "SOFT" 80',
                }}
              >
                {j.initial}
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(236,228,210,0.3), transparent 60%)",
                }}
              />
            </div>

            <div className="juror-role mb-[6px] font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--muted)]">
              {j.role}
            </div>
            <div
              className="juror-name mb-4 font-serif text-[22px] leading-[1.1] tracking-[-0.01em]"
              style={{ fontVariationSettings: '"opsz" 40, "wght" 420, "SOFT" 50' }}
            >
              {j.name}
            </div>

            <div
              className="juror-quote relative border-y border-[var(--rule-soft)] py-[14px] font-serif italic text-[15px] leading-[1.45] text-[var(--ink-soft)]"
              style={{ fontVariationSettings: '"opsz" 14, "wght" 380, "SOFT" 100' }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute font-serif"
                style={{
                  top: -2,
                  left: -4,
                  fontSize: 40,
                  color: "var(--accent)",
                  opacity: 0.3,
                }}
              >
                &ldquo;
              </span>
              {j.quote}
            </div>

            <div className="juror-meta mt-auto flex items-center justify-between pt-[14px] font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)]">
              <span>{j.composited}</span>
              <span className="font-semibold text-[var(--accent)]">
                {j.score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
