"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DemoNav from "@/components/demo/DemoNav";
import StepPager from "@/components/demo/StepPager";
import TraceTicker from "@/components/landing/TraceTicker";

// ---------------------------------------------------------------------------
// Timeline. ~40 events across ~45s wall clock. Each stage is a contiguous
// block; stage ends on the "STAGE 0X complete" line.
// ---------------------------------------------------------------------------

type TraceKind = "info" | "ok" | "warn";
type StageIdx = 0 | 1 | 2 | 3 | 4;

type TraceLine = {
  t: number;
  stage: StageIdx | -1;
  agent: string;
  kind: TraceKind;
  msg: string;
  // optional payload each line can write into a stage-specific preview
  mutate?: (s: PreviewState) => void;
};

interface PreviewState {
  // Stage 01 · Scan
  product: {
    title: string | null;
    category: string | null;
    positioning: string | null;
    features: string[];
  };
  // Stage 02 · Map
  competitors: CompetitorRow[];
  // Stage 03 · Plan
  plan: { title: string; body: string }[];
  // Stage 04 · Studio
  creatives: { id: number; prompt: string | null; status: "idle" | "prompt" | "rendering" | "done" }[];
  calendar: { day: number; channel: string; kind: string }[];
  // Stage 05 · Jury
  jurors: { id: string; monogram: string; role: string; quote: string | null; score: number | null; status: "idle" | "thinking" | "done" }[];
}

interface CompetitorRow {
  name: string;
  social: {
    linkedin: number; // 0-100 engagement fill
    x: number;
    facebook: number;
    instagram: number;
    tiktok: number;
  };
  followers: number | null;
  note: string | null;
}

function emptyPreview(): PreviewState {
  return {
    product: { title: null, category: null, positioning: null, features: [] },
    competitors: [],
    plan: [],
    creatives: [1, 2, 3, 4, 5, 6].map((id) => ({ id, prompt: null, status: "idle" })),
    calendar: [],
    jurors: [
      { id: "champion", monogram: "C", role: "VP Ops · Champion",           quote: null, score: null, status: "idle" },
      { id: "economic", monogram: "E", role: "CFO · Economic Buyer",        quote: null, score: null, status: "idle" },
      { id: "blocker",  monogram: "B", role: "Staff Eng · Technical Blocker", quote: null, score: null, status: "idle" },
      { id: "skeptic",  monogram: "S", role: "Head PMO · Skeptic",          quote: null, score: null, status: "idle" },
      { id: "user",     monogram: "U", role: "Power User · Champion",       quote: null, score: null, status: "idle" },
    ],
  };
}

const COMPETITOR_DATA: CompetitorRow[] = [
  { name: "competitor-alpha.io",   social: { linkedin: 78, x: 64, facebook: 32, instagram: 42, tiktok: 12 }, followers: 48200,  note: "Heavy on LinkedIn thought-leadership." },
  { name: "rival-beta.com",        social: { linkedin: 44, x: 88, facebook: 22, instagram: 30, tiktok: 74 }, followers: 91400,  note: "X and TikTok first. Low FB." },
  { name: "contender-gamma.co",    social: { linkedin: 55, x: 38, facebook: 68, instagram: 72, tiktok: 24 }, followers: 132000, note: "Instagram-led creative, strong FB group." },
  { name: "parallel-delta.app",    social: { linkedin: 38, x: 26, facebook: 18, instagram: 86, tiktok: 68 }, followers: 64500,  note: "Creator-driven. IG and TikTok dominant." },
  { name: "legacy-epsilon.net",    social: { linkedin: 82, x: 42, facebook: 58, instagram: 28, tiktok: 6  }, followers: 18700,  note: "Enterprise legacy, low tiktok traction." },
];

const CREATIVE_PROMPTS = [
  "Minimal paper texture · italic serif headline · accent stamp",
  "Split screen · legacy config vs clean onboarding · no gradient",
  "Terminal readout on cream · live counters · accent on free",
  "Centred headline · stamp-style Pre-Validated badge",
  "Newsprint treatment · two columns · mono caption",
  "Full-bleed copy · single accent word · rule above and below",
];

const CALENDAR_ITEMS = [
  { day: 1,  channel: "LinkedIn",  kind: "Founder POV" },
  { day: 2,  channel: "X",         kind: "Thread · wedge" },
  { day: 3,  channel: "Instagram", kind: "Reel · launch teaser" },
  { day: 4,  channel: "LinkedIn",  kind: "Data study post" },
  { day: 5,  channel: "Facebook",  kind: "Community invite" },
  { day: 6,  channel: "TikTok",    kind: "Founder explain" },
  { day: 7,  channel: "LinkedIn",  kind: "Ad rotation · v2" },
  { day: 8,  channel: "X",         kind: "Customer story" },
  { day: 9,  channel: "Instagram", kind: "Static · numbers" },
  { day: 10, channel: "LinkedIn",  kind: "Migration playbook" },
  { day: 11, channel: "TikTok",    kind: "Behind the build" },
  { day: 12, channel: "X",         kind: "Thread · metric reveal" },
  { day: 13, channel: "Instagram", kind: "Reel · customer win" },
  { day: 14, channel: "LinkedIn",  kind: "Retro + CTA" },
];

