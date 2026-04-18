# Shadow Launch — Feature Checklist

Source of truth for what must exist to satisfy `specs.md`. Nothing here is invented; every entry cites a spec section. Flip `⬜` to `✅` **only after** the feature is built and verified against its "what should happen" criterion.

**Legend:** ⬜ Not started · 🟨 In progress · ✅ Completed · ⛔ Blocked

---

## §0.5 Non-Negotiables

### ⬜ `precached-hero-run`
- **Description:** A complete pre-computed run on a hero company (Linear, Ramp, or Granola) stored on disk so the demo never depends on live APIs finishing in 2 minutes on stage.
- **Technologies:** JSON file on disk, frontend animation layer that replays cached events as if live.
- **Database / persistence:** `cache/demo-linear.json` (or `cache/demo-ramp.json`, `cache/demo-granola.json` as backups). No database.
- **Expected outcome:** The demo loads the cached run in under 3 seconds and animates it in to look live.
- **What should happen:** User clicks "Run Shadow Launch" on the hero target → frontend loads the cached JSON, streams trace events with artificial delay, every stage card fills in exactly as it would on a real run, and ends with the same Results Page.
- **Spec ref:** §0.5 item 1, §8.1 Lane A.

### ⬜ `demo-screen-recording`
- **Description:** 90-second narrated screen recording of the demo saved locally and mirrored to an unlisted YouTube link. Final offline fallback.
- **Technologies:** Screen recorder → `.mp4`, YouTube unlisted upload.
- **Database / persistence:** Local file `shadow-launch-demo.mp4` + unlisted YouTube URL.
- **Expected outcome:** By **2:45 PM PT**, the mp4 exists on disk AND on YouTube. Links are in the submission form and pinned on desktop.
- **What should happen:** If venue wifi dies or laptop fails, the narrator plays the mp4 from phone and still delivers the pitch.
- **Spec ref:** §0.5 item 2, §8.2 Layer L2.

### ⬜ `deployed-live-site`
- **Description:** Production deployment reachable from any laptop or phone on cellular.
- **Technologies:** Vercel.
- **Database / persistence:** N/A (static frontend + serverless/remote backend).
- **Expected outcome:** `shadowlaunch.ayushojha.com` resolves; `shadow-launch.vercel.app` resolves as automatic backup; both load from a phone on cellular.
- **What should happen:** Any judge can open either URL from their own device and reach a working app.
- **Spec ref:** §0.5 item 3.

---

## §1.3 Input / Output Contract

### ⬜ `run-input-contract`
- **Description:** Strict 3-field input the user must provide to start a run.
- **Technologies:** Frontend form, Pydantic validation on the backend.
- **Database / persistence:** Stored as `RunInput` inside `Run` JSON at `/runs/{run_id}.json`.
- **Expected outcome:** Backend rejects any run missing product URL, two competitor URLs, or an ICP paragraph.
- **What should happen:**
  - **Input fields:** Product URL (required), Competitor URL 1 (required), Competitor URL 2 (required), ICP description (required textarea).
  - Submitting with any field empty → client-side + server-side validation error.
  - Submitting with all fields populated → POST `/api/runs` → receive `run_id` → redirect to `/run/{run_id}`.
- **Spec ref:** §1.3 Input, §6.1.

### ⬜ `run-output-contract`
- **Description:** The complete deliverable set a user receives at the end of a run.
- **Technologies:** Rendered on the Results Page; all six artifacts are fields on the `Run` JSON.
- **Database / persistence:** Serialized into `/runs/{run_id}.json`.
- **Expected outcome:** Every successful run returns all six outputs below; none may be missing on the Results Page.
- **What should happen — the six outputs:**
  1. Market twin summary (positioning landscape + gaps).
  2. Three candidate narrative wedges, ranked.
  3. Jury deliberation transcript (4 synthetic buyers).
  4. Winning wedge with scores and dissent log.
  5. Meta ad creative set — exactly 5 variants — for the winning wedge.
  6. A launch board with owners, tasks, and a one-page executive summary.
- **Spec ref:** §1.3 Output.

---

