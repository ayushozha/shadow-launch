# Shadow Launch

**Specification · Build Day 04.18.26 · Marketing Agents Hackathon**

> A synthetic market simulator for GTM teams. Drop in a URL. Get back a pressure-tested positioning wedge, ads, and a launch plan. No real dollars spent. No real customers used as the test group.

---

## 0. Document Purpose

This is the implementation spec for the 5-hour build. It is prescriptive about scope, cuts, and demo-safety choices. If a decision is not in this doc, it is out of scope for today.

**Author:** Ayush Ojha · ayushozha@outlook.com · [linkedin.com/in/ayushozha](https://linkedin.com/in/ayushozha)
**Demo URL:** `shadowlaunch.ayushojha.com` (to provision by 10:15 AM, Vercel)
**Backup URL:** `shadow-launch.vercel.app` (automatic Vercel preview, never takes this down)
**Repo:** `github.com/ayushozha/shadow-launch` (private until submission)
**Venue:** Entrepreneurs First SF
**Submission deadline:** 3:00 PM PT
**Finalist demos:** 4:00 PM PT
**Total build window:** ~5 hours (10:00 AM to 3:00 PM) minus 30 min lunch

---

## 0.5 Non-Negotiables

Three things must be true by 2:45 PM. They are not stretch goals. If any one of them is missing, the demo is at risk and the spec has failed.

1. **Pre-cached hero run on disk** (`cache/demo-linear.json` or equivalent). Loaded in under 3 seconds. Animates in to look live. This is the demo you actually give.
2. **Screen recording saved locally** (`.mp4`, 90 seconds, narrated). Done by 2:45 PM, not 2:59. Lives on the local disk and on a private YouTube unlisted link. If the venue wifi dies at 4:00 PM, this is what you present.
3. **Deployed live site** (`shadowlaunch.ayushojha.com` or backup Vercel URL) reachable from any laptop in the room. Tested from a phone on cellular, not just the dev machine.

Everything else in this spec serves these three outcomes. Cut anything that threatens them.

---


### 1.1 One-liner
Rehearse your launch against a synthetic twin of your market before you touch the real one.

### 1.2 Category framing
Shadow Launch is not an AI marketing copilot. It is a **pre-launch simulator**. The closest real-world analog is a wind tunnel for aircraft or a flight simulator for pilots: you prove the design in a model before you pay the cost of running it live.

### 1.3 Input and output contract

**Input** (what the user provides):
- Product URL
- Two competitor URLs
- Target ICP description (one paragraph)

**Output** (what Shadow Launch returns):
- Market twin summary (positioning landscape, gaps)
- Three candidate narrative wedges, ranked
- Jury deliberation transcript (4 synthetic buyers)
- Winning wedge with scores and dissent log
- Meta ad creative set (5 variants) for the winning wedge
- A launch board with owners, tasks, and a one-page executive summary

### 1.4 Why it wins the brief
The hackathon asks for: measurable GTM outcomes, guardrails teams can trust, end-to-end workflows that plan, execute, and self-correct. Shadow Launch hits all three because the pre-launch simulation *is* the guardrail: nothing reaches a real ad account or a real prospect without first surviving the synthetic jury.

---

## 2. User Journey (the canonical run)

A founder with a B2B SaaS product walks up and does this:

1. **Paste.** Drop product URL + 2 competitors + ICP. Click *Run Shadow Launch*.
2. **Watch the twin assemble.** Live trace panel shows Apify actors firing across the target market. Takes 60-90 seconds in demo (cached data for speed).
3. **Wedge discovery.** Three narrative angles surface, with evidence trails.
4. **Jury deliberation.** Four synthetic buyer clones debate the wedges. The user watches their objections roll in. One wedge converges fastest.
5. **Campaign manufacture.** Winning wedge flows into Pixero. Ads come back.
6. **Launch plan.** Rory-style board appears: owners, tasks, executive summary.
7. **Export.** One click. A shareable page and a Notion-or-Rory board.

Total wall clock: **~2 minutes** in demo mode.

---

## 3. Architecture

### 3.1 Shape of the system

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                       │
│   [ Input Screen ] → [ Live Run View ] → [ Results Page ]    │
└──────────────────────────┬──────────────────────────────────┘
                           │  WebSocket / SSE
┌──────────────────────────▼──────────────────────────────────┐
│              ORCHESTRATOR (Python, FastAPI)                  │
│                    Kalibr routing layer                      │
└──┬──────────┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │          │
┌──▼──┐   ┌──▼──┐   ┌──▼──┐   ┌──▼──┐   ┌──▼──┐
│APIFY│   │MINDS│   │CLAUDE│  │PIXERO│  │RORY │
│Twin │   │Jury │   │Brain │  │Media │  │Plan │
└─────┘   └─────┘   └─────┘   └─────┘   └─────┘
```

### 3.2 Agents

Five logical agents. Each has one job. All are orchestrated by Kalibr with retry and fallback baked in.

| Agent | Role | Primary Tool | Model |
|---|---|---|---|
| **Scout** | Build the market twin from public web | Apify (6 actors in parallel) | Claude Sonnet for summarization |
| **Cartographer** | Surface 3 narrative wedges from twin | Claude Sonnet | n/a |
| **Clerk** | Convene the jury, run the deliberation | Minds AI | Minds clones + Claude for facilitation |
| **Producer** | Turn winning wedge into ads | Pixero API | n/a |
| **Scribe** | Assemble launch board and summary | Rory API | Claude Sonnet for summary prose |

### 3.3 Data flow

```
User input
   │
   ▼
Scout ──► market_twin.json  (positioning map, gaps, sources)
   │
   ▼
Cartographer ──► wedges[] (3 candidate angles, each with evidence)
   │
   ▼
Clerk ──► deliberation.json (4 jurors × 3 wedges = 12 scored reactions,
                              consensus vector, dissent log)
   │
   ▼ (select winning wedge)
Producer ──► ads[] (5 variants: headline, body, visual brief)
   │
   ▼
Scribe ──► launch_board (owners, tasks, one-pager)
```

Every stage emits events on a shared event bus. Frontend subscribes and renders the trace live. This is how we make the 2-minute run feel cinematic instead of silent.

---

## 4. Sponsor Integration (load-bearing, not decorative)

This section is also the prize-track strategy. Each sponsor is integrated where it does work that no other tool in the stack can do.

### 4.1 Apify (target: Best Use of Apify, $500)

**Role:** Research Department. Builds the market twin.

**Actors used** (pick 4-6, verify availability at kickoff):
1. Website Content Crawler — target product + competitor sites
2. Google Search Results Scraper — category discourse
3. Reddit Scraper — category complaints and desires
4. LinkedIn Jobs Scraper — competitor hiring signals (what they are building)
5. G2 / Capterra review scraper — sentiment and feature gaps
6. Twitter / X Scraper — live voice of the market

**Why it wins the track:** We are running multiple actors chained into a single pipeline. The twin is only as honest as the intake. Diversity of sources is the judging signal Apify cares about.

**Demo visible:** The trace panel shows each actor firing by name, with document counts ticking up.

### 4.2 Minds AI (target: Best Use of Minds AI, internship opportunity)

**Role:** Voice Department. The jury.

**Implementation:**
- Four composite buyer clones: Champion, Economic Buyer, Technical Blocker, Skeptic.
- Each clone is built from a corpus assembled by Apify: LinkedIn posts and articles from real people in those roles in the target industry.
- Clones do not represent individuals. They represent archetypes composited from many real voices. This is the consent and safety story.
- Each clone sees all three wedges and produces a reaction and score. They can also respond to each other in round 2 (if time allows).

**Why it wins the track:** We are using Minds AI for what it is actually for: high-fidelity personas in dialogue. Most hackathon teams will use it as a chatbot. We are using it as a *jury*. That is the use case Minds AI's own marketing does not show, which is exactly why it lands with their team.

**Demo visible:** A live jury-room UI where each clone's reaction streams in. Include the dissent log on the winner ("the CFO clone still objects to payback period"). That dissent is the moment that sells it.

### 4.3 Pixero (target: Best Organic Social Media Automation, $500 Pixero credits)

**Role:** Media Department.

**Implementation:**
- Pixero takes the winning wedge as a URL + positioning brief.
- It generates 5 Meta ad variants: copy + visual direction + targeting suggestion.
- We do NOT push live to a real ad account today. We show the generated set in-app.

**Why it fits:** Pixero's pitch is URL-in, campaign-out. We give it a URL plus a *pre-tested* wedge, which is a strictly better input than the raw URL alone. Their track prompt specifies social media automation, so we frame our output as "ads pre-validated against a synthetic audience."

**Demo visible:** Ad variants render inline on the results page with the wedge label above them.

### 4.4 Kalibr

**Role:** Operations. The nervous system.

**Implementation:**
- Every inter-agent call goes through Kalibr.
- Kalibr handles: model selection (Haiku for summarization, Sonnet for reasoning), retry on timeout, fallback to a cheaper path when the expensive one fails, cross-run learning if time allows.

**Why it fits:** Kalibr's value is visible in a trace, not a screen. So the trace panel shows "Kalibr rerouted model X to model Y after timeout" as a real line item. This makes the adaptive routing tangible to judges.

**Demo visible:** A "Kalibr events" count on the summary ("rerouted 4, recovered 4, no human intervention").

### 4.5 Rory

**Role:** Mission Control.

**Implementation:**
- At the end of a run, Scribe agent calls Rory to assemble a launch board.
- Board contains: 8-12 tasks derived from the wedge and ads, owner suggestions, a timeline, and a one-page executive summary.
- User can open the board in Rory directly.

**Why it fits:** Rory's thesis is "align humans and agents in one execution system." Shadow Launch produces a plan that a human team needs to execute. That hand-off is exactly Rory's job.

**Demo visible:** Click "Open in Rory" at the end. Show the board exists. This is the closing moment.

---

## 5. Data Model

Kept deliberately flat. No database today. State lives in memory per run, persisted as JSON files on disk keyed by `run_id`.

```python
Run {
    run_id: str
    created_at: datetime
    input: RunInput
    twin: MarketTwin
    wedges: list[Wedge]           # always len 3
    deliberation: Deliberation
    winner: WedgeVerdict
    ads: list[AdVariant]          # 5
    launch_board: LaunchBoard
    trace: list[TraceEvent]       # event log for UI
    kalibr_events: list[KalibrEvent]
}

RunInput {
    product_url: str
    competitor_urls: list[str]    # 2
    icp_description: str
}

MarketTwin {
    positioning_map: dict         # {competitor: [positioning_claims]}
    gaps: list[str]               # underplayed angles in the category
    sources: list[Source]         # per-actor pull summary
}

Wedge {
    id: str                       # w1, w2, w3
    headline: str                 # short name, e.g. "The last tool you buy"
    thesis: str                   # 2-3 sentence angle
    evidence: list[str]           # pulled from twin
}

Deliberation {
    rounds: int
    reactions: list[JurorReaction]   # n_jurors x n_wedges
    consensus_vector: dict[wedge_id, float]
    dissent_log: list[Dissent]       # surviving objections on the winner
}

JurorReaction {
    juror_id: str                 # champion | economic | blocker | skeptic
    wedge_id: str
    quote: str                    # 1-2 sentence in-character response
    score: float                  # -1 to +1
}

WedgeVerdict {
    wedge_id: str
    final_score: float
    runner_up_delta: float
    why_it_won: str
    surviving_objections: list[str]
}

AdVariant {
    headline: str
    body: str
    cta: str
    visual_brief: str
    pixero_url: str | None
}

LaunchBoard {
    tasks: list[Task]
    timeline: list[Milestone]
    executive_summary: str        # ~200 words
    rory_board_url: str | None
}

TraceEvent {
    t: datetime
    agent: str
    message: str
    kind: "info" | "ok" | "warn" | "error"
}
```

---

## 6. Frontend Screens

Three screens. That is all.

### 6.1 Landing / Input
Reuse the `shadow-launch.html` homepage as the marketing surface. Add a live input form that submits to the orchestrator.

Form fields:
- Product URL (required)
- Competitor URL 1 (required)
- Competitor URL 2 (required)
- ICP description (textarea, required, placeholder with example)
- "Run Shadow Launch" submit button

On submit: POST to `/api/runs`, receive `run_id`, redirect to `/run/{run_id}`.

### 6.2 Live Run View
Split layout:
- **Left 60%:** Stage cards that light up in sequence. Stage 01 Market Twin, Stage 02 Wedge Discovery, Stage 03 Jury, Stage 04 Campaign, Stage 05 Plan. Each shows a loading spinner, then a compact summary when done.
- **Right 40%:** The simulation readout panel (mono font, streaming log). This is the same component as on the homepage hero. It subscribes to the event stream.

Live updates via SSE from the orchestrator.

### 6.3 Results Page
Sectioned long-form page:
1. **Verdict banner.** The winning wedge, headline-sized. Score and confidence.
2. **Jury transcript.** All 4 jurors, all 3 wedges, as a readable panel. Dissent log highlighted.
3. **Ad set.** The 5 Pixero variants in a grid.
4. **Launch board.** Task list + executive summary. "Open in Rory" button.
5. **Re-run** and **Export** actions.

This page is the shareable artifact. Generate a public URL per run. Critical for the demo and for post-event virality.

---

## 7. Build Plan (hour by hour)

Times assume 10:00 AM hacking start.

### 10:00 - 10:30 · Scaffold
- [ ] Next.js app on Vercel (use `create-next-app` with TypeScript and Tailwind).
- [ ] FastAPI backend, deployed on Render or Fly.io.
- [ ] Drop the homepage HTML into `/public` or convert to a Next page.
- [ ] Supabase or just JSON-file persistence in `/runs/{run_id}.json`.
- [ ] Set up `.env` with ANTHROPIC_API_KEY, APIFY_TOKEN, MINDS_API_KEY, PIXERO_API_KEY, KALIBR_KEY.

### 10:30 - 11:15 · Scout (Apify integration)
- [ ] Wire up 2-3 Apify actors. Start narrow: Website Content Crawler + Google Search Results Scraper.
- [ ] Write `build_market_twin(urls)` that fans out, collects results, summarizes via Claude.
- [ ] Return a `MarketTwin` object. Log every actor call as a trace event.

### 11:15 - 11:45 · Cartographer (wedge discovery)
- [ ] Prompt Claude Sonnet with the market twin + ICP.
- [ ] Return 3 structured wedges (Pydantic model, use tool use for structured output).
- [ ] Each wedge must cite which parts of the twin it draws from.

### 11:45 - 12:30 · Clerk (Minds AI jury)
- [ ] Create 4 Minds AI clones using pre-written persona briefs.
- [ ] For each wedge, fire all 4 jurors in parallel with the wedge pitch as input.
- [ ] Parse their reactions, score them (ask Claude to score the reaction on a -1 to +1 scale).
- [ ] Compute consensus, pick winner, collect dissent.

**Pre-bake:** Before 12:30, pre-run the entire pipeline on a demo company (e.g., Linear or Notion or Ramp) and cache the results. This is the safety net.

### 12:30 - 1:00 · Lunch
Eat. Think about the demo narrative while chewing.

### 1:00 - 1:45 · Producer (Pixero)
- [ ] Hit Pixero API with product URL + winning wedge brief.
- [ ] Receive ad variants. If Pixero returns slower than expected, generate 5 placeholder variants with Claude and mark them as "Pixero-compatible, live generation in progress."

### 1:45 - 2:15 · Scribe (Rory) + Launch board
- [ ] Generate task list from winning wedge + ads using Claude.
- [ ] Call Rory API to create a board. If Rory API is not accessible today, render a Rory-styled board UI ourselves and link to a shareable Notion page as a fallback.
- [ ] Generate 200-word executive summary.

### 2:15 - 2:30 · Kalibr + trace polish
- [ ] Wrap inter-agent calls in a Kalibr routing layer (even a thin wrapper that logs events counts).
- [ ] Ensure the trace panel shows Kalibr events visibly.
- [ ] Polish the results page layout.

### 2:30 - 2:45 · Screen recording (NON-NEGOTIABLE)
This is a hard block on the calendar. Do not skip. Do not do it at 2:55.
- [ ] Open the pre-cached demo run. Full-screen the browser.
- [ ] Record a 90-second screen capture with voiceover following the §9 demo script.
- [ ] Save as `shadow-launch-demo.mp4` locally. Upload as unlisted YouTube.
- [ ] Drop both links in the submission form and in a pinned note on the desktop.

### 2:45 - 3:00 · Submission
- [ ] Deploy final to `shadowlaunch.ayushojha.com`. Verify from phone on cellular.
- [ ] Verify Vercel backup URL also resolves.
- [ ] Verify local dev server runs offline (`pnpm dev` with cached JSON) as ultimate fallback.
- [ ] Submit with: live URL, backup URL, video link, repo link.

### 3:00 - 4:00 · Other teams demo
Watch, learn, refine pitch. Note what judges react to.

### 4:00 - 4:30 · Finalist demo (if selected)
See §9.

---

## 8. Demo Safety Playbook

The demo must not rely on a live run finishing in 2 minutes on stage.

### 8.1 Two-lane strategy
- **Lane A (pre-cached):** A complete pre-computed run on a hero company (pick something everyone knows: Linear, Ramp, or Granola). Cached JSON. Loads in 3 seconds. Animates in to *look* live.
- **Lane B (live):** A real run against a volunteer company from the audience, if time permits at the end. Accept that it may take 3-4 minutes and cover with narration.

Default to Lane A for the 3-minute pitch slot. Lane B is a flex for Q&A or the finalist round.

### 8.2 Failure modes and fallbacks

Fallbacks are layered. Start at the top of the list. If a layer fails, drop to the next.

| Layer | If this breaks | Fall back to |
|---|---|---|
| L0 | Apify rate-limited | Pre-cached twin JSON (Lane A) |
| L0 | Minds AI slow | Pre-cached jury transcript, animate in |
| L0 | Pixero down | Claude-generated ad variants with Pixero-compatible schema |
| L0 | Rory API not working | In-app board UI, link to hosted Notion page |
| L1 | Deployed site unreachable | Local dev server on laptop, project to screen |
| L2 | Laptop dies / venue wifi collapses | Recorded video (`shadow-launch-demo.mp4`) played from phone |
| L3 | Everything on fire | Narrate the script from §9 with the phone on loop, live demo at the after-party |

The L2 video is the reason §0.5 marks it non-negotiable. Every hackathon demo failure story ends with "and I didn't have the video." Do not be that story.

### 8.3 Narration
The person narrating fills silence. Script 3-4 lines per stage so there is never a silent loading screen. Example for Stage 01: "Apify is fanning out right now. Six actors. It will pull competitor pages, category reviews on G2, job posts that hint at what competitors are building, and the Reddit threads where buyers complain. That becomes the market twin."

---

## 9. Demo Script (3-minute pitch)

**Slide 0 (10 sec):** Problem statement. "Every launch is a live experiment on customers who did not agree to be the test group. Teams spend six weeks and $30K to find out whether their positioning works. We thought that was insane. So we built Shadow Launch."

**Slide 1 (15 sec):** Product thesis. "Before you launch to the market, you launch to a shadow of it. A synthetic market twin. Buyer clones that argue. A wedge that survives a room before it meets a customer."

**Live run begins (90 sec):**

1. (0:00) Paste Linear's URL + Notion + Height + ICP. Hit run.
2. (0:10) Apify fires. Trace panel lights up. Narrate: "Six actors, live."
3. (0:30) Market twin renders. Three wedges appear. Narrate each.
4. (0:45) Jury convenes. Four clones. Narrate: "Champion, economic buyer, technical blocker, skeptic. They are about to tear these wedges apart."
5. (1:10) Objections stream in. Highlight one: "The CFO clone keeps saying payback unclear. Every wedge has to answer that."
6. (1:25) Winner declared. Wedge 02. Narrate why. Show the surviving dissent.
7. (1:35) Pixero generates ads. Show the 5 variants.
8. (1:45) Rory board appears. Click Open in Rory. Show the page.

**Close (30 sec):** "We used Apify to build the twin. Minds AI as the jury. Pixero to manufacture the creative. Kalibr kept the agent graph alive through four retries. Rory gave us the launch plan. Every tool did load-bearing work. The output is a go-to-market motion that never existed an hour ago. Shadow Launch. Rehearse the launch, before the launch."

**Drop mic.** Smile. Walk off.

---

## 10. Prize Track Strategy

Ranked by probability of winning, given the build.

1. **Best Use of Minds AI** (primary target). The jury-as-product framing is deeper than anything else being built today. High conviction.
2. **Best Use of Apify**. Multi-actor chained pipeline with visible trace. Strong shot.
3. **Overall 1st/2nd/3rd**. The narrative is category-defining, not a feature. Depends on execution polish. Finalists demo slot is the variable.
4. **Best Pixero**. Weaker. We use Pixero but not deeply. Skip optimizing for this unless everything else ships.

---

## 11. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Minds AI API takes >30s per clone | High | Pre-compute for demo. Stream cached responses with artificial delay. |
| Apify actor quota hit | Medium | Use cached JSON for demo run. Reserve quota for the live Lane B. |
| Over-scope on Rory integration | Medium | Fallback: in-app board UI. Do not block critical path on Rory. |
| Kalibr integration is shallow | Low | Frame it as the observability layer. The trace panel sells the story. |
| Backend crashes live | Medium | Record video backup at 2:45 PM. Always. |
| No one understands the pitch | High | Pitch test on 2 strangers at lunch. Refine if they blank on the "wedge" concept. |

---

## 12. Explicitly Out of Scope for Today

To protect the 5-hour window, none of the following are in scope:

- User auth or accounts
- Persistence beyond JSON files
- Multi-tenancy
- Billing
- Real ad-account push to Meta
- Real outbound messages to prospects
- Opt-in flows for real customers (the jury uses composites only, no named individuals)
- More than 4 jurors
- More than 3 wedges
- Round 2 of jury deliberation (stretch goal only)
- Safari polish (Chrome is fine for demo)
- Mobile (demo is on a laptop, period)

---

## 13. Post-Hackathon Next Steps (for the application narrative)

If Shadow Launch lands, these are the 30-day moves:

1. Open a waitlist on `shadowlaunch.so` or a subdomain of ayushojha.com.
2. Run 5 design-partner runs against real B2B companies. Publish the wedge discoveries (anonymized) as content.
3. Add Lane B: real-customer clones with explicit opt-in, revenue-share if the clone closes a deal.
4. YC S26 application angle: Shadow Launch is a new category, not a better SDR. Position against the ocean of "AI marketing copilot" companies.
5. Integration depth: add LinkedIn ads, HubSpot export, Salesforce opportunity stage mapping.

---

## 14. Open Questions to Resolve Before 10:00 AM

These need answers before the code starts.

1. Hero demo target: Linear, Ramp, Granola, or something else? (Pick one by 9:30.)
2. Is Rory API publicly accessible today, or do we go to the fallback board? (Ask at sponsor table during check-in.)
3. Minds AI: what is the actual per-clone latency and rate limit today? (Verify at 9:45.)
4. Which 4 Apify actors to use? (Confirmed list by 10:15 based on live availability.)
5. Pitch test reader: who at the venue can read §9 cold at 12:45 and tell me if it lands?

---

## Appendix A · Prompts

### A.1 Cartographer (wedge discovery)

```
You are a senior GTM strategist. Given a market twin and an ICP, surface
exactly 3 narrative wedges the product could own.

A wedge is a positioning angle, not a feature. It is a way of framing
what this product is FOR that the competitors have underplayed.

For each wedge return:
- A short headline (5-8 words)
- A 2-3 sentence thesis
- At least 2 evidence pointers back to the market twin

Do not return features. Do not return tactics. Return positioning.

MARKET TWIN: {twin_json}
ICP: {icp_text}
```

### A.2 Clerk (jury facilitation)

```
You are facilitating a synthetic buyer jury. You have 4 personas, each
already instantiated. Present each wedge to all 4 personas. For each
persona-wedge pair, collect:

- A short in-character reaction (1-2 sentences)
- A score from -1.0 (strongly reject) to +1.0 (strongly endorse)
- The single objection this persona most wants addressed

Then compute a weighted consensus score per wedge. Weights:
- Champion: 0.20
- Economic Buyer: 0.35
- Technical Blocker: 0.25
- Skeptic: 0.20

Return the winning wedge and a list of surviving objections the team
must prepare for even though the wedge won.
```

### A.3 Scribe (launch board)

```
Given the winning wedge, the dissent log, and the ad set, produce a
launch board for a 14-day execution sprint. Include:

- 8 to 12 tasks with clear owners (Marketing, Founder, Design, GTM Eng)
- A timeline in days
- A 200-word executive summary that a founder can paste into an investor
  update tomorrow

The summary opens with the wedge, names the top 2 surviving objections,
and closes with the metric we are watching.
```

---

## Appendix B · File Layout

```
shadow-launch/
├── web/                      # Next.js frontend
│   ├── app/
│   │   ├── page.tsx         # Landing (port of homepage HTML)
│   │   ├── run/[id]/page.tsx
│   │   └── results/[id]/page.tsx
│   ├── components/
│   │   ├── TracePanel.tsx
│   │   ├── StageCard.tsx
│   │   └── JuryRoom.tsx
│   └── lib/api.ts
├── api/                      # FastAPI backend
│   ├── main.py              # routes
│   ├── orchestrator.py      # Kalibr-wrapped agent graph
│   ├── agents/
│   │   ├── scout.py
│   │   ├── cartographer.py
│   │   ├── clerk.py
│   │   ├── producer.py
│   │   └── scribe.py
│   ├── models.py            # Pydantic
│   └── cache/               # pre-baked runs
├── cache/demo-linear.json   # hero demo
├── cache/demo-ramp.json     # backup hero
├── .env.example
└── README.md
```

---

## Appendix C · The One Line

If the whole spec collapsed into a single sentence for the judges:

> **Shadow Launch is a synthetic market you can launch into before you touch the real one. It replaces the six-week, thirty-thousand-dollar "find out by shipping" with a two-minute, three-dollar simulation that returns a pressure-tested wedge, the ads for it, and a launch plan on one board.**

That is the sentence. Everything else is proof.

---

---

**Author:** Ayush Ojha · ayushozha@outlook.com · [linkedin.com/in/ayushozha](https://linkedin.com/in/ayushozha)
**Demo:** shadowlaunch.ayushojha.com (primary) · shadow-launch.vercel.app (backup) · `shadow-launch-demo.mp4` (offline)
**Built:** 04.18.26 · Entrepreneurs First SF · Marketing Agents Hackathon

**End of spec. Ship it.**
