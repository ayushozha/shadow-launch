import SectionHead from "./SectionHead";

type Tool = { role: string; name: string; desc: string };

const TOOLS: Tool[] = [
  {
    role: "Research Dept.",
    name: "Apify",
    desc: "Six actors in parallel harvest the public web. Competitor pages, reviews, changelogs, discourse. The twin is only as honest as its intake.",
  },
  {
    role: "Voice Dept.",
    name: "Minds AI",
    desc: "High-fidelity buyer clones composited from real public voices. Not a chatbot. A jury that holds a persona across a multi-turn debate.",
  },
  {
    role: "Media Dept.",
    name: "Pixero",
    desc: "Turns the winning wedge into Meta-ready creative and a full campaign strategy. Only pre-tested variants reach production.",
  },
  {
    role: "Operations",
    name: "Kalibr",
    desc: "The nervous system. Adaptive routing, automatic recovery, model selection that sharpens across runs. Keeps the agent loop alive under real failure.",
  },
  {
    role: "Mission Control",
    name: "Rory",
    desc: "The human layer. Owners, timelines, executive summary, launch board. You end with a plan you can ship on Monday.",
  },
];

export default function Stack() {
  return (
    <section
      id="stack"
      className="stack relative bg-[var(--ink)] px-10 py-24 text-[var(--paper)]"
    >
      <SectionHead marker="§05 · Instrumentation" light>
        An agent system,{" "}
        <em
          className="italic text-[var(--accent)]"
          style={{ fontVariationSettings: '"opsz" 60, "wght" 360, "SOFT" 80' }}
        >
          not a demo
        </em>
        . Every tool does load-bearing work.
      </SectionHead>

      <div className="stack-grid reveal grid grid-cols-1 border-t border-[rgba(236,228,210,0.2)] md:grid-cols-2 xl:grid-cols-5">
        {TOOLS.map((t, i) => (
          <div
            key={i}
            className={`stack-item flex flex-col px-6 py-9 ${
              i < TOOLS.length - 1
                ? "xl:border-r xl:border-[rgba(236,228,210,0.15)]"
                : ""
            } border-b border-[rgba(236,228,210,0.15)] xl:border-b-0`}
            style={{ minHeight: 240 }}
          >
            <div className="stack-role mb-4 font-mono text-[10px] tracking-[0.18em] uppercase text-[rgba(236,228,210,0.5)]">
              {t.role}
            </div>
            <div
              className="stack-name mb-3 font-serif text-[28px] tracking-[-0.02em]"
              style={{ fontVariationSettings: '"opsz" 40, "wght" 400, "SOFT" 60' }}
            >
              <em className="italic text-[var(--accent)]">{t.name}</em>
            </div>
            <div
              className="stack-desc text-[13px] leading-[1.55] text-[rgba(236,228,210,0.75)]"
              style={{ fontVariationSettings: '"wght" 380' }}
            >
              {t.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