## §3 Architecture

### ⬜ `frontend-nextjs-app`
- **Description:** Three-screen Next.js frontend that is the only surface the user sees.
- **Technologies:** Next.js (TypeScript, Tailwind per §7), deployed on Vercel.
- **Database / persistence:** N/A. Reads from backend via HTTP + SSE.
- **Expected outcome:** Three routes — `/` (landing + input), `/run/[id]` (live run view), `/results/[id]` (results page) — all functional.
- **What should happen:** User flows Landing → Live Run → Results without leaving the app. See §6 features for per-screen behavior.
- **Spec ref:** §3.1 diagram, §6, Appendix B.

### ⬜ `backend-fastapi-orchestrator`
- **Description:** Python FastAPI service that orchestrates the 5-agent graph and exposes the API + event stream to the frontend.
- **Technologies:** Python, FastAPI, Pydantic. Deployed on Render or Fly.io.
- **Database / persistence:** JSON files on disk at `api/cache/` and per-run `/runs/{run_id}.json`. No database.
- **Expected outcome:** Backend accepts run requests, executes the 5-agent pipeline (Scout → Cartographer → Clerk → Producer → Scribe), emits trace events on an event bus, and writes the final `Run` JSON.
- **What should happen:** POST to `/api/runs` triggers the agent graph; every stage emits events subscribed to by the frontend; final `Run` object is persisted and retrievable.
- **Spec ref:** §3.1 diagram, §3.3 data flow, Appendix B.

### ⬜ `kalibr-routing-layer`
- **Description:** Every inter-agent call is wrapped by Kalibr. Responsible for model selection, retry on timeout, fallback to cheaper paths, and cross-run learning.
- **Technologies:** Kalibr SDK (`kalibr` Python package), wrapping Anthropic + other model calls.
- **Database / persistence:** Kalibr events recorded as `KalibrEvent` entries in the `Run` JSON and surfaced in the trace.
- **Expected outcome:** On the summary, a visible "Kalibr events" count reads e.g. "rerouted 4, recovered 4, no human intervention."
- **What should happen:**
  - Haiku is selected for summarization tasks; Sonnet is selected for reasoning tasks.
  - On timeout, Kalibr retries and/or reroutes to a fallback model.
  - The trace panel shows lines like `KALIBR rerouting creative_gen after timeout on model_1`.
  - Cross-run learning is a stretch item ("if time allows" per §4.4).
- **Spec ref:** §3.1, §4.4.

### ⬜ `event-bus-sse-stream`
- **Description:** Every agent stage emits events on a shared event bus; the frontend subscribes and renders the trace live. Makes the 2-minute run feel cinematic instead of silent.
- **Technologies:** FastAPI + Server-Sent Events (SSE) (WebSocket acceptable per §3.1 diagram).
- **Database / persistence:** Events appended to `Run.trace` (list of `TraceEvent`) in the JSON file.
- **Expected outcome:** Frontend Live Run View receives events in real time; each event is labeled by agent and kind (`info | ok | warn | error`).
- **What should happen:** As Scout, Cartographer, Clerk, Producer, Scribe each execute, the trace panel streams their events without buffering delay > 1s.
- **Spec ref:** §3.3 final paragraph, §6.2.

### ⬜ `agent-scout`
- **Description:** Agent responsible for building the Market Twin from the public web.
- **Technologies:** Apify (6 actors in parallel) + Claude Sonnet for summarization. Kalibr-wrapped.
- **Database / persistence:** Result stored as `MarketTwin` on the `Run` JSON.
- **Expected outcome:** Returns a `MarketTwin` containing `positioning_map`, `gaps`, and `sources` (per-actor pull summary).
- **What should happen:**
  - `build_market_twin(urls)` fans out across product + competitor URLs using the Apify actor set.
  - Every actor call is logged as a trace event.
  - Claude Sonnet summarizes raw pulls into the positioning map and gaps list.
  - Narrow MVP: start with Website Content Crawler + Google Search Results Scraper, expand as time allows.
- **Spec ref:** §3.2, §4.1, §7 10:30–11:15.

