const TRACE_ITEMS: { k: string; msg: string }[] = [
  { k: "APIFY", msg: "crawling product_url / 412 signals indexed" },
  { k: "APIFY", msg: "SERP sweep → 9 competitors discovered / 5 selected" },
  { k: "APIFY", msg: "25 social actors dispatched · 8 in flight" },
  { k: "KALIBR", msg: "goal=research_synthesis → gpt-4o" },
  { k: "OPENAI", msg: "image_gen → 4 assets for angle_02" },
  { k: "KALIBR", msg: "rerouted image_gen: gpt-image-1 → dall-e-3" },
  { k: "CALENDAR", msg: "14 days × 5 channels / 28 slots sequenced" },
  { k: "MINDS", msg: "panel_6 instantiated / cfo_skeptic spark ready" },
  { k: "MINDS", msg: "cfo_skeptic objection: payback_period_unclear" },
  { k: "MINDS", msg: "round_2 rebuttal → marketing_vp vs cfo_skeptic" },
  { k: "VERDICT", msg: "angle_02 consensus 0.78 · action_required=false" },
  { k: "KALIBR", msg: "run cost $4.18 · 3 reroutes · 0 interventions" },
];

export default function TraceTicker() {
  // Duplicate content for seamless -50% keyframe loop.
  const doubled = [...TRACE_ITEMS, ...TRACE_ITEMS];

  return (
    <div
      aria-hidden="true"
      className="trace-bar relative flex h-[26px] items-center overflow-hidden border-b border-[var(--rule)] bg-[var(--ink)] text-[var(--paper)] z-10"
    >
      <div className="trace-label flex h-full flex-shrink-0 items-center whitespace-nowrap bg-[var(--accent)] px-[14px] font-mono text-[10px] tracking-[0.2em] text-[var(--paper)]">
        LIVE / SIMULATION TRACE
      </div>
      <div className="trace-stream flex gap-12 pl-12 whitespace-nowrap font-mono text-[10px] tracking-[0.12em] text-[var(--paper)]">
        {doubled.map((item, i) => (
          <span key={i} className="opacity-85">
            <span className="k mr-[6px] text-[var(--accent)] opacity-100">
              {item.k}
            </span>
            {item.msg}
          </span>
        ))}
      </div>

      <style>{`
        .trace-label::before {
          content: "\u25CF";
          margin-right: 8px;
          animation: trace-blink 1.4s infinite;
        }
        @keyframes trace-blink {
          0%, 60% { opacity: 1; }
          70%, 100% { opacity: 0.2; }
        }
        .trace-stream { animation: trace-slide 48s linear infinite; }
        .trace-stream span { opacity: 0.85; }
        .trace-stream .k { color: var(--accent); opacity: 1; }
        @keyframes trace-slide {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