const JUROR_QUOTES: Record<string, { quote: string; score: number }> = {
  champion: { quote: "This is the pitch. If creative lands, my team repeats it." ,          score: 0.88 },
  economic: { quote: "Pre-validated ads are a budget-review survival story. I can sign this.", score: 0.81 },
  blocker:  { quote: "Creative is tight. Check scaling assumptions at 500 ops.",              score: 0.51 },
  skeptic:  { quote: "Reverses a two-year rollout. Wedge must own the cost in the pitch.",    score: 0.34 },
  user:     { quote: "Day three of calendar is the one I would actually click.",              score: 0.72 },
};

// ---------- build timeline ----------

const TIMELINE: TraceLine[] = [
  { t: 0.2, stage: -1, agent: "kernel    ", kind: "info", msg: "boot simulator · run_id demo-001" },
  { t: 0.8, stage: -1, agent: "kalibr    ", kind: "info", msg: "router ready · paths=3 · goals=5" },

  // ---- STAGE 01 · Scan ----
  { t: 1.4, stage: 0, agent: "scout     ", kind: "info", msg: "STAGE 01 · scanning product url" },
  { t: 2.0, stage: 0, agent: "apify     ", kind: "info", msg: "website_content_crawler · started" },
  { t: 3.3, stage: 0, agent: "apify     ", kind: "ok",   msg: "pulled 42 pages · parsed meta + copy",
    mutate: (s) => { s.product.title = "example-app.com"; } },
  { t: 4.2, stage: 0, agent: "scout     ", kind: "ok",   msg: "category · ops automation",
    mutate: (s) => { s.product.category = "Ops automation"; } },
  { t: 5.1, stage: 0, agent: "scout     ", kind: "ok",   msg: "positioning · save hours per sprint",
    mutate: (s) => { s.product.positioning = "Save hours a sprint by automating every manual task"; } },
  { t: 6.0, stage: 0, agent: "scout     ", kind: "ok",   msg: "features · 5 top signals",
    mutate: (s) => { s.product.features = ["automation rules", "templates", "alerts", "audit log", "slack sync"]; } },
  { t: 6.6, stage: 0, agent: "scout     ", kind: "ok",   msg: "STAGE 01 complete · product brief ready" },

  // ---- STAGE 02 · Map ----
  { t: 7.3, stage: 1, agent: "cartograph", kind: "info", msg: "STAGE 02 · discovering competitors" },
  { t: 8.1, stage: 1, agent: "apify     ", kind: "ok",   msg: "competitor · competitor-alpha.io",
    mutate: (s) => { s.competitors.push({ ...COMPETITOR_DATA[0], social: zeroSocial(), followers: null, note: null }); } },
  { t: 8.9, stage: 1, agent: "apify     ", kind: "ok",   msg: "competitor · rival-beta.com",
    mutate: (s) => { s.competitors.push({ ...COMPETITOR_DATA[1], social: zeroSocial(), followers: null, note: null }); } },
  { t: 9.6, stage: 1, agent: "apify     ", kind: "ok",   msg: "competitor · contender-gamma.co",
    mutate: (s) => { s.competitors.push({ ...COMPETITOR_DATA[2], social: zeroSocial(), followers: null, note: null }); } },
  { t: 10.3, stage: 1, agent: "apify    ", kind: "ok",   msg: "competitor · parallel-delta.app",
    mutate: (s) => { s.competitors.push({ ...COMPETITOR_DATA[3], social: zeroSocial(), followers: null, note: null }); } },
  { t: 11.0, stage: 1, agent: "apify    ", kind: "ok",   msg: "competitor · legacy-epsilon.net",
    mutate: (s) => { s.competitors.push({ ...COMPETITOR_DATA[4], social: zeroSocial(), followers: null, note: null }); } },

  // scraping socials — for each platform, fill engagement for every competitor sequentially
  { t: 12.0, stage: 1, agent: "apify    ", kind: "info", msg: "linkedin_scraper · 5 targets" },
  { t: 13.2, stage: 1, agent: "apify    ", kind: "ok",   msg: "linkedin · engagement scored",
    mutate: (s) => { COMPETITOR_DATA.forEach((c, i) => { if (s.competitors[i]) s.competitors[i].social.linkedin = c.social.linkedin; }); } },
  { t: 14.1, stage: 1, agent: "apify    ", kind: "info", msg: "x_scraper · started" },
  { t: 15.0, stage: 1, agent: "apify    ", kind: "ok",   msg: "x · engagement scored",
    mutate: (s) => { COMPETITOR_DATA.forEach((c, i) => { if (s.competitors[i]) s.competitors[i].social.x = c.social.x; }); } },
  { t: 15.7, stage: 1, agent: "apify    ", kind: "info", msg: "facebook_scraper · started" },
  { t: 16.6, stage: 1, agent: "apify    ", kind: "ok",   msg: "facebook · engagement scored",
    mutate: (s) => { COMPETITOR_DATA.forEach((c, i) => { if (s.competitors[i]) s.competitors[i].social.facebook = c.social.facebook; }); } },
  { t: 17.5, stage: 1, agent: "apify    ", kind: "info", msg: "instagram_scraper · started" },
  { t: 18.5, stage: 1, agent: "apify    ", kind: "ok",   msg: "instagram · engagement scored",
    mutate: (s) => { COMPETITOR_DATA.forEach((c, i) => { if (s.competitors[i]) s.competitors[i].social.instagram = c.social.instagram; }); } },
  { t: 19.4, stage: 1, agent: "apify    ", kind: "info", msg: "tiktok_scraper · started" },
  { t: 20.4, stage: 1, agent: "apify    ", kind: "ok",   msg: "tiktok · engagement scored",
    mutate: (s) => {
      COMPETITOR_DATA.forEach((c, i) => {
        if (s.competitors[i]) {
          s.competitors[i].social.tiktok = c.social.tiktok;
          s.competitors[i].followers = c.followers;
          s.competitors[i].note = c.note;
        }
      });
    } },
  { t: 21.1, stage: 1, agent: "kalibr   ", kind: "warn", msg: "rerouted social_summarize · haiku timeout · fallback sonnet · recovered" },
  { t: 21.7, stage: 1, agent: "cartograph", kind: "ok",  msg: "STAGE 02 complete · 5 competitors · 25 social scrapes" },

  // ---- STAGE 03 · Plan ----
  { t: 22.4, stage: 2, agent: "strategist", kind: "info", msg: "STAGE 03 · drafting gtm plan" },
  { t: 23.3, stage: 2, agent: "strategist", kind: "ok",   msg: "audience · VP Ops at 50-500 person SaaS",
    mutate: (s) => { s.plan.push({ title: "Target audience", body: "VP Ops leaders at fifty to five hundred person B2B SaaS companies. Inherited stack of spreadsheets plus one legacy platform." }); } },
  { t: 24.1, stage: 2, agent: "strategist", kind: "ok",   msg: "positioning · automate every manual task",
    mutate: (s) => { s.plan.push({ title: "Positioning", body: "Every manual task, automated. Not features. Not knobs. Opinionated defaults that remove decisions." }); } },
  { t: 25.0, stage: 2, agent: "strategist", kind: "ok",   msg: "channel · LI + X primary · TikTok flex",
    mutate: (s) => { s.plan.push({ title: "Channel strategy", body: "LinkedIn and X as primary. Instagram reels for builder visibility. TikTok as the experimental flex channel." }); } },
  { t: 25.9, stage: 2, agent: "strategist", kind: "ok",   msg: "recommendations · 4 moves",
    mutate: (s) => { s.plan.push({ title: "GTM moves", body: "Four load-bearing moves: data study, migration playbook, founder POV thread, pre-validated ad set." }); } },
  { t: 26.4, stage: 2, agent: "strategist", kind: "ok",   msg: "STAGE 03 complete · plan drafted" },

  // ---- STAGE 04 · Studio ----
  { t: 27.1, stage: 3, agent: "studio    ", kind: "info", msg: "STAGE 04 · generating creative" },
  ...CREATIVE_PROMPTS.slice(0, 6).flatMap((p, i) => {
    const base = 27.6 + i * 1.3;
    return [
      { t: base,       stage: 3 as const, agent: "studio    ", kind: "info" as const, msg: `prompt · v${i + 1} · drafted`,
        mutate: (s: PreviewState) => { s.creatives[i].prompt = p; s.creatives[i].status = "prompt"; } },
      { t: base + 0.6, stage: 3 as const, agent: "studio    ", kind: "info" as const, msg: `render · v${i + 1}`,
        mutate: (s: PreviewState) => { s.creatives[i].status = "rendering"; } },
      { t: base + 1.0, stage: 3 as const, agent: "studio    ", kind: "ok"   as const, msg: `variant ${i + 1}/6 ready`,
        mutate: (s: PreviewState) => { s.creatives[i].status = "done"; } },
    ];
  }),
  { t: 36.2, stage: 3, agent: "studio    ", kind: "info", msg: "calendar · sequencing 14 days" },
  ...CALENDAR_ITEMS.flatMap((item, i) => {
    const base = 36.5 + i * 0.15;
    return [{
      t: base,
      stage: 3 as const,
      agent: "studio    ",
      kind: "ok" as const,
      msg: `calendar · day ${item.day} · ${item.channel}`,
      mutate: (s: PreviewState) => { s.calendar.push(item); },
    }];
  }),
  { t: 38.9, stage: 3, agent: "studio    ", kind: "ok",   msg: "STAGE 04 complete · 6 creatives · 14 calendar days" },

  // ---- STAGE 05 · Jury ----
  { t: 39.6, stage: 4, agent: "clerk     ", kind: "info", msg: "STAGE 05 · convening jury" },
  { t: 40.2, stage: 4, agent: "minds     ", kind: "info", msg: "juror champion · thinking",
    mutate: (s) => { s.jurors[0].status = "thinking"; } },
  { t: 41.1, stage: 4, agent: "clerk     ", kind: "ok",   msg: "champion · score +0.88",
    mutate: (s) => { s.jurors[0].quote = JUROR_QUOTES.champion.quote; s.jurors[0].score = JUROR_QUOTES.champion.score; s.jurors[0].status = "done"; } },
  { t: 41.8, stage: 4, agent: "minds     ", kind: "info", msg: "juror economic · thinking",
    mutate: (s) => { s.jurors[1].status = "thinking"; } },
  { t: 42.7, stage: 4, agent: "clerk     ", kind: "ok",   msg: "economic · score +0.81",
    mutate: (s) => { s.jurors[1].quote = JUROR_QUOTES.economic.quote; s.jurors[1].score = JUROR_QUOTES.economic.score; s.jurors[1].status = "done"; } },
  { t: 43.4, stage: 4, agent: "minds     ", kind: "info", msg: "juror blocker · thinking",
    mutate: (s) => { s.jurors[2].status = "thinking"; } },
  { t: 44.2, stage: 4, agent: "clerk     ", kind: "ok",   msg: "blocker · score +0.51",
    mutate: (s) => { s.jurors[2].quote = JUROR_QUOTES.blocker.quote; s.jurors[2].score = JUROR_QUOTES.blocker.score; s.jurors[2].status = "done"; } },
  { t: 44.9, stage: 4, agent: "minds     ", kind: "info", msg: "juror skeptic · thinking",
    mutate: (s) => { s.jurors[3].status = "thinking"; } },
  { t: 45.7, stage: 4, agent: "clerk     ", kind: "ok",   msg: "skeptic · score +0.34",
    mutate: (s) => { s.jurors[3].quote = JUROR_QUOTES.skeptic.quote; s.jurors[3].score = JUROR_QUOTES.skeptic.score; s.jurors[3].status = "done"; } },
  { t: 46.4, stage: 4, agent: "minds     ", kind: "info", msg: "juror user · thinking",
    mutate: (s) => { s.jurors[4].status = "thinking"; } },
  { t: 47.2, stage: 4, agent: "clerk     ", kind: "ok",   msg: "user · score +0.72",
    mutate: (s) => { s.jurors[4].quote = JUROR_QUOTES.user.quote; s.jurors[4].score = JUROR_QUOTES.user.score; s.jurors[4].status = "done"; } },
  { t: 47.9, stage: 4, agent: "clerk     ", kind: "ok",   msg: "consensus · 0.652 · winner approved" },
  { t: 48.4, stage: 4, agent: "clerk     ", kind: "ok",   msg: "STAGE 05 complete · jury convened" },
  { t: 49.0, stage: -1, agent: "kernel   ", kind: "ok",   msg: "run complete · confidence 0.652 · 1 kalibr reroute · 0 interventions" },
];

