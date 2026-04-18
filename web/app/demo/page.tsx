import Link from "next/link";
import DemoNav from "@/components/demo/DemoNav";

export const metadata = {
  title: "Shadow Launch / Demo Walkthrough",
  description:
    "Three simulated screens showing what a Shadow Launch run looks like. Apify scrapes, Minds debates, you ship.",
};

type Preview = {
  href: string;
  marker: string;
  title: string;
  accentTitle: string;
  hook: string;
  thumb: React.ReactNode;
};

const PREVIEWS: Preview[] = [
  {
    href: "/demo/01-landing",
    marker: "§01 · Landing",
    title: "Drop a URL.",
    accentTitle: "Rehearse.",
    hook: "One URL in. Apify scrapes the product and hunts five competitors across LinkedIn, X, Facebook, Instagram, and TikTok.",
    thumb: <LandingThumb />,
  },
  {
    href: "/demo/02-run",
    marker: "§02 · Live Run",
    title: "Five stages,",
    accentTitle: "live.",
    hook: "Scan · Map · Plan · Studio · Jury. Each stage renders its own deliverable while the trace panel streams alongside it.",
    thumb: <RunThumb />,
  },
  {
    href: "/demo/03-results",
    marker: "§03 · Results",
    title: "Creative,",
    accentTitle: "debated.",
    hook: "Product brief, competitor social matrix, GTM plan, six creatives with per-persona reactions, and a fourteen-day content calendar.",
    thumb: <ResultsThumb />,
  },
];