### ⬜ `agent-cartographer`
- **Description:** Agent that surfaces 3 narrative wedges from the market twin.
- **Technologies:** Claude Sonnet with structured output (Pydantic via tool use).
- **Database / persistence:** Result stored as `wedges: list[Wedge]` (always length 3) on the `Run` JSON.
- **Expected outcome:** Returns exactly 3 `Wedge` objects. Each has `id` (w1/w2/w3), `headline` (5–8 words), `thesis` (2–3 sentences), and `evidence` (at least 2 pointers back to the twin).
- **What should happen:**
  - Prompted per Appendix A.1.
  - Returns positioning angles, NOT features and NOT tactics.
  - Each wedge cites which parts of the market twin it draws from.
- **Spec ref:** §3.2, §7 11:15–11:45, Appendix A.1.

### ⬜ `agent-clerk`
- **Description:** Agent that convenes the 4-persona synthetic buyer jury and runs the deliberation.
- **Technologies:** Minds AI clones (Champion, Economic Buyer, Technical Blocker, Skeptic) + Claude for facilitation and scoring.
- **Database / persistence:** Result stored as `Deliberation` on the `Run` JSON (`rounds`, `reactions` n_jurors × n_wedges, `consensus_vector`, `dissent_log`).
- **Expected outcome:** Returns a full 4×3 reaction matrix (12 `JurorReaction` entries), a weighted consensus vector, and a dissent log of surviving objections on the winner.
- **What should happen:**
  - Clones built from Apify-harvested LinkedIn corpora of real people in those roles.
  - Composites only; no named individuals.
  - All 4 jurors see all 3 wedges, produce in-character reactions + scores (−1 to +1) + top objection.
  - Weighted consensus scoring: Champion 0.20, Economic Buyer 0.35, Technical Blocker 0.25, Skeptic 0.20.
  - Round 2 dialogue between clones is stretch only (§12).
  - Surviving dissent on the winner must be preserved (e.g. "CFO clone still objects to payback period").
- **Spec ref:** §3.2, §4.2, §7 11:45–12:30, Appendix A.2, §12.

### ⬜ `agent-producer`
- **Description:** Agent that turns the winning wedge into Meta ad creative.
- **Technologies:** Pixero API.
- **Database / persistence:** Result stored as `ads: list[AdVariant]` (exactly 5) on the `Run` JSON.
- **Expected outcome:** 5 `AdVariant` objects, each with `headline`, `body`, `cta`, `visual_brief`, and optional `pixero_url`.
- **What should happen:**
  - Input to Pixero: product URL + winning wedge positioning brief.
  - Output: 5 Meta ad variants (copy + visual direction + targeting suggestion).
  - Ads are NOT pushed to any real Meta ad account — in-app display only.
  - If Pixero is slow/down: Producer generates 5 Claude-authored variants in the Pixero-compatible schema, marked "Pixero-compatible, live generation in progress" (see `fallback-pixero-down`).
- **Spec ref:** §3.2, §4.3, §7 1:00–1:45.

### ⬜ `agent-scribe`
- **Description:** Agent that assembles the Launch Board and writes the executive summary.
- **Technologies:** Rory API + Claude Sonnet for summary prose.
- **Database / persistence:** Result stored as `LaunchBoard` on the `Run` JSON.
- **Expected outcome:** `LaunchBoard` with 8–12 tasks, a timeline of milestones, a ~200-word `executive_summary`, and (if Rory is reachable) a `rory_board_url`.
- **What should happen:**
  - Tasks derived from winning wedge + ads; owners tagged (Marketing, Founder, Design, GTM Eng).
  - 14-day execution sprint.
  - Executive summary opens with the wedge, names the top 2 surviving objections, closes with the metric to watch.
  - Fallback if Rory API unavailable: in-app Rory-styled board UI + shareable Notion link (see `fallback-rory-unreachable`).
- **Spec ref:** §3.2, §4.5, §7 1:45–2:15, Appendix A.3.

---

## §5 Data Model (Pydantic)

All models are Pydantic classes living in `api/models.py`. Every field listed in §5 must be present. Runs are serialized to `/runs/{run_id}.json`. No database.

