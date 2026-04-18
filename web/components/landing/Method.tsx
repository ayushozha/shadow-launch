import SectionHead from "./SectionHead";

type Step = {
  num: string;
  title: React.ReactNode;
  body: string;
  tag: string;
};

const STEPS: Step[] = [
  {
    num: "STEP 01",
    title: <>Research your <em className="italic" style={{ fontVariationSettings: '"opsz" 40, "wght" 380, "SOFT" 80' }}>product</em></>,
    body: "Apify crawls your site and the SERP around it. We reconstruct positioning claims, implicit audience, tone inventory, and the messaging gaps competitors are already exploiting.",
    tag: "Apify + OpenAI",
  },
  {
    num: "STEP 02",
    title: <>Discover the <em className="italic" style={{ fontVariationSettings: '"opsz" 40, "wght" 380, "SOFT" 80' }}>market</em></>,
    body: "Five to eight competitors surface automatically from Google, Product Hunt, and G2. Then a 25-actor Apify sweep scores their LinkedIn, X, Facebook, Instagram, and TikTok traction in parallel.",
    tag: "Apify · 25 actors",
  },
  {
    num: "STEP 03",
    title: <>Generate the <em className="italic" style={{ fontVariationSettings: '"opsz" 40, "wght" 380, "SOFT" 80' }}>campaign</em></>,
    body: "One to three positioning angles, each with hook lines, channel mix, and real image creative. Dropped into a 14-day content calendar sequenced against the cadence your competitors are already on.",
    tag: "OpenAI via Kalibr",
  },
  {
    num: "STEP 04",
    title: <>Pressure-test the <em className="italic" style={{ fontVariationSettings: '"opsz" 40, "wght" 380, "SOFT" 80' }}>plan</em></>,
    body: "Six synthetic buyer personas — Marketing VP, CFO Skeptic, Engineering Lead, Target End-User, Social Media Manager, PR Authority — react to every angle, every post, every image. Weighted consensus flags what ships and what gets revised.",
    tag: "Minds AI · 6 personas",
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
          four-step
        </em>{" "}
        flow from URL to a validated GTM plan.
      </SectionHead>

      <div className="steps reveal grid grid-cols-1 border-y border-[var(--ink)] md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={`step relative flex flex-col transition-[background] hover:bg-[rgba(255,252,244,0.6)] px-[22px] pt-8 pb-7 ${
              i < STEPS.length - 1 ? "xl:border-r xl:border-[var(--rule)]" : ""
            } border-b border-[var(--rule)] xl:border-b-0`}
            style={{ minHeight: 340 }}
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