export default function DemoIndex() {
  return (
    <>
      <DemoNav />

      <main className="flex-1">
        <section className="px-10 pt-24 pb-16 md:px-20">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
            §00 · Walkthrough · Dummy Data
          </span>
          <h1
            className="mt-8 max-w-[1100px] font-serif text-[var(--ink)]"
            style={{
              fontVariationSettings: '"opsz" 120, "wght" 360, "SOFT" 30',
              fontSize: "clamp(56px, 9vw, 132px)",
              lineHeight: 0.92,
              letterSpacing: "-0.035em",
            }}
          >
            Scrape. Plan. <em className="text-[var(--accent)]">Debate</em>.
          </h1>
          <p
            className="mt-10 max-w-[720px] text-[var(--ink-soft)]"
            style={{ fontSize: "22px", lineHeight: 1.4 }}
          >
            Apify researches your product and five competitors across every
            major social channel. The system drafts a GTM plan, generates
            creative, and sequences a fourteen-day calendar. A jury of five
            Minds personas debates every idea before it ships. Click a card to
            open a simulated version of that screen.
          </p>
        </section>

        <section className="border-t border-[var(--rule)] bg-[var(--paper-deep)] px-10 py-20 md:px-20 md:py-[96px]">
          <div className="grid gap-0 md:grid-cols-3">
            {PREVIEWS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="group relative flex flex-col border border-[var(--rule)] bg-transparent transition-colors hover:bg-[var(--paper)]"
              >
                <div className="aspect-[4/3] overflow-hidden border-b border-[var(--rule)] bg-[var(--paper)]">
                  {p.thumb}
                </div>
                <div className="flex flex-col gap-6 p-8">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
                    {p.marker}
                  </span>
                  <h3
                    className="font-serif text-[var(--ink)]"
                    style={{
                      fontVariationSettings: '"opsz" 60, "wght" 380, "SOFT" 30',
                      fontSize: "clamp(28px, 2.8vw, 40px)",
                      lineHeight: 1.02,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {p.title}{" "}
                    <em className="text-[var(--accent)]">{p.accentTitle}</em>
                  </h3>
                  <p
                    className="max-w-[420px] text-[var(--ink-soft)]"
                    style={{ fontSize: "16px", lineHeight: 1.5 }}
                  >
                    {p.hook}
                  </p>
                  <span className="mt-2 font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
                    Open simulation →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

// --- inline thumbnail sketches --------------------------------------------

function LandingThumb() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-[10%] items-center border-b border-[var(--rule)] bg-[var(--ink)] px-3">
        <span className="font-mono text-[7px] tracking-[0.22em] text-[var(--accent)]">
          LIVE / SIMULATION TRACE
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <span className="font-mono text-[7px] tracking-[0.2em] uppercase text-[var(--muted)]">
          §01 · Drop a URL
        </span>
        <span
          className="font-serif leading-[0.95] text-[var(--ink)]"
          style={{
            fontSize: "24px",
            fontVariationSettings: '"opsz" 90, "wght" 360',
            letterSpacing: "-0.03em",
          }}
        >
          Rehearse the{" "}
          <em className="text-[var(--accent)]">launch</em>.
        </span>
        <div className="flex flex-col gap-2 border-t border-[var(--rule-soft)] pt-3">
          <span className="font-mono text-[6px] tracking-[0.18em] uppercase text-[var(--muted)]">
            Product URL
          </span>
          <div className="h-[2px] bg-[var(--ink)]" />
          <div className="mt-1 flex items-center justify-between">
            <div className="flex gap-1">
              {["Linear", "Ramp", "Granola"].map((s) => (
                <span
                  key={s}
                  className="border border-[var(--rule)] px-[3px] py-[1px] font-mono text-[6px] tracking-[0.12em] uppercase text-[var(--ink)]"
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="bg-[var(--ink)] px-2 py-1">
              <span className="font-mono text-[6px] tracking-[0.18em] uppercase text-[var(--paper)]">
                Rehearse →
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RunThumb() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-[10%] items-center border-b border-[var(--rule)] bg-[var(--ink)] px-3">
        <span className="font-mono text-[7px] tracking-[0.22em] text-[var(--accent)]">
          RUN · DEMO-001
        </span>
      </div>
      <div className="flex-1 grid grid-cols-[3fr_2fr] gap-3 p-4">
        <div className="flex flex-col gap-[6px]">
          {[
            { state: "done", label: "01 · Scan" },
            { state: "done", label: "02 · Map" },
            { state: "run",  label: "03 · Plan" },
            { state: "idle", label: "04 · Studio" },
            { state: "idle", label: "05 · Jury" },
          ].map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 border-l-2 px-2 py-[4px] ${
                s.state === "run"
                  ? "border-[var(--accent)] bg-[rgba(227,51,18,0.05)]"
                  : s.state === "done"
                  ? "border-[var(--phosphor)] bg-transparent"
                  : "border-[var(--rule-soft)] bg-transparent"
              }`}
            >
              <span className="font-mono text-[7px] tracking-[0.18em] uppercase text-[var(--muted)]">
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col border border-[var(--rule)] bg-[var(--ink)] p-2">
          <div className="space-y-1">
            {[
              "scout · STAGE 01 done",
              "apify · 5 competitors",
              "apify · tiktok scored",
              "strategist · plan draft",
              "kalibr · rerouted · recovered",
            ].map((l, i) => (
              <div
                key={i}
                className="truncate font-mono text-[6px] tracking-[0.08em] text-[rgba(236,228,210,0.7)]"
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsThumb() {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-[10%] items-center border-b border-[var(--rule)] bg-[var(--ink)] px-3">
        <span className="font-mono text-[7px] tracking-[0.22em] text-[var(--accent)]">
          RESULTS · CREATIVE + JURY
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <span className="font-mono text-[7px] tracking-[0.2em] uppercase text-[var(--muted)]">
          §01 · Product
        </span>
        <span
          className="font-serif leading-[0.95] text-[var(--ink)]"
          style={{
            fontSize: "18px",
            fontVariationSettings: '"opsz" 90, "wght" 360',
            letterSpacing: "-0.03em",
          }}
        >
          Every manual task,{" "}
          <em className="text-[var(--accent)]">automated</em>.
        </span>

        <div className="mt-1 grid grid-cols-6 gap-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`aspect-[4/5] border ${
                i === 2
                  ? "border-[var(--accent)] bg-[var(--paper)]"
                  : "border-[var(--rule)] bg-[var(--paper-deep)]"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {["C", "E", "B", "S", "U"].map((m) => (
              <div
                key={m}
                className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[var(--ink)]"
              >
                <span
                  className="font-serif italic text-[var(--paper)]"
                  style={{ fontSize: "8px" }}
                >
                  {m}
                </span>
              </div>
            ))}
          </div>
          <span className="font-mono text-[7px] tracking-[0.14em] uppercase text-[var(--accent)]">
            Jury · +0.72
          </span>
        </div>

        <div className="mt-auto grid grid-cols-7 gap-[2px]">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className={`h-[8px] border ${
                i % 3 === 0 || i === 6 || i === 9
                  ? "border-[var(--rule)] bg-[var(--paper)]"
                  : "border-[var(--rule-soft)] bg-[var(--paper-deep)]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
