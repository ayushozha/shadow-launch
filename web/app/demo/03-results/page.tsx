"use client";

import { useState } from "react";
import DemoNav from "@/components/demo/DemoNav";
import StepPager from "@/components/demo/StepPager";
import TraceTicker from "@/components/landing/TraceTicker";

// ---------------------------------------------------------------------------
// Dummy data
// ---------------------------------------------------------------------------

const PRODUCT = {
  title: "example-app.com",
  category: "Ops automation",
  positioning: "Save hours a sprint by automating every manual task.",
  features: ["automation rules", "templates", "alerts", "audit log", "slack sync"],
};

type Competitor = {
  name: string;
  social: { linkedin: number; x: number; facebook: number; instagram: number; tiktok: number };
  followers: number;
  note: string;
};

const COMPETITORS: Competitor[] = [
  { name: "competitor-alpha.io",   social: { linkedin: 78, x: 64, facebook: 32, instagram: 42, tiktok: 12 }, followers: 48200,  note: "Heavy on LinkedIn thought-leadership." },
  { name: "rival-beta.com",        social: { linkedin: 44, x: 88, facebook: 22, instagram: 30, tiktok: 74 }, followers: 91400,  note: "X and TikTok first. Low FB." },
  { name: "contender-gamma.co",    social: { linkedin: 55, x: 38, facebook: 68, instagram: 72, tiktok: 24 }, followers: 132000, note: "Instagram-led creative, strong FB group." },
  { name: "parallel-delta.app",    social: { linkedin: 38, x: 26, facebook: 18, instagram: 86, tiktok: 68 }, followers: 64500,  note: "Creator-driven. IG and TikTok dominant." },
  { name: "legacy-epsilon.net",    social: { linkedin: 82, x: 42, facebook: 58, instagram: 28, tiktok: 6  }, followers: 18700,  note: "Enterprise legacy, low tiktok traction." },
];

const PLAN = [
  { title: "Target audience",  body: "VP Ops leaders at fifty to five hundred person B2B SaaS companies. Inherited stack: spreadsheets plus one legacy platform the CFO signed two years ago." },
  { title: "Positioning",      body: "Every manual task, automated. Not features. Not knobs. Opinionated defaults that remove decisions." },
  { title: "Channel strategy", body: "LinkedIn and X primary, where engagement across competitors is highest. Instagram for builder visibility. TikTok as the experimental flex channel." },
  { title: "GTM moves",        body: "Four load-bearing moves over fourteen days: configuration benchmark, migration playbook, founder POV thread, pre-validated ad set." },
  { title: "Metric to watch",  body: "Median time-to-first-value under ninety seconds. Below that, the wedge holds." },
];

type Persona = { id: string; monogram: string; role: string; descriptor: string; weight: number };
const PERSONAS: Persona[] = [
  { id: "champion", monogram: "C", role: "Champion",         descriptor: "VP Ops, 200-person SaaS",  weight: 0.20 },
  { id: "economic", monogram: "E", role: "Economic Buyer",   descriptor: "CFO, signs the PO",        weight: 0.30 },
  { id: "blocker",  monogram: "B", role: "Technical Blocker", descriptor: "Staff Platform Engineer", weight: 0.20 },
  { id: "skeptic",  monogram: "S", role: "Skeptic",          descriptor: "Head of PMO",              weight: 0.15 },
  { id: "user",     monogram: "U", role: "Power User",       descriptor: "Day-one operator",          weight: 0.15 },
];

type Creative = {
  id: number;
  concept: string;
  headline: string;
  body: string;
  channel: "LinkedIn" | "X" | "Instagram" | "Facebook" | "TikTok";
  reactions: Record<string, { quote: string; score: number }>;
};