const TOTAL_SECONDS = 50;

const STAGES = [
  { id: 0, label: "Stage 01 · Scan",    agent: "Scout · Apify"            },
  { id: 1, label: "Stage 02 · Map",     agent: "Cartographer · Apify"      },
  { id: 2, label: "Stage 03 · Plan",    agent: "Strategist · Claude"       },
  { id: 3, label: "Stage 04 · Studio",  agent: "Studio · Creative + Calendar" },
  { id: 4, label: "Stage 05 · Jury",    agent: "Clerk · Minds AI"          },
] as const;

type StageStatus = "idle" | "running" | "done";

function zeroSocial(): CompetitorRow["social"] {
  return { linkedin: 0, x: 0, facebook: 0, instagram: 0, tiktok: 0 };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RunSimulation() {
  const [elapsed, setElapsed] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [preview, setPreview] = useState<PreviewState>(emptyPreview);
  const [loopKey, setLoopKey] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const appliedRef = useRef<number>(0);

  // Apply any mutate() side effects between appliedRef.current and cursor.
  useEffect(() => {
    if (cursor <= appliedRef.current) return;
    setPreview((prev) => {
      let next = prev;
      let mutated = false;
      for (let i = appliedRef.current; i < cursor; i++) {
        const item = TIMELINE[i];
        if (item.mutate) {
          if (!mutated) {
            next = structuredClone(prev);
            mutated = true;
          }
          item.mutate(next);
        }
      }
      appliedRef.current = cursor;
      return mutated ? next : prev;
    });
  }, [cursor]);

  // Reset derived state on loop restart.
  useEffect(() => {
    appliedRef.current = 0;
    setPreview(emptyPreview());
  }, [loopKey]);

  useEffect(() => {
    startRef.current = null;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const e = (now - startRef.current) / 1000;
      setElapsed(e);

      let c = 0;
      for (let i = 0; i < TIMELINE.length; i++) {
        if (TIMELINE[i].t <= e) c = i + 1;
        else break;
      }
      setCursor(c);

      if (e >= TOTAL_SECONDS + 3) {
        startRef.current = null;
        setElapsed(0);
        setCursor(0);
        setLoopKey((k) => k + 1);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [loopKey]);

  const shown = useMemo(() => TIMELINE.slice(0, cursor), [cursor]);
  const stageStatus: StageStatus[] = STAGES.map(() => "idle");
  for (const line of shown) {
    if (line.stage === -1) continue;
    if (stageStatus[line.stage] === "idle") stageStatus[line.stage] = "running";
    if (/STAGE 0\d complete/i.test(line.msg)) stageStatus[line.stage] = "done";
  }
  const reroutes = shown.filter((l) => l.agent.trim() === "kalibr" && l.kind === "warn").length;
  const confidence = Math.min(0.652, 0.652 * (Math.min(elapsed, TOTAL_SECONDS) / TOTAL_SECONDS));
  const isRunning = cursor < TIMELINE.length;
  const clampedElapsed = Math.min(elapsed, TOTAL_SECONDS);

  return (
    <>
      <TraceTicker />
      <DemoNav step="§02 · Live Run" />

      <main className="flex-1">
        <section className="px-10 pt-10 pb-6 md:px-20">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--rule)] pb-4">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
                Run · demo-001
              </span>
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
                /
              </span>
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--ink)]">
                example-app.com
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase">
              <span className="text-[var(--muted)]">Elapsed</span>
              <span className="text-[var(--ink)]">{formatClock(clampedElapsed)}</span>
              <span className="text-[var(--muted)]">·</span>
              <span className="text-[var(--muted)]">Target</span>
              <span className="text-[var(--ink-soft)]">{formatClock(TOTAL_SECONDS)}</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase">
              <span className="text-[var(--muted)]">Confidence</span>
              <span className="text-[var(--ink)]">{confidence.toFixed(3)}</span>
              <span className="border border-[var(--accent)] px-1.5 py-0.5 text-[9px] tracking-[0.24em] text-[var(--accent)]">
                Kalibr · {reroutes} · {reroutes}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
                Live · pre-launch simulation
              </span>
              <h1
                className="mt-3 font-serif text-[var(--ink)]"
                style={{
                  fontVariationSettings: '"opsz" 90, "wght" 360, "SOFT" 30',
                  fontSize: "clamp(34px, 4.5vw, 56px)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.025em",
                }}
              >
                Rehearsing the <em className="text-[var(--accent)]">launch</em>.
              </h1>
            </div>
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
              · Loops every {TOTAL_SECONDS}s
            </span>
          </div>
        </section>

        <section className="px-10 pb-24 md:px-20">
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            {/* LEFT 60% · STAGE CARDS with live deliverable previews */}
            <div className="flex flex-col gap-4">
              <StageCardScan  status={stageStatus[0]} product={preview.product} />
              <StageCardMap   status={stageStatus[1]} competitors={preview.competitors} />
              <StageCardPlan  status={stageStatus[2]} plan={preview.plan} />
              <StageCardStudio status={stageStatus[3]} creatives={preview.creatives} calendar={preview.calendar} />
              <StageCardJury  status={stageStatus[4]} jurors={preview.jurors} />
            </div>

            {/* RIGHT 40% · TRACE PANEL */}
            <div className="lg:sticky lg:top-10 lg:self-start">
              <TracePanelSim
                lines={shown}
                elapsed={clampedElapsed}
                isRunning={isRunning}
                confidence={confidence}
              />
            </div>
          </div>
        </section>

        <StepPager
          prev={{ label: "Landing", marker: "§01", href: "/demo/01-landing" }}
          next={{ label: "Results", marker: "§03", href: "/demo/03-results" }}
        />
      </main>
    </>
  );
}