### ⬜ `data-model-run`
- **Description:** Top-level run object.
- **Fields:** `run_id: str`, `created_at: datetime`, `input: RunInput`, `twin: MarketTwin`, `wedges: list[Wedge]` (len 3), `deliberation: Deliberation`, `winner: WedgeVerdict`, `ads: list[AdVariant]` (len 5), `launch_board: LaunchBoard`, `trace: list[TraceEvent]`, `kalibr_events: list[KalibrEvent]`.
- **Persistence:** `/runs/{run_id}.json`.
- **What should happen:** Every completed run validates as a full `Run`; no field is optional except what the spec marks optional (`pixero_url`, `rory_board_url`).
- **Spec ref:** §5.

### ⬜ `data-model-run-input`
- **Fields:** `product_url: str`, `competitor_urls: list[str]` (exactly 2), `icp_description: str`.
- **Spec ref:** §5.

### ⬜ `data-model-market-twin`
- **Fields:** `positioning_map: dict` (`{competitor: [positioning_claims]}`), `gaps: list[str]`, `sources: list[Source]`.
- **Spec ref:** §5.

### ⬜ `data-model-wedge`
- **Fields:** `id: str` (`w1|w2|w3`), `headline: str`, `thesis: str`, `evidence: list[str]`.
- **Spec ref:** §5.

### ⬜ `data-model-deliberation`
- **Fields:** `rounds: int`, `reactions: list[JurorReaction]` (n_jurors × n_wedges), `consensus_vector: dict[wedge_id, float]`, `dissent_log: list[Dissent]`.
- **Spec ref:** §5.

### ⬜ `data-model-juror-reaction`
- **Fields:** `juror_id: str` (`champion|economic|blocker|skeptic`), `wedge_id: str`, `quote: str`, `score: float` (−1 to +1).
- **Spec ref:** §5.

### ⬜ `data-model-wedge-verdict`
- **Fields:** `wedge_id: str`, `final_score: float`, `runner_up_delta: float`, `why_it_won: str`, `surviving_objections: list[str]`.
- **Spec ref:** §5.

### ⬜ `data-model-ad-variant`
- **Fields:** `headline: str`, `body: str`, `cta: str`, `visual_brief: str`, `pixero_url: str | None`.
- **Spec ref:** §5.

### ⬜ `data-model-launch-board`
- **Fields:** `tasks: list[Task]`, `timeline: list[Milestone]`, `executive_summary: str` (~200 words), `rory_board_url: str | None`.
- **Spec ref:** §5.

### ⬜ `data-model-trace-event`
- **Fields:** `t: datetime`, `agent: str`, `message: str`, `kind: "info" | "ok" | "warn" | "error"`.
- **Spec ref:** §5.

### ⬜ `data-model-kalibr-event`
- **Description:** Declared as a field on `Run` (`kalibr_events: list[KalibrEvent]`). Shape not fully specified — at minimum must record Kalibr routing actions visible on the summary ("rerouted 4, recovered 4").
- **Spec ref:** §5, §4.4.

---

## §4 Sponsor Integrations (load-bearing)

Each integration has a **Demo visible** criterion — that is the acceptance test.

### ⬜ `apify-integration`
- **Description:** Apify as the Research Department. Multi-actor chained pipeline that feeds the Scout agent.
- **Technologies:** Apify API. Target 4–6 actors, verify availability at kickoff.
- **Database / persistence:** Raw pulls summarized into `MarketTwin.sources` on `Run` JSON.
- **Expected outcome:** Multiple Apify actors fire per run; their activity is visible in the trace panel with actor name and document counts ticking up.
- **What should happen — actor shortlist:**
  1. Website Content Crawler — product + competitor sites.
  2. Google Search Results Scraper — category discourse.
  3. Reddit Scraper — category complaints/desires.
  4. LinkedIn Jobs Scraper — competitor hiring signals.
  5. G2 / Capterra review scraper — sentiment and feature gaps.
  6. Twitter / X Scraper — live voice of the market.
