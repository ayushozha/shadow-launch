import SectionHead from "./SectionHead";

type Juror = {
  initial: string;
  role: string;
  name: string;
  quote: string;
  weight: string;
  score: string;
  bg: string;
};

const JURORS: Juror[] = [
  {
    initial: "M",
    role: "Persona 01 / Marketing VP",
    name: "The one buying the GTM tool.",
    quote:
      "Angle 02 lands. But calendar slot 11 repeats a hook we already burned on LinkedIn two weeks ago.",
    weight: "weight · 0.20",
    score: "+0.61",
    bg: "var(--ink)",
  },
  {
    initial: "F",
    role: "Persona 02 / CFO Skeptic",
    name: "The one who signs the check.",
    quote:
      "Show me payback inside a quarter or we wait until Q3. The creative is nice. The math is not there.",
    weight: "weight · 0.25",
    score: "-0.34",
    bg: "#3a4a3a",
  },
  {
    initial: "E",
    role: "Persona 03 / Engineering Lead",
    name: "The technical credibility filter.",
    quote:
      "The security posture is table stakes. Copy that implies we ship AI without evals gets a quiet no from me.",
    weight: "weight · 0.15",
    score: "-0.18",
    bg: "#5a3a2a",
  },
  {
    initial: "U",
    role: "Persona 04 / Target End-User",
    name: "The ICP the product actually serves.",
    quote:
      "I would click that headline. The proof point beneath it assumes I already know your category. I do not.",
    weight: "weight · 0.20",
    score: "+0.44",
    bg: "#2a3a4a",
  },
  {
    initial: "S",
    role: "Persona 05 / Social Media Manager",
    name: "The one executing the calendar.",
    quote:
      "Four TikToks in seven days with no repurposed copy is unworkable. Cadence needs to split across channels.",
    weight: "weight · 0.10",
    score: "-0.09",
    bg: "#4a2a3a",
  },
  {
    initial: "P",
    role: "Persona 06 / PR / Brand Authority",
    name: "The reputation defender.",
    quote:
      "The hook in angle 03 lands as a swipe at an incumbent. Cute for earned media, risky for sales conversations.",
    weight: "weight · 0.10",
    score: "+0.12",
    bg: "#3a2a4a",
  },
];

export default function Jury() {
  return (
    <section
      id="jury"
      className="jury relative border-b border-[var(--rule)] bg-[var(--paper)] px-10 py-24"
    >
      <SectionHead marker="§03 · The Panel">
        Six buyers, instantiated from the{" "}
        <em
          className="italic text-[var(--accent)]"
          style={{ fontVariationSettings: '"opsz" 60, "wght" 360, "SOFT" 80' }}
        >
          actual voices
        </em>{" "}
        of your market.
      </SectionHead>

      <div className="jury-grid reveal grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {JURORS.map((j, i) => (
          <div
            key={i}
            className="juror relative flex cursor-pointer flex-col border border-[var(--rule)] bg-[rgba(255,252,244,0.4)] p-6 transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[8px_10px_0_var(--shadow)]"
            style={{ minHeight: 380 }}
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
              <span>{j.weight}</span>
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