const CREATIVES: Creative[] = [
  {
    id: 1,
    concept: "The Six-Month Tool",
    headline: "Your PM tool took six months to set up. Ours takes an afternoon.",
    body: "Every competitor sells infinite customisation. We ship opinions, not knobs. Opinionated defaults are a time machine.",
    channel: "LinkedIn",
    reactions: {
      champion: { quote: "Clean. I can send this to my engineers without flinching.",           score: 0.86 },
      economic: { quote: "Time-to-setup maps directly to cost. CFOs parse this one.",           score: 0.78 },
      blocker:  { quote: "Assumes our workflow fits the defaults. Not always true at scale.",    score: 0.38 },
      skeptic:  { quote: "Familiar frame. Needs a proof point specific to this category.",      score: 0.22 },
      user:     { quote: "If the afternoon claim is real, I want in.",                          score: 0.74 },
    },
  },
  {
    id: 2,
    concept: "Configuration is a Tax",
    headline: "Configuration is a tax your team pays every sprint.",
    body: "Forty-seven custom fields. Twelve ticket types. If the tool needs that much setup, the setup is the product.",
    channel: "X",
    reactions: {
      champion: { quote: "Perfect framing. My Monday standups will quote this.",                score: 0.91 },
      economic: { quote: "Tax is a CFO word. Good instinct.",                                   score: 0.81 },
      blocker:  { quote: "The numbers need a citation. Otherwise this reads as rhetoric.",      score: 0.32 },
      skeptic:  { quote: "Agreed, but show what opinionation costs when the cage tightens.",    score: 0.35 },
      user:     { quote: "Felt seen. I would share this thread.",                               score: 0.82 },
    },
  },
  {
    id: 3,
    concept: "Reports for Free",
    headline: "We built the tool for engineers. The PMO gets the reports for free.",
    body: "Project tools are usually designed for the PMO and retrofitted onto engineering. We inverted the stack. Engineers first, reports as a byproduct.",
    channel: "LinkedIn",
    reactions: {
      champion: { quote: "This is the one I would pin to my profile.",                           score: 0.92 },
      economic: { quote: "PMO still reads the reports. Works for both sides of the table.",      score: 0.71 },
      blocker:  { quote: "'Free' is doing a lot of work. Clarify how reports are generated.",    score: 0.45 },
      skeptic:  { quote: "Inverting the stack is a strong claim. Proof at enterprise scale?",   score: 0.28 },
      user:     { quote: "Byproduct-as-feature is a vibe.",                                     score: 0.68 },
    },
  },
  {
    id: 4,
    concept: "Take the Week Back",
    headline: "Your team spends 12 hours a week on ticket hygiene. Take that week back.",
    body: "The best tool disappears after setup. Average migrated team saves eleven hours per sprint in the first ninety days.",
    channel: "Instagram",
    reactions: {
      champion: { quote: "Specific, measurable. I can forward this.",                           score: 0.84 },
      economic: { quote: "Hours saved to dollars saved is the story I need.",                    score: 0.88 },
      blocker:  { quote: "Verify the eleven hours figure before this runs.",                    score: 0.31 },
      skeptic:  { quote: "Sample size? N matters.",                                             score: 0.18 },
      user:     { quote: "Twelve hours a week feels low, honestly.",                            score: 0.58 },
    },
  },
  {
    id: 5,
    concept: "It Is Okay to Switch",
    headline: "You picked Jira two years ago. It is okay to switch now.",
    body: "Tools age. Companies change. The decision that was right at 50 people is wrong at 200. Migrate before the config debt compounds.",
    channel: "LinkedIn",
    reactions: {
      champion: { quote: "Gives cover to my PMO to have the conversation.",                      score: 0.79 },
      economic: { quote: "Sunk-cost reframe. Finance-committee approved.",                      score: 0.72 },
      blocker:  { quote: "Migration path is the unsaid part. Link the playbook.",               score: 0.48 },
      skeptic:  { quote: "This is the one that addresses me directly. Thank you.",              score: 0.58 },
      user:     { quote: "Every ops lead I know needs this framing.",                            score: 0.78 },
    },
  },
  {
    id: 6,
    concept: "Before You Hire",
    headline: "Before you hire three more ops, try this.",
    body: "Headcount is not the only answer. One opinionated tool swap replaces two FTE of coordination work.",
    channel: "TikTok",
    reactions: {
      champion: { quote: "Bold claim. I would test it with a real story.",                      score: 0.56 },
      economic: { quote: "Replacing headcount is a budget line I care about.",                  score: 0.82 },
      blocker:  { quote: "Dangerous positioning. Ops isn't just tool work.",                    score: -0.12 },
      skeptic:  { quote: "Overclaiming. Pull back to one FTE equivalent.",                      score: -0.05 },
      user:     { quote: "If I was hiring, this would make me pause.",                          score: 0.62 },
    },
  },
];