- **Demo visible:** Trace panel shows each actor firing by name, with document counts ticking up.
- **Prize track:** Best Use of Apify, $500.
- **Spec ref:** §4.1, §7 10:30–11:15.

### ⬜ `minds-ai-integration`
- **Description:** Minds AI as the Voice Department — the jury.
- **Technologies:** Minds AI clone API.
- **Database / persistence:** Reactions saved under `Deliberation.reactions` on `Run` JSON.
- **Expected outcome:** Four composite buyer clones — Champion, Economic Buyer, Technical Blocker, Skeptic — deliver reactions to each wedge that stream live in a jury-room UI.
- **What should happen:**
  - Clones built from Apify-harvested LinkedIn posts/articles of real people in those roles.
  - No named individuals; archetype composites only (consent/safety story).
  - Each clone reacts to all 3 wedges with a scored response.
  - Round 2 (clones responding to each other) only if time allows.
- **Demo visible:** Live jury-room UI where each clone's reaction streams in. Dissent log on the winner highlighted (e.g. "the CFO clone still objects to payback period") — this is the moment that sells it.
- **Prize track:** Best Use of Minds AI, internship opportunity (primary target).
- **Spec ref:** §4.2, §7 11:45–12:30, §10 #1.

### ⬜ `pixero-integration`
- **Description:** Pixero as the Media Department. Takes winning wedge + product URL, returns 5 Meta ad variants.
- **Technologies:** Pixero API.
- **Database / persistence:** Variants saved under `Run.ads` as `AdVariant[5]`.
- **Expected outcome:** 5 pre-validated Meta ad variants rendered inline on the Results Page with the wedge label above them.
- **What should happen:** Framing is "ads pre-validated against a synthetic audience." No live push to a real ad account.
- **Demo visible:** Ad variants render inline on the Results Page grid.
- **Prize track:** Best Organic Social Media Automation, $500 Pixero credits.
- **Spec ref:** §4.3, §7 1:00–1:45.

### ⬜ `kalibr-integration`
- **Description:** Kalibr as Operations. The nervous system wrapping every inter-agent call.
- **Technologies:** Kalibr SDK.
- **Database / persistence:** Events on `Run.kalibr_events`; surfaced in trace.
- **Expected outcome:** A visible "Kalibr events" count on the summary that demonstrates adaptive routing (e.g. "rerouted 4, recovered 4, no human intervention").
- **What should happen:** Model selection (Haiku vs Sonnet), retry on timeout, fallback to cheaper paths, optional cross-run learning. Trace panel shows Kalibr events as real line items.
- **Demo visible:** "Kalibr rerouted model X to model Y after timeout" appears in the trace; summary shows Kalibr event counts.
- **Spec ref:** §4.4, §7 2:15–2:30.

### ⬜ `rory-integration`
- **Description:** Rory as Mission Control. Produces the launch board that the human team executes.
- **Technologies:** Rory API.
- **Database / persistence:** `rory_board_url` on `LaunchBoard`.
- **Expected outcome:** At the end of a run, an "Open in Rory" button opens the assembled board directly in Rory.
- **What should happen:** Board contains 8–12 tasks, owner suggestions, a timeline, and a one-page executive summary. Fallback to in-app UI + Notion link if Rory API is unavailable (see `fallback-rory-unreachable`).
- **Demo visible:** "Open in Rory" click at the end of the demo. This is the closing moment.
- **Spec ref:** §4.5, §7 1:45–2:15.

---

## §6 Frontend Screens

### ⬜ `screen-landing-input`
- **Description:** Route `/`. Marketing surface (reuse `shadow-launch.html` homepage) PLUS the live input form.
- **Technologies:** Next.js page at `web/app/page.tsx`.
- **Database / persistence:** N/A.
- **Expected outcome:** The homepage design is preserved AND there is a working input form that starts a run.
- **What should happen:**
  - Form fields: Product URL (required), Competitor URL 1 (required), Competitor URL 2 (required), ICP description (required textarea, placeholder with example), "Run Shadow Launch" submit button.
  - On submit: POST `/api/runs` → receive `run_id` → redirect to `/run/{run_id}`.