// ---------- STAGE CARDS ----------

function StageShell({
  label,
  agent,
  status,
  children,
}: {
  label: string;
  agent: string;
  status: StageStatus;
  children?: React.ReactNode;
}) {
  const borderLeft =
    status === "running"
      ? "border-l-[3px] border-l-[var(--accent)]"
      : status === "done"
      ? "border-l-[3px] border-l-[var(--phosphor)]"
      : "border-l-[3px] border-l-[var(--rule-soft)]";
  const statusText = status === "running" ? "Running" : status === "done" ? "Done" : "Idle";
  const statusColor =
    status === "running"
      ? "text-[var(--accent)]"
      : status === "done"
      ? "text-[var(--phosphor)]"
      : "text-[var(--muted)]";

  return (
    <div
      className={`relative border border-[var(--rule)] bg-[var(--paper)] p-6 transition-colors ${borderLeft} ${
        status === "running" ? "bg-[rgba(227,51,18,0.03)]" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {status === "running" ? <PulseDot /> : null}
          <span className={`font-mono text-[10px] tracking-[0.22em] uppercase ${statusColor}`}>
            {statusText}
          </span>
        </div>
      </div>
      <h3
        className="mt-3 font-serif text-[var(--ink)]"
        style={{
          fontVariationSettings: '"opsz" 36, "wght" 420, "SOFT" 40',
          fontSize: "clamp(20px, 2vw, 26px)",
          lineHeight: 1.15,
          letterSpacing: "-0.015em",
        }}
      >
        {agent}
      </h3>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

function PulseDot() {
  return (
    <span className="relative inline-flex h-[8px] w-[8px]">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
      <span className="relative inline-flex h-[8px] w-[8px] rounded-full bg-[var(--accent)]" />
    </span>
  );
}

function StageCardScan({ status, product }: { status: StageStatus; product: PreviewState["product"] }) {
  return (
    <StageShell label="Stage 01 · Scan" agent="Scout · Apify" status={status}>
      {status === "idle" ? (
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">queued</p>
      ) : (
        <div className="grid gap-3 border border-[var(--rule)] bg-[var(--paper-deep)] p-5 md:grid-cols-[1fr_1fr]">
          <ScanField label="Product"     value={product.title} />
          <ScanField label="Category"    value={product.category} />
          <ScanField label="Positioning" value={product.positioning} wide />
          <div className="md:col-span-2">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
              Features detected
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.features.length ? (
                product.features.map((f) => (
                  <span
                    key={f}
                    className="border border-[var(--rule)] bg-[var(--paper)] px-2 py-1 font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--ink)]"
                  >
                    {f}
                  </span>
                ))
              ) : (
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
                  parsing…
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </StageShell>
  );
}

function ScanField({ label, value, wide = false }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
        {label}
      </span>
      <p
        className="mt-1 text-[var(--ink)]"
        style={{
          fontSize: "15px",
          lineHeight: 1.4,
          fontVariationSettings: '"opsz" 24, "wght" 420',
        }}
      >
        {value ?? <span className="font-mono text-[11px] text-[var(--muted)]">scraping…</span>}
      </p>
    </div>
  );
}

function StageCardMap({ status, competitors }: { status: StageStatus; competitors: CompetitorRow[] }) {
  return (
    <StageShell label="Stage 02 · Map" agent="Cartographer · Apify" status={status}>
      {status === "idle" ? (
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">queued</p>
      ) : (
        <div className="border border-[var(--rule)] bg-[var(--paper-deep)]">
          <div className="grid grid-cols-[1.4fr_repeat(5,_minmax(0,1fr))_80px] gap-x-2 border-b border-[var(--rule)] px-4 py-3">
            <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-[var(--muted)]">Competitor</span>
            {["LI", "X", "FB", "IG", "TT"].map((p) => (
              <span key={p} className="text-center font-mono text-[9px] tracking-[0.16em] uppercase text-[var(--muted)]">
                {p}
              </span>
            ))}
            <span className="text-right font-mono text-[9px] tracking-[0.16em] uppercase text-[var(--muted)]">
              Followers
            </span>
          </div>
          {competitors.length === 0 ? (
            <p className="px-4 py-3 font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
              hunting…
            </p>
          ) : (
            competitors.map((c) => (
              <div
                key={c.name}
                className="grid grid-cols-[1.4fr_repeat(5,_minmax(0,1fr))_80px] items-center gap-x-2 border-b border-[var(--rule-soft)] px-4 py-3 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span
                    className="font-mono text-[11px] tracking-[0.04em] text-[var(--ink)]"
                  >
                    {c.name}
                  </span>
                  {c.note ? (
                    <span className="mt-1 font-mono text-[9px] tracking-[0.04em] text-[var(--muted)]">
                      {c.note}
                    </span>
                  ) : null}
                </div>
                <SocialBar value={c.social.linkedin} />
                <SocialBar value={c.social.x} />
                <SocialBar value={c.social.facebook} />
                <SocialBar value={c.social.instagram} />
                <SocialBar value={c.social.tiktok} />
                <span className="text-right font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--ink)]">
                  {c.followers != null ? shortNum(c.followers) : "--"}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </StageShell>
  );
}

function SocialBar({ value }: { value: number }) {
  return (
    <div className="relative h-[8px] w-full overflow-hidden bg-[var(--rule-soft)]">
      <div
        className="h-full bg-[var(--accent)] transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function StageCardPlan({ status, plan }: { status: StageStatus; plan: { title: string; body: string }[] }) {
  return (
    <StageShell label="Stage 03 · Plan" agent="Strategist · Claude" status={status}>
      {status === "idle" ? (
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">queued</p>
      ) : (
        <div className="space-y-4 border border-[var(--rule)] bg-[var(--paper-deep)] p-5">
          {plan.length === 0 ? (
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">drafting…</p>
          ) : (
            plan.map((p) => (
              <div key={p.title} className="grid gap-3 md:grid-cols-[130px_1fr]">
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--accent)]">
                  {p.title}
                </span>
                <p
                  className="text-[var(--ink-soft)]"
                  style={{ fontSize: "14px", lineHeight: 1.5 }}
                >
                  {p.body}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </StageShell>
  );
}

function StageCardStudio({
  status,
  creatives,
  calendar,
}: {
  status: StageStatus;
  creatives: PreviewState["creatives"];
  calendar: PreviewState["calendar"];
}) {
  return (
    <StageShell label="Stage 04 · Studio" agent="Studio · Creative + Calendar" status={status}>
      {status === "idle" ? (
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">queued</p>
      ) : (
        <div className="space-y-5">
          <div>
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
              Creative · 6 variants
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-6">
              {creatives.map((c) => (
                <CreativeCell key={c.id} c={c} />
              ))}
            </div>
          </div>
          <div>
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
              Calendar · 14 days
            </span>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {Array.from({ length: 14 }).map((_, i) => {
                const day = i + 1;
                const item = calendar.find((c) => c.day === day);
                return <CalendarCell key={day} day={day} item={item} />;
              })}
            </div>
          </div>
        </div>
      )}
    </StageShell>
  );
}

function CreativeCell({ c }: { c: PreviewState["creatives"][number] }) {
  const idleClass = "border-[var(--rule-soft)] bg-[var(--paper-deep)]";
  const promptClass = "border-[var(--rule)] bg-[var(--paper-deep)]";
  const renderingClass = "border-[var(--accent)] bg-[rgba(227,51,18,0.05)] animate-pulse";
  const doneClass = "border-[var(--rule)] bg-[var(--paper)]";
  const cls =
    c.status === "idle"
      ? idleClass
      : c.status === "prompt"
      ? promptClass
      : c.status === "rendering"
      ? renderingClass
      : doneClass;
  return (
    <div className={`aspect-[4/3] relative border p-2 transition-colors ${cls}`}>
      <span className="absolute left-1 top-1 font-mono text-[8px] tracking-[0.18em] uppercase text-[var(--muted)]">
        v{c.id}
      </span>
      {c.status === "idle" ? null : c.status === "prompt" ? (
        <span className="block font-mono text-[8px] leading-[1.3] text-[var(--muted)] pt-4">
          {c.prompt}
        </span>
      ) : c.status === "rendering" ? (
        <div className="flex h-full items-center justify-center">
          <span className="font-mono text-[8px] tracking-[0.18em] uppercase text-[var(--accent)]">
            rendering
          </span>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between">
          <div className="relative h-[14px]" />
          <div className="relative flex flex-col gap-[3px]">
            <span
              className="font-serif italic text-[var(--ink)]"
              style={{ fontSize: "9px", lineHeight: 1.1 }}
            >
              Concept · v{c.id}
            </span>
            <span className="font-mono text-[7px] tracking-[0.12em] uppercase text-[var(--accent)]">
              Ready
            </span>
          </div>
          <div className="absolute right-1 top-1 h-[8px] w-[8px] rounded-full bg-[var(--accent)]" />
        </div>
      )}
    </div>
  );
}

function CalendarCell({ day, item }: { day: number; item?: { day: number; channel: string; kind: string } }) {
  return (
    <div
      className={`aspect-square border p-1 ${
        item ? "border-[var(--rule)] bg-[var(--paper)]" : "border-[var(--rule-soft)] bg-[var(--paper-deep)]"
      }`}
    >
      <span className="block font-mono text-[8px] tracking-[0.18em] uppercase text-[var(--muted)]">
        D{day}
      </span>
      {item ? (
        <>
          <span
            className="block font-mono text-[7px] tracking-[0.08em] uppercase text-[var(--accent)]"
            style={{ lineHeight: 1.1 }}
          >
            {item.channel}
          </span>
          <span
            className="block text-[var(--ink)]"
            style={{ fontSize: "9px", lineHeight: 1.1 }}
          >
            {item.kind}
          </span>
        </>
      ) : null}
    </div>
  );
}

function StageCardJury({
  status,
  jurors,
}: {
  status: StageStatus;
  jurors: PreviewState["jurors"];
}) {
  return (
    <StageShell label="Stage 05 · Jury" agent="Clerk · Minds AI" status={status}>
      {status === "idle" ? (
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">queued</p>
      ) : (
        <div className="space-y-3">
          {jurors.map((j) => (
            <JurorBubble key={j.id} j={j} />
          ))}
        </div>
      )}
    </StageShell>
  );
}

function JurorBubble({ j }: { j: PreviewState["jurors"][number] }) {
  return (
    <div
      className={`grid grid-cols-[44px_1fr_80px] items-start gap-4 border-b border-[var(--rule-soft)] pb-3 last:border-b-0 ${
        j.status === "idle" ? "opacity-40" : ""
      }`}
    >
      <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[var(--ink)]">
        <span className="font-serif italic text-[var(--paper)]" style={{ fontSize: "18px" }}>
          {j.monogram}
        </span>
      </div>
      <div>
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
          {j.role}
        </span>
        <p
          className="mt-1 text-[var(--ink)]"
          style={{ fontSize: "14px", lineHeight: 1.4, fontStyle: j.quote ? "italic" : "normal" }}
        >
          {j.status === "idle" ? (
            <span className="font-mono text-[11px] text-[var(--muted)]">queued</span>
          ) : j.status === "thinking" ? (
            <span className="font-mono text-[11px] text-[var(--accent)]">
              thinking<span className="animate-pulse">…</span>
            </span>
          ) : (
            `“${j.quote}”`
          )}
        </p>
      </div>
      <div className="flex flex-col items-end">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
          Score
        </span>
        <span
          className={`font-mono text-[14px] tracking-[0.08em] ${
            j.score == null
              ? "text-[var(--muted)]"
              : j.score >= 0
              ? "text-[var(--accent)]"
              : "text-[var(--ink-soft)]"
          }`}
        >
          {j.score == null ? "--" : `${j.score >= 0 ? "+" : ""}${j.score.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}

// ---------- Trace panel ----------

function TracePanelSim({
  lines,
  elapsed,
  isRunning,
  confidence,
}: {
  lines: TraceLine[];
  elapsed: number;
  isRunning: boolean;
  confidence: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div className="border border-[var(--rule)] bg-[var(--ink)] text-[var(--paper)]">
      <div className="flex items-center justify-between border-b border-[rgba(236,228,210,0.12)] px-5 py-3">
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[rgba(236,228,210,0.6)]">
          SIM_RUN · DEMO-001
        </span>
        <div className="flex items-center gap-[6px]">
          <span className={`h-[6px] w-[6px] rounded-full ${isRunning ? "bg-[var(--accent)]" : "bg-[rgba(236,228,210,0.2)]"}`} />
          <span className={`h-[6px] w-[6px] rounded-full ${isRunning ? "bg-[var(--accent)]" : "bg-[rgba(236,228,210,0.2)]"}`} />
          <span className="h-[6px] w-[6px] rounded-full bg-[rgba(236,228,210,0.2)]" />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="h-[540px] overflow-y-auto px-5 py-4 font-mono"
        style={{ fontSize: "11px", lineHeight: 1.9, letterSpacing: "0.02em" }}
      >
        {lines.map((line, i) => {
          const color =
            line.kind === "warn"
              ? "text-[var(--accent)]"
              : line.kind === "ok"
              ? "text-[var(--phosphor)]"
              : "text-[rgba(236,228,210,0.7)]";
          return (
            <div key={i} className="whitespace-pre-wrap">
              <span className="text-[rgba(236,228,210,0.35)]">[{formatClock(line.t)}]</span>{" "}
              <span className={color}>{line.agent}</span>{" "}
              <span className="text-[rgba(236,228,210,0.85)]">{line.msg}</span>
            </div>
          );
        })}
        {isRunning ? (
          <div className="mt-1 whitespace-pre-wrap text-[rgba(236,228,210,0.4)]">
            <span className="inline-block w-[10px] animate-pulse">▍</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-[rgba(236,228,210,0.12)] px-5 py-3 font-mono text-[10px] tracking-[0.2em] uppercase text-[rgba(236,228,210,0.55)]">
        <span>Runtime · {formatClock(elapsed)}</span>
        <span>·</span>
        <span>Confidence · {confidence.toFixed(3)}</span>
      </div>
    </div>
  );
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shortNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
