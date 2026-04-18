import SectionHead from "./SectionHead";

type Step = {
  num: string;
  title: React.ReactNode;
  body: string;
  tag: string;
};

const STEPS: Step[] = [
  {
    num: "STAGE 01",
    title: <>Market <em className="italic" style={{ fontVariationSettings: '"opsz" 40, "wght" 380, "SOFT" 80' }}>twin</em></>,
    body: "Apify actors fan out across competitor sites, pricing pages, changelogs, job posts, reviews, and the social discourse around your category. The twin is a living artifact that refreshes while you sleep.",
    tag: "Apify",
  },
  {
    num: "STAGE 02",
    title: <>Wedge <em className="italic" style={{ fontVariationSettings: '"opsz" 40, "wght" 380, "SOFT" 80' }}>discovery</em></>,
    body: "The agent surfaces the three narrative angles your competitors are underplaying. Not features. Positioning axes with room to run. Each wedge arrives with a source-of-truth trail.",
    tag: "Signal Mining",
  },
  {
    num: "STAGE 03",
    title: <>Jury <em className="italic" style={{ fontVariationSettings: '"opsz" 40, "wght" 380, "SOFT" 80' }}>deliberation</em></>,
    body: "Four synthetic buyers, composited from real public voices, interrogate each wedge in parallel. Champion, skeptic, economic buyer, technical blocker. They argue. They score. They dissent.",
    tag: "Minds AI",
  },
  {
    num: "STAGE 04",
    title: <>Campaign <em className="italic" style={{ fontVariationSettings: '"opsz" 40, "wght" 380, "SOFT" 80' }}>manufacture</em></>,
    body: "The winning wedge flows into Pixero, which generates the creative, the campaign strategy, and the media plan. Only the variants that pre-tested well in simulation ever see a real ad account.",
    tag: "Pixero",
  },
  {
    num: "STAGE 05",
    title: <>Launch <em className="italic" style={{ fontVariationSettings: '"opsz" 40, "wght" 380, "SOFT" 80' }}>plan</em></>,
    body: "Rory assembles the whole run into a single executable board. Owners, deadlines, assets, and an executive summary. You walk out with a launch, not a deck of suggestions.",
    tag: "Rory",
  },
];

export default function Method() {
  return (
    <section
      id="method"
      className="method relative border-b border-[var(--rule)] bg-[var(--paper-deep)] px-10 py-24"
    >
      <SectionHead marker="§02 · Method">
        The{" "}
        <em
          className="italic text-[var(--accent)]"
          style={{ fontVariationSettings: '"opsz" 60, "wght" 360, "SOFT" 80' }}
        >
          five stages
        </em>{" "}
        of a shadow launch.
      </SectionHead>

      <div className="steps reveal grid grid-cols-1 border-y border-[var(--ink)] md:grid-cols-2 xl:grid-cols-5">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={`step relative flex flex-col transition-[background] hover:bg-[rgba(255,252,244,0.6)] px-[22px] pt-8 pb-7 ${
              i < STEPS.length - 1 ? "xl:border-r xl:border-[var(--rule)]" : ""
            } border-b border-[var(--rule)] xl:border-b-0`}
            style={{ minHeight: 320 }}
          >
            <div className="step-num mb-5 font-mono text-[11px] tracking-[0.18em] text-[var(--accent)]">
              {step.num}
            </div>
            <h3
              className="mb-[14px] font-serif text-[26px] leading-[1.1] tracking-[-0.01em]"
              style={{ fontVariationSettings: '"opsz" 40, "wght" 400, "SOFT" 50' }}
            >
              {step.title}
            </h3>
            <p
              className="mb-5 text-[14px] leading-[1.5] text-[var(--muted)]"
              style={{ fontVariationSettings: '"opsz" 14, "wght" 380' }}
            >
              {step.body}
            </p>
            <span className="step-tag mt-auto inline-flex items-center gap-[6px] border-t border-dashed border-[var(--rule-soft)] pt-[14px] font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--ink-soft)]">
              <span className="block h-[6px] w-[6px] rounded-full bg-[var(--accent)]" />
              {step.tag}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