- **Spec ref:** §6.1, Appendix B.

### ⬜ `screen-live-run`
- **Description:** Route `/run/[id]`. Split layout where the user watches the pipeline execute.
- **Technologies:** Next.js page at `web/app/run/[id]/page.tsx`; SSE subscription to the event bus.
- **Database / persistence:** Reads from `/runs/{run_id}.json` via backend; no client persistence.
- **Expected outcome:** User sees 5 stage cards light up in sequence and a streaming trace panel update in real time.
- **What should happen:**
  - **Left 60%:** Stage cards — Stage 01 Market Twin, Stage 02 Wedge Discovery, Stage 03 Jury, Stage 04 Campaign, Stage 05 Plan. Each shows a loading spinner, then a compact summary when its agent completes.
  - **Right 40%:** Simulation readout panel (mono font, streaming log) — same component as the homepage hero's readout, subscribed to the live event stream.
  - Live updates via SSE from the orchestrator.
- **Spec ref:** §6.2.

### ⬜ `screen-results`
- **Description:** Route `/results/[id]`. Sectioned long-form page that is the shareable artifact.
- **Technologies:** Next.js page at `web/app/results/[id]/page.tsx`. Public per-run URL.
- **Database / persistence:** Reads from `/runs/{run_id}.json`.
- **Expected outcome:** A complete, shareable run page with 5 content sections + 2 actions. Critical for demo and post-event virality.
- **What should happen — sections in order:**
  1. **Verdict banner** — winning wedge headline-sized; score and confidence.
  2. **Jury transcript** — all 4 jurors × all 3 wedges as a readable panel; dissent log highlighted.
  3. **Ad set** — 5 Pixero variants in a grid.
  4. **Launch board** — task list + executive summary + "Open in Rory" button.
  5. **Re-run and Export actions.**
- **Spec ref:** §6.3.

### ⬜ `shareable-run-url`
- **Description:** Every run gets a public URL users can share post-demo.
- **Technologies:** Next.js dynamic route; public access (no auth per §12).
- **Database / persistence:** Uses `/runs/{run_id}.json`.
- **Expected outcome:** `/results/{run_id}` is accessible to anyone with the link.
- **Spec ref:** §6.3.

---

## §8 Demo Safety Playbook

### ⬜ `lane-a-precached-demo`
- **Description:** Hero company pre-computed run, default lane for the 3-minute pitch slot.
- **Technologies:** Cached JSON + frontend animate-in.
- **Database / persistence:** `cache/demo-linear.json` (+ `cache/demo-ramp.json`, `cache/demo-granola.json` backups).
- **Expected outcome:** Loads in 3 seconds, animates in to look live.
- **What should happen:** Default path for the pitch; indistinguishable from a live run visually.
- **Spec ref:** §8.1 Lane A.

### ⬜ `lane-b-live-demo`
- **Description:** Real run against a volunteer company from the audience, accepted to take 3–4 minutes.
- **Technologies:** Full live pipeline.
- **Database / persistence:** Produces a fresh `Run` JSON.
- **Expected outcome:** Flex option for Q&A or the finalist round. Narrator covers latency.
- **Spec ref:** §8.1 Lane B.

### ⬜ `fallback-apify-rate-limited` (L0)
- **Description:** If Apify is rate-limited, serve pre-cached twin JSON (Lane A).
- **Spec ref:** §8.2 row L0/Apify.

### ⬜ `fallback-minds-slow` (L0)
- **Description:** If Minds AI is slow, stream pre-cached jury transcript with artificial delay.
- **Spec ref:** §8.2 row L0/Minds, §11 row 1.

### ⬜ `fallback-pixero-down` (L0)
- **Description:** If Pixero is down, generate 5 ad variants with Claude in Pixero-compatible schema, marked "Pixero-compatible, live generation in progress."
- **Spec ref:** §8.2 row L0/Pixero, §7 1:00–1:45.

### ⬜ `fallback-rory-unreachable` (L0)
- **Description:** If Rory API is not reachable, render Rory-styled board UI in-app and link to a shareable Notion page.
- **Spec ref:** §8.2 row L0/Rory, §7 1:45–2:15.

