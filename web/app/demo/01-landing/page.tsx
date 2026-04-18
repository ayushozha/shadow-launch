"use client";

import Link from "next/link";
import { useState } from "react";
import DemoNav from "@/components/demo/DemoNav";
import StepPager from "@/components/demo/StepPager";
import TraceTicker from "@/components/landing/TraceTicker";

const SAMPLES = [
  { label: "Linear",   url: "https://linear.app" },
  { label: "Ramp",     url: "https://ramp.com" },
  { label: "Granola",  url: "https://granola.ai" },
  { label: "Posthog",  url: "https://posthog.com" },
];

const PIPELINE = [
  { n: "01", agent: "Scan",    tool: "Apify",    note: "Scrape the product URL. Category, positioning, features, pricing."    },
  { n: "02", agent: "Map",     tool: "Apify",    note: "Five competitors found. LinkedIn, X, Facebook, Instagram, TikTok scraped." },
  { n: "03", agent: "Plan",    tool: "Claude",   note: "GTM strategy. Image prompts. Campaign concept."                         },
  { n: "04", agent: "Studio",  tool: "Image gen",note: "Creative assets. Ad variants. Fourteen-day content calendar."           },
  { n: "05", agent: "Jury",    tool: "Minds AI", note: "Five personas debate every idea. Reactions feed the results."           },
];