const CALENDAR = [
  { day: 1,  channel: "LinkedIn",  kind: "Founder POV thread",          creativeId: 3 },
  { day: 2,  channel: "X",         kind: "Thread · wedge reveal",        creativeId: 2 },
  { day: 3,  channel: "Instagram", kind: "Reel · launch teaser",         creativeId: 4 },
  { day: 4,  channel: "LinkedIn",  kind: "Data study post",              creativeId: 1 },
  { day: 5,  channel: "Facebook",  kind: "Community invite",             creativeId: 3 },
  { day: 6,  channel: "TikTok",    kind: "Founder explain",              creativeId: 6 },
  { day: 7,  channel: "LinkedIn",  kind: "Ad rotation · v2",             creativeId: 1 },
  { day: 8,  channel: "X",         kind: "Customer story",               creativeId: 5 },
  { day: 9,  channel: "Instagram", kind: "Static · numbers",             creativeId: 4 },
  { day: 10, channel: "LinkedIn",  kind: "Migration playbook",           creativeId: 5 },
  { day: 11, channel: "TikTok",    kind: "Behind the build",             creativeId: 6 },
  { day: 12, channel: "X",         kind: "Thread · metric reveal",       creativeId: 2 },
  { day: 13, channel: "Instagram", kind: "Reel · customer win",          creativeId: 4 },
  { day: 14, channel: "LinkedIn",  kind: "Retro + CTA",                  creativeId: 3 },
];

