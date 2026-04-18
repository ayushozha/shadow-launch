const TRACE_ITEMS: { k: string; msg: string }[] = [
  { k: "APIFY", msg: "scanning competitor_a.com / 412 signals indexed" },
  { k: "MINDS", msg: "instantiating buyer_clone: economic_buyer" },
  { k: "KALIBR", msg: "rerouting creative_gen after timeout on model_1" },
  { k: "PIXERO", msg: "compiling 42 meta variants for wedge_02" },
  { k: "RORY", msg: "launch_board assembled / 8 owners assigned" },
  { k: "APIFY", msg: "harvesting g2 reviews / sentiment delta -0.18" },
  { k: "MINDS", msg: "cfo_clone raises objection: payback_period" },
  { k: "JURY", msg: "deliberation round 3 / consensus at 0.74" },
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
