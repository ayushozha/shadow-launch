import HeroReadout from "./HeroReadout";

export default function Hero() {
  return (
    <header className="hero relative grid gap-[60px] border-b border-[var(--rule)] px-10 pb-10 pt-20 lg:grid-cols-[1.3fr_1fr]">
      <div className="hero-meta col-span-full mb-10 flex items-baseline justify-between border-b border-[var(--rule-soft)] pb-[14px] animate-[floatIn_1s_cubic-bezier(0.2,0.7,0.2,1)_0.05s_both]">
        <span className="mono text-[var(--muted)]">
          Issue N° 02 / GTM Field Manual
        </span>
        <span
          className="issue font-serif italic text-[13px] text-[var(--muted)] hidden md:inline"
          style={{ fontVariationSettings: '"opsz" 14, "wght" 400' }}
        >
          A GTM strategy simulator with synthetic validation
        </span>
        <span className="mono text-[var(--muted)]">04.18.26 / San Francisco</span>
      </div>

      <div className="hero-left">
        <h1
          className="font-serif mb-[38px] animate-[floatIn_1s_cubic-bezier(0.2,0.7,0.2,1)_0.15s_both]"
          style={{
            fontVariationSettings: '"opsz" 144, "wght" 420, "SOFT" 20',
            fontSize: "clamp(52px, 8.4vw, 120px)",
            lineHeight: 0.94,
            letterSpacing: "-0.035em",
            position: "relative",
          }}
        >
          Map your market.<br />
          Pressure-test your{" "}
          <span className="ghost-wrap relative inline-block" data-text="campaign.">
            <span
              className="italic text-[var(--ink-soft)]"
              style={{
                fontVariationSettings: '"opsz" 144, "wght" 380, "SOFT" 80',
              }}
            >
              campaign.
            </span>
          </span>
        </h1>

        <p
          className="hero-lede mb-8 max-w-[560px] text-[20px] leading-[1.5] text-[var(--ink-soft)] animate-[floatIn_1s_cubic-bezier(0.2,0.7,0.2,1)_0.5s_both]"
          style={{ fontVariationSettings: '"opsz" 14, "wght" 400, "SOFT" 50' }}
        >
          Drop in your product URL. Shadow Launch researches your company,
          discovers the market around you, analyzes competitors and their
          social traction, generates a proposed GTM campaign and content
          calendar, then pressure-tests every idea against a panel of six
          synthetic buyer personas before you launch.
        </p>

        <div className="hero-cta-row flex flex-wrap items-center gap-4 animate-[floatIn_1s_cubic-bezier(0.2,0.7,0.2,1)_0.7s_both]">
          <a
            href="#access"
            className="btn-primary group inline-flex cursor-pointer items-center gap-[10px] border border-[var(--ink)] bg-[var(--ink)] px-[22px] py-[14px] font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--paper)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]"
          >
            Run Shadow Launch
            <span className="inline-block transition-transform group-hover:translate-x-1">
              →
            </span>
          </a>
          <a
            href="#method"
            className="btn-secondary inline-flex items-center gap-2 border-b border-transparent px-2 py-[14px] font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--ink-soft)] transition-[border-color] hover:border-[var(--ink)]"
          >
            See the method
          </a>
        </div>
      </div>

      <HeroReadout />

      <style>{`
        .ghost-wrap::before {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          color: transparent;
          -webkit-text-stroke: 1px var(--shadow-strong);
          transform: translate(14px, 10px);
          z-index: -1;
          pointer-events: none;
          animation: ghost-drift 9s ease-in-out infinite;
        }
        @keyframes ghost-drift {
          0%, 100% { transform: translate(14px, 10px); }
          50%      { transform: translate(18px, 14px); }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </header>
  );
}