export default function LandingSimulation() {
  const [productUrl, setProductUrl] = useState("https://example-app.com");
  const [pressed, setPressed] = useState(false);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  const canSubmit = productUrl.trim().length > 0;

  return (
    <>
      <TraceTicker />
      <DemoNav step="§01 · Landing" />

      <main className="flex-1">
        <section className="px-10 pt-14 pb-10 md:px-20">
          <div className="grid gap-14 md:grid-cols-[5fr_4fr] md:gap-20">
            {/* LEFT · HERO */}
            <div className="flex flex-col gap-10">
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
                §01 · Landing · /  ·  Simulation
              </span>

              <h1
                className="font-serif text-[var(--ink)]"
                style={{
                  fontVariationSettings: '"opsz" 144, "wght" 340, "SOFT" 20',
                  fontSize: "clamp(52px, 8vw, 120px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.035em",
                }}
              >
                <span className="block">Drop a URL.</span>
                <span className="block">
                  Rehearse the{" "}
                  <span className="ghost-wrap relative inline-block" data-text="launch">
                    <em className="italic text-[var(--accent)]">launch</em>
                  </span>
                  .
                </span>
              </h1>

              <p
                className="max-w-[520px] text-[var(--ink-soft)]"
                style={{
                  fontSize: "19px",
                  lineHeight: 1.5,
                  fontVariationSettings: '"opsz" 32, "wght" 400',
                }}
              >
                Apify scrapes your product, hunts{" "}
                <em className="text-[var(--accent)]">five competitors</em>, and
                reads their engagement across LinkedIn, X, Facebook, Instagram,
                and TikTok. The system drafts a GTM plan, generates creative,
                and stacks a fourteen-day content calendar. Then a jury of five
                personas debates every idea before you commit a dollar.
              </p>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-[var(--rule)] pt-5">
                <StatChip label="Runtime"      value="~2 min"   />
                <StatChip label="Competitors"  value="5"        />
                <StatChip label="Channels"     value="5 social" />
                <StatChip label="Jury"         value="5 personas" />
                <StatChip label="Real spend"   value="$0" accent />
              </div>
            </div>

            {/* RIGHT · INPUT CARD */}
            <div className="relative flex flex-col gap-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPressed(true);
                  setTimeout(() => setPressed(false), 2200);
                }}
                className="relative border border-[var(--rule)] bg-[var(--paper)] p-8 md:p-10"
              >
                <div className="flex items-center justify-between border-b border-[var(--rule)] pb-4">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">
                    Input · New Run
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--accent)]">
                    One field only
                  </span>
                </div>

                <label className="mt-7 flex flex-col gap-2">
                  <span
                    className="font-mono uppercase text-[var(--muted)]"
                    style={{ fontSize: "10px", letterSpacing: "0.18em" }}
                  >
                    Product URL
                  </span>
                  <input
                    type="url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://your-product.com"
                    className="border-b-2 border-[var(--ink)] bg-transparent pb-3 font-serif text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                    style={{
                      fontSize: "22px",
                      fontVariationSettings: '"opsz" 36, "wght" 420',
                    }}
                  />
                </label>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
                    Or try
                  </span>
                  {SAMPLES.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setProductUrl(s.url)}
                      className="border border-[var(--rule)] bg-transparent px-3 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="mt-9 flex items-center justify-between border-t border-[var(--rule)] pt-6">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
                    POST · /api/runs
                  </span>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--paper)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {pressed ? "Redirecting →" : "Rehearse the launch"}
                  </button>
                </div>

                {pressed ? (
                  <div className="pointer-events-none absolute inset-0 flex items-end justify-end bg-[rgba(236,228,210,0.65)] p-10 backdrop-blur-[2px]">
                    <div className="max-w-sm border border-[var(--accent)] bg-[var(--paper)] p-5">
                      <span className="block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--accent)]">
                        Simulated redirect
                      </span>
                      <p
                        className="mt-3 text-[var(--ink)]"
                        style={{ fontSize: "15px", lineHeight: 1.4 }}
                      >
                        In the real app this POSTs and routes to{" "}
                        <span className="font-mono text-[12px]">
                          /run/{"{run_id}"}
                        </span>
                        . Watch the pipeline next →{" "}
                        <Link
                          href="/demo/02-run"
                          className="text-[var(--accent)] underline underline-offset-2"
                        >
                          open the live run
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                ) : null}
              </form>

              {/* PIPELINE PREVIEW · hovering a stage keeps it highlighted */}
              <div className="border border-[var(--rule)] bg-[var(--paper-deep)] p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">
                    What happens when you click run
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">
                    5 stages
                  </span>
                </div>
                <ul className="mt-4">
                  {PIPELINE.map((s, i) => (
                    <li
                      key={s.n}
                      onMouseEnter={() => setHoveredStage(s.n)}
                      onMouseLeave={() => setHoveredStage(null)}
                      className={`group grid cursor-default grid-cols-[30px_100px_80px_1fr] items-baseline gap-3 border-b border-[var(--rule-soft)] px-1 py-3 transition-colors last:border-b-0 ${
                        hoveredStage === s.n
                          ? "bg-[var(--paper)]"
                          : ""
                      }`}
                    >
                      <span
                        className={`font-mono text-[10px] tracking-[0.18em] uppercase ${
                          hoveredStage === s.n
                            ? "text-[var(--accent)]"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {s.n}
                      </span>
                      <span
                        className="font-serif text-[var(--ink)]"
                        style={{
                          fontSize: "18px",
                          fontVariationSettings: '"opsz" 24, "wght" 440, "SOFT" 50',
                        }}
                      >
                        {s.agent}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--accent)]">
                        {s.tool}
                      </span>
                      <span
                        className="text-[var(--ink-soft)]"
                        style={{ fontSize: "14px", lineHeight: 1.45 }}
                      >
                        {s.note}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <style>{`
          .ghost-wrap::before {
            content: attr(data-text);
            position: absolute;
            left: 0;
            top: 0;
            color: transparent;
            -webkit-text-stroke: 1px var(--shadow-strong);
            font-style: italic;
            transform: translate(14px, 10px);
            z-index: -1;
            animation: ghost-drift 9s ease-in-out infinite;
            pointer-events: none;
          }
          @keyframes ghost-drift {
            0%, 100% { transform: translate(14px, 10px); }
            50% { transform: translate(18px, 14px); }
          }
        `}</style>

        <StepPager
          prev={{ label: "Index", marker: "§00", href: "/demo" }}
          next={{ label: "Live Run", marker: "§02", href: "/demo/02-run" }}
        />
      </main>
    </>
  );
}

function StatChip({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
        {label}
      </span>
      <span
        className={`mt-1 font-serif ${
          accent ? "text-[var(--accent)]" : "text-[var(--ink)]"
        }`}
        style={{
          fontSize: "20px",
          fontVariationSettings: '"opsz" 28, "wght" 440',
        }}
      >
        {value}
      </span>
    </div>
  );
}