### ⬜ `fallback-local-dev-server` (L1)
- **Description:** If deployed site is unreachable, run local dev server on the laptop and project to the screen. `pnpm dev` must work offline with cached JSON.
- **Spec ref:** §8.2 row L1, §7 2:45–3:00.

### ⬜ `fallback-recorded-video` (L2)
- **Description:** If laptop dies or wifi dies, play `shadow-launch-demo.mp4` from phone. Covered by `demo-screen-recording`.
- **Spec ref:** §8.2 row L2.

### ⬜ `fallback-narrate-from-script` (L3)
- **Description:** If everything fails, narrate §9 demo script with the phone on loop; do live demo at the after-party.
- **Spec ref:** §8.2 row L3.

### ⬜ `narration-script-per-stage`
- **Description:** 3–4 scripted narration lines per stage so there is never a silent loading screen.
- **Spec ref:** §8.3.

---

## §9 Demo Script Artifact

### ⬜ `demo-script-3min`
- **Description:** The written 3-minute pitch script covering Slide 0, Slide 1, the 90-second live run beats (8 timestamped moments), and the 30-second close. Lives alongside the spec and is the canonical narration source.
- **Spec ref:** §9.

---

## Appendix A · Prompts

### ⬜ `prompt-cartographer`
- **Description:** The Cartographer prompt verbatim from Appendix A.1. Claude Sonnet, structured output (Pydantic via tool use), returns exactly 3 wedges (headline 5–8 words, 2–3 sentence thesis, ≥2 evidence pointers). Must return positioning, not features, not tactics.
- **Spec ref:** Appendix A.1.

### ⬜ `prompt-clerk`
- **Description:** The Clerk facilitation prompt verbatim from Appendix A.2. Collects in-character reaction (1–2 sentences), score (−1 to +1), and top objection per persona-wedge pair. Computes weighted consensus (Champion 0.20, Economic 0.35, Blocker 0.25, Skeptic 0.20). Returns winning wedge + surviving objections.
- **Spec ref:** Appendix A.2.

### ⬜ `prompt-scribe`
- **Description:** The Scribe launch-board prompt verbatim from Appendix A.3. 8–12 tasks with owners (Marketing, Founder, Design, GTM Eng), timeline in days, ~200-word executive summary opening with the wedge, naming top 2 surviving objections, closing with the metric to watch.
- **Spec ref:** Appendix A.3.

---

## Appendix B · File Layout

### ⬜ `repo-file-layout`
- **Description:** Repository structure conforms to Appendix B:
  ```
  shadow-launch/
  ├── web/                      # Next.js frontend
  │   ├── app/
  │   │   ├── page.tsx         # Landing
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
- **Spec ref:** Appendix B.

### ⬜ `env-example`
- **Description:** `.env.example` committed with required keys (names only, no secrets): `ANTHROPIC_API_KEY`, `APIFY_TOKEN`, `MINDS_API_KEY`, `PIXERO_API_KEY`, `KALIBR_KEY` (already have `KALIBR_API_KEY` + `KALIBR_TENANT_ID` from earlier setup — reconcile naming).
- **Spec ref:** §7 10:00–10:30.

---

## §12 Explicit Out-of-Scope (do NOT build)

Recorded as negatives so completeness is provable. Any feature below being built is a **scope violation** of the spec.

- ⛔ User auth or accounts
- ⛔ Persistence beyond JSON files (no database)
- ⛔ Multi-tenancy
- ⛔ Billing
- ⛔ Real ad-account push to Meta
- ⛔ Real outbound messages to prospects
- ⛔ Opt-in flows for real customers (jury uses composites only, no named individuals)
- ⛔ More than 4 jurors
- ⛔ More than 3 wedges
- ⛔ Round 2 of jury deliberation (stretch goal only, not required)
- ⛔ Safari polish (Chrome only for demo)
- ⛔ Mobile (demo is on a laptop, period)

---

**Last verified against spec:** 2026-04-18. Re-read `specs.md` before marking any feature `✅` to confirm the current spec still matches.