const TOP_DISSENT = [
  { creativeId: 6, juror: "blocker", line: "Overclaiming. Ops isn't just tool work. Pull back." },
  { creativeId: 4, juror: "skeptic", line: "Sample size missing on the 11-hour figure." },
  { creativeId: 1, juror: "skeptic", line: "Framing is familiar. Category-specific proof point needed." },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ResultsSimulation() {
  const [selectedCreative, setSelectedCreative] = useState<number>(3);
  const [activeChannel, setActiveChannel] = useState<string>("all");

  const selected = CREATIVES.find((c) => c.id === selectedCreative)!;
  const selectedAvg = averageScore(selected);

  const visibleCalendar =
    activeChannel === "all" ? CALENDAR : CALENDAR.filter((c) => c.channel === activeChannel);

  return (
    <>
      <TraceTicker />
      <DemoNav step="§03 · Results" />

      <main className="flex-1">
        {/* -------- §01 · PRODUCT VERDICT -------- */}
        <section className="border-b border-[var(--rule)] px-10 pt-20 pb-20 md:px-20">
          <div className="grid items-end gap-10 md:grid-cols-[5fr_2fr]">
            <div>
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
                Product · scanned · positioned
              </span>
              <h1
                className="mt-5 font-serif text-[var(--ink)]"
                style={{
                  fontVariationSettings: '"opsz" 144, "wght" 340, "SOFT" 20',
                  fontSize: "clamp(52px, 8vw, 120px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.035em",
                }}
              >
                <em className="text-[var(--accent)]">{PRODUCT.positioning}</em>
              </h1>
              <div className="mt-8 grid gap-6 md:grid-cols-4">
                <Metric label="Product"         value={PRODUCT.title} />
                <Metric label="Category"        value={PRODUCT.category} />
                <Metric label="Competitors"     value="5" accent />
                <Metric label="Jury consensus"  value="0.652" accent />
              </div>
              <div className="mt-8">
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
                  Features detected
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRODUCT.features.map((f) => (
                    <span
                      key={f}
                      className="border border-[var(--rule)] bg-[var(--paper)] px-3 py-1 font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--ink)]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <Stamp />
            </div>
          </div>
        </section>

        {/* -------- §02 · COMPETITOR SOCIAL MATRIX -------- */}
        <section className="border-b border-[var(--rule)] bg-[var(--paper-deep)] px-10 py-[96px] md:px-20">
          <SectionHead
            marker="§02 · Competitors · 5 across 5 channels"
            title="The field,"
            accent="measured."
          />
          <div className="border border-[var(--rule)] bg-[var(--paper)]">
            <div className="grid grid-cols-[1.8fr_repeat(5,_minmax(0,1fr))_100px] items-center gap-x-3 border-b border-[var(--rule)] px-5 py-3">
              <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--muted)]">Competitor</span>
              {[
                { k: "LI", name: "LinkedIn" },
                { k: "X",  name: "X" },
                { k: "FB", name: "Facebook" },
                { k: "IG", name: "Instagram" },
                { k: "TT", name: "TikTok" },
              ].map((p) => (
                <div key={p.k} className="text-center">
                  <span className="block font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--muted)]">
                    {p.k}
                  </span>
                </div>
              ))}
              <span className="text-right font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--muted)]">
                Followers
              </span>
            </div>
            {COMPETITORS.map((c) => (
              <div
                key={c.name}
                className="grid grid-cols-[1.8fr_repeat(5,_minmax(0,1fr))_100px] items-center gap-x-3 border-b border-[var(--rule-soft)] px-5 py-5 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="font-mono text-[12px] tracking-[0.02em] text-[var(--ink)]">
                    {c.name}
                  </span>
                  <span className="mt-1 font-mono text-[10px] tracking-[0.04em] text-[var(--muted)]">
                    {c.note}
                  </span>
                </div>
                <EngagementCell value={c.social.linkedin} />
                <EngagementCell value={c.social.x} />
                <EngagementCell value={c.social.facebook} />
                <EngagementCell value={c.social.instagram} />
                <EngagementCell value={c.social.tiktok} />
                <span className="text-right font-mono text-[12px] tracking-[0.08em] text-[var(--ink)]">
                  {shortNum(c.followers)}
                </span>
              </div>
            ))}
          </div>
          <p
            className="mt-6 max-w-[720px] text-[var(--ink-soft)]"
            style={{ fontSize: "16px", lineHeight: 1.55 }}
          >
            <em>Read:</em> LinkedIn is where the category sells. TikTok is contested
            (rival-beta and parallel-delta dominate). Facebook is a sleep channel
            across the whole set. The channel strategy downstream weights toward
            LinkedIn and X primary, Instagram for reach, TikTok as an experimental flex.
          </p>
        </section>

        {/* -------- §03 · GTM PLAN -------- */}
        <section className="border-b border-[var(--rule)] px-10 py-[96px] md:px-20">
          <SectionHead marker="§03 · GTM plan · synthesised" title="The" accent="strategy." />
          <div className="grid gap-4 md:grid-cols-2">
            {PLAN.map((p) => (
              <div
                key={p.title}
                className="border border-[var(--rule)] bg-[var(--paper)] p-7"
              >
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--accent)]">
                  {p.title}
                </span>
                <p
                  className="mt-4 text-[var(--ink)]"
                  style={{ fontSize: "17px", lineHeight: 1.5 }}
                >
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* -------- §04 · CREATIVE GALLERY + JURY REACTIONS -------- */}
        <section className="border-b border-[var(--rule)] bg-[var(--paper-deep)] px-10 py-[96px] md:px-20">
          <SectionHead
            marker="§04 · Creative · 6 variants · click one"
            title="Each variant,"
            accent="debated."
          />
          <p
            className="mb-10 max-w-[720px] text-[var(--ink-soft)]"
            style={{ fontSize: "16px", lineHeight: 1.55 }}
          >
            Click any creative below to see how the five personas reacted to it.
            Scores weighted by persona role. The jury is the last filter before
            spend.
          </p>

          <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {CREATIVES.map((c) => (
                <CreativeCard
                  key={c.id}
                  c={c}
                  avg={averageScore(c)}
                  active={c.id === selectedCreative}
                  onClick={() => setSelectedCreative(c.id)}
                />
              ))}
            </div>

            <aside className="border border-[var(--accent)] bg-[var(--paper)] p-7">
              <div className="flex items-center justify-between border-b border-[var(--rule)] pb-4">
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--accent)]">
                  Jury · on v{selected.id}
                </span>
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
                  Weighted · {selectedAvg >= 0 ? "+" : ""}
                  {selectedAvg.toFixed(2)}
                </span>
              </div>
              <h4
                className="mt-5 font-serif text-[var(--ink)]"
                style={{
                  fontVariationSettings: '"opsz" 36, "wght" 420, "SOFT" 50',
                  fontSize: "22px",
                  lineHeight: 1.2,
                  letterSpacing: "-0.015em",
                }}
              >
                {selected.headline}
              </h4>
              <p
                className="mt-3 text-[var(--ink-soft)]"
                style={{ fontSize: "14px", lineHeight: 1.5 }}
              >
                {selected.body}
              </p>
              <span className="mt-3 inline-block font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--accent)]">
                Channel · {selected.channel}
              </span>
              <div className="mt-6 space-y-3">
                {PERSONAS.map((p) => {
                  const r = selected.reactions[p.id];
                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-[34px_1fr_55px] items-start gap-3 border-b border-[var(--rule-soft)] pb-3 last:border-b-0"
                    >
                      <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[var(--ink)]">
                        <span
                          className="font-serif italic text-[var(--paper)]"
                          style={{ fontSize: "13px" }}
                        >
                          {p.monogram}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)]">
                          {p.role}
                        </span>
                        <p
                          className="mt-[2px] font-serif italic text-[var(--ink)]"
                          style={{ fontSize: "13px", lineHeight: 1.45 }}
                        >
                          “{r.quote}”
                        </p>
                      </div>
                      <span
                        className={`text-right font-mono text-[12px] tracking-[0.06em] ${
                          r.score >= 0 ? "text-[var(--accent)]" : "text-[var(--ink-soft)]"
                        }`}
                      >
                        {r.score >= 0 ? "+" : ""}
                        {r.score.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </section>

        {/* -------- §05 · SURVIVING DISSENT -------- */}
        <section className="border-b border-[var(--rule)] px-10 py-[96px] md:px-20">
          <SectionHead
            marker="§05 · Dissent · carried forward"
            title="What the jury"
            accent="would not sign off on."
          />
          <ul className="max-w-[1000px] border border-[var(--accent)] bg-[var(--paper)]">
            {TOP_DISSENT.map((d, i) => {
              const creative = CREATIVES.find((c) => c.id === d.creativeId)!;
              const juror = PERSONAS.find((p) => p.id === d.juror)!;
              return (
                <li
                  key={i}
                  className="grid items-baseline gap-4 border-b border-[var(--rule-soft)] px-6 py-5 last:border-b-0 md:grid-cols-[100px_150px_1fr_90px]"
                >
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--accent)]">
                    0{i + 1}
                  </span>
                  <div>
                    <span className="block font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)]">
                      {juror.role}
                    </span>
                    <span className="block font-mono text-[10px] tracking-[0.06em] text-[var(--ink)]">
                      on v{creative.id}
                    </span>
                  </div>
                  <span className="text-[var(--ink)]" style={{ fontSize: "16px", lineHeight: 1.5 }}>
                    {d.line}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCreative(creative.id);
                      window.scrollTo({ top: document.body.scrollHeight * 0.45, behavior: "smooth" });
                    }}
                    className="text-right font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--accent)] hover:text-[var(--accent-ink)]"
                  >
                    View creative →
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* -------- §06 · 14-DAY CONTENT CALENDAR -------- */}
        <section className="border-b border-[var(--rule)] bg-[var(--paper-deep)] px-10 py-[96px] md:px-20">
          <SectionHead
            marker="§06 · Content calendar · 14 days"
            title="When to ship,"
            accent="where."
          />
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
              Filter channel
            </span>
            {["all", "LinkedIn", "X", "Facebook", "Instagram", "TikTok"].map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setActiveChannel(ch)}
                className={`border px-3 py-1 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors ${
                  activeChannel === ch
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--paper)]"
                    : "border-[var(--rule)] bg-transparent text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {ch === "all" ? "All" : ch}
              </button>
            ))}
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: 14 }).map((_, i) => {
              const day = i + 1;
              const item = visibleCalendar.find((c) => c.day === day);
              const isVisible = activeChannel === "all" || item;
              return (
                <div
                  key={day}
                  className={`border p-3 transition-opacity ${
                    item
                      ? "border-[var(--rule)] bg-[var(--paper)]"
                      : "border-[var(--rule-soft)] bg-[var(--paper-deep)]"
                  } ${!isVisible ? "opacity-30" : "opacity-100"}`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--muted)]">
                      Day {day}
                    </span>
                    {item ? (
                      <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--accent)]">
                        {item.channel}
                      </span>
                    ) : null}
                  </div>
                  {item ? (
                    <>
                      <p
                        className="mt-3 text-[var(--ink)]"
                        style={{ fontSize: "13px", lineHeight: 1.3 }}
                      >
                        {item.kind}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedCreative(item.creativeId)}
                        className="mt-3 font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] hover:text-[var(--accent)]"
                      >
                        → v{item.creativeId}
                      </button>
                    </>
                  ) : (
                    <p
                      className="mt-3 font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)]"
                    >
                      Dark day
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p
            className="mt-6 max-w-[720px] text-[var(--ink-soft)]"
            style={{ fontSize: "16px", lineHeight: 1.55 }}
          >
            <em>Key watches:</em> reuse creative v3 (Reports for Free) four times
            across LinkedIn and Facebook. Day 7 is the ad rotation switch.
            Day 14 closes with a retro plus next-sprint CTA.
          </p>
        </section>

        {/* -------- §07 · ACTIONS -------- */}
        <section className="border-b border-[var(--rule)] px-10 py-16 md:px-20">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
                §07 · Actions
              </span>
              <h3
                className="mt-3 font-serif text-[var(--ink)]"
                style={{
                  fontVariationSettings: '"opsz" 48, "wght" 380, "SOFT" 40',
                  fontSize: "clamp(24px, 2.4vw, 34px)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
              >
                Keep going. <em className="text-[var(--accent)]">Or share.</em>
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionBtn label="Re-run" />
              <ActionBtn label="Export to Notion" />
              <ActionBtn label="Open in Rory" primary />
              <ActionBtn label="Share link" />
            </div>
          </div>
        </section>

        <StepPager
          prev={{ label: "Live Run", marker: "§02", href: "/demo/02-run" }}
          next={{ label: "Index", marker: "§00", href: "/demo" }}
        />
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SectionHead({ marker, title, accent }: { marker: string; title: string; accent: string }) {
  return (
    <div className="mb-14 grid items-baseline gap-10 md:grid-cols-[1fr_3fr]">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
        {marker}
      </span>
      <h2
        className="font-serif text-[var(--ink)]"
        style={{
          fontVariationSettings: '"opsz" 60, "wght" 380, "SOFT" 40',
          fontSize: "clamp(34px, 4.5vw, 58px)",
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
        }}
      >
        {title} <em className="text-[var(--accent)]">{accent}</em>
      </h2>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <span className="block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
        {label}
      </span>
      <span
        className={`mt-2 block font-serif ${accent ? "text-[var(--accent)]" : "text-[var(--ink)]"}`}
        style={{
          fontSize: "26px",
          fontVariationSettings: '"opsz" 40, "wght" 420',
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function EngagementCell({ value }: { value: number }) {
  return (
    <div className="relative h-[22px] w-full border border-[var(--rule-soft)] bg-transparent">
      <div
        className="absolute inset-y-0 left-0 bg-[var(--accent)]"
        style={{ width: `${value}%`, opacity: 0.15 + (value / 100) * 0.65 }}
      />
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] tracking-[0.1em] text-[var(--ink)]">
        {value}
      </span>
    </div>
  );
}

function CreativeCard({
  c,
  avg,
  active,
  onClick,
}: {
  c: Creative;
  avg: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex aspect-[4/5] flex-col justify-between border p-5 text-left transition-all ${
        active
          ? "border-[var(--accent)] bg-[var(--paper)] shadow-[0_0_0_2px_rgba(227,51,18,0.15)]"
          : "border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--accent)]"
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
            v{c.id}
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--accent)]">
            {c.channel}
          </span>
        </div>
        <h4
          className="mt-4 font-serif text-[var(--ink)]"
          style={{
            fontVariationSettings: '"opsz" 28, "wght" 420, "SOFT" 50',
            fontSize: "17px",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          {c.headline}
        </h4>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--rule-soft)] pt-3">
        <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)]">
          {c.concept}
        </span>
        <span
          className={`font-mono text-[11px] tracking-[0.06em] ${
            avg >= 0 ? "text-[var(--accent)]" : "text-[var(--ink-soft)]"
          }`}
        >
          {avg >= 0 ? "+" : ""}
          {avg.toFixed(2)}
        </span>
      </div>
      {active ? (
        <span className="absolute -right-2 -top-2 border border-[var(--accent)] bg-[var(--accent)] px-2 py-[2px] font-mono text-[8px] tracking-[0.18em] uppercase text-[var(--paper)]">
          Selected
        </span>
      ) : null}
    </button>
  );
}

function Stamp() {
  return (
    <div
      className="relative flex h-[140px] w-[140px] items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[rgba(227,51,18,0.06)]"
      style={{ transform: "rotate(-12deg)" }}
    >
      <div
        className="text-center font-mono uppercase text-[var(--accent)]"
        style={{ fontSize: "10px", letterSpacing: "0.18em", lineHeight: 1.3 }}
      >
        Jury of 5
        <br />
        Pre-validated
        <br />
        <span style={{ fontSize: "8px", letterSpacing: "0.22em" }}>Ready to ship</span>
      </div>
    </div>
  );
}

function ActionBtn({ label, primary = false }: { label: string; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => e.preventDefault()}
      className={`border px-5 py-3 font-mono text-[11px] tracking-[0.14em] uppercase transition-all ${
        primary
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:border-[var(--accent)] hover:bg-[var(--accent)]"
          : "border-[var(--ink)] bg-transparent text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--paper)]"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------

function averageScore(c: Creative): number {
  return PERSONAS.reduce((acc, p) => acc + (c.reactions[p.id]?.score ?? 0) * p.weight, 0);
}

function shortNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
