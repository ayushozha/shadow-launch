"use client";

import { useEffect, useRef } from "react";

type Line = {
  ts: string;
  body: React.ReactNode;
  ok?: boolean;
};

const LINES: Line[] = [
  { ts: "[00:00]", body: <><span className="text-[var(--accent)]">init</span> shadow_launch.run(product_url)</> },
  { ts: "[00:04]", body: <>apify → crawling product + SERP</> },
  { ts: "[00:12]", body: <>product_profile synthesized / 7 claims</> },
  { ts: "[00:18]", body: <>competitor_discovery → 5 selected of 9</> },
  { ts: "[00:24]", body: <>apify → 25 social actors dispatched</> },
  { ts: "[00:52]", body: <>social_snapshots / 25 / 25 ok</> },
  { ts: "[01:01]", body: <>kalibr → gpt-4o · angles × 3</> },
  { ts: "[01:18]", body: <>openai:image → 12 assets generated</> },
  { ts: "[01:29]", body: <>calendar → 14 days · 28 slots</> },
  { ts: "[01:34]", body: <>minds → panel of 6 instantiated</> },
  { ts: "[01:47]", body: <>cfo_skeptic: <span className="text-[var(--accent)]">&quot;payback unclear&quot;</span></> },
  { ts: "[01:58]", body: <>marketing_vp: <span className="text-[var(--accent)]">&quot;angle 02 lands&quot;</span></> },
  { ts: "[02:11]", body: <>verdicts → 22 endorsed / 4 flagged</> },
  { ts: "[02:14]", body: <>✓ RUN COMPLETE / cost = $4.18</>, ok: true },
];

export default function HeroReadout() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const lines = rootRef.current.querySelectorAll<HTMLSpanElement>(".line");
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((el, i) => {
      const t = setTimeout(() => {
        el.style.transition = "opacity 0.5s ease";
        el.style.opacity = "1";
      }, 800 + i * 180);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="hero-side relative self-end animate-[floatIn_1s_cubic-bezier(0.2,0.7,0.2,1)_0.3s_both]">
      <div className="readout relative border border-[var(--rule)] bg-[rgba(255,252,244,0.5)]">
        <div className="readout-header flex items-center justify-between border-b border-[var(--rule)] bg-[var(--ink)] px-[14px] py-[10px] text-[var(--paper)]">
          <span className="font-mono text-[10px] tracking-[0.2em]">SIM_RUN / GTM-012</span>
          <div className="flex gap-[5px]">
            <span className="block h-[7px] w-[7px] rounded-full bg-[var(--accent)]" />
            <span className="block h-[7px] w-[7px] rounded-full bg-[var(--accent)]" />
            <span className="block h-[7px] w-[7px] rounded-full bg-[var(--accent)]" />
          </div>
        </div>

        <div
          ref={rootRef}
          className="readout-body px-[14px] py-[18px] font-mono text-[11px] leading-[1.9] text-[var(--ink-soft)]"
          style={{ minHeight: 360 }}
        >
          {LINES.map((line, i) => (
            <span key={i} className="line block opacity-0">
              {line.ok ? (
                <span className="text-[var(--phosphor)]">
                  {line.ts} {line.body}
                </span>
              ) : (
                <>
                  <span className="text-[var(--muted)]">{line.ts}</span>{" "}
                  {line.body}
                </>
              )}
            </span>
          ))}
        </div>

        <div className="readout-footer flex justify-between border-t border-[var(--rule)] px-[14px] py-[10px] font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--muted)]">
          <span>runtime · 00:02:14</span>
          <span>consensus · 0.78</span>
        </div>

        <div
          className="readout-stamp absolute flex items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[rgba(227,51,18,0.06)] text-center font-mono font-semibold text-[var(--accent)]"
          style={{
            top: -22,
            right: -14,
            width: 120,
            height: 120,
            fontSize: 10,
            letterSpacing: "0.14em",
            lineHeight: 1.3,
            padding: 12,
            opacity: 0,
            animation:
              "stampIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 2.2s forwards",
          }}
        >
          PRE<br />TESTED<br />NOT LIVE
        </div>
      </div>

      <style>{`
        @keyframes stampIn {
          0%   { opacity: 0;   transform: rotate(-12deg) scale(2.4); }
          60%  { opacity: 0.8; transform: rotate(-12deg) scale(0.92); }
          100% { opacity: 1;   transform: rotate(-12deg) scale(1); }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
