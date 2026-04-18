# Shadow Launch — Feature Checklist (v2 · GTM Strategy Simulator)

**Product thesis:** Drop in your product URL. Shadow Launch researches your company, discovers the market around you, analyzes competitors and their social traction, generates a proposed GTM campaign and content calendar, then pressure-tests every idea against a panel of 6 synthetic buyer personas before you launch.

**Non-negotiables:**
- **No dummy data outside `/demo`.** Production pages hit real APIs or surface an error state. The `/demo/*` routes remain as a visual showcase and are untouched.
- **Real backend, frontend, and database.** PostgreSQL on shared VPS. No JSON-file persistence for real runs.
- **Real sponsor integrations.** Apify live. OpenAI live. Minds AI live (6 personas). Kalibr live on every LLM/image call.

**Legend:** ⬜ Not started · 🟨 In progress · ✅ Completed · ⛔ Deprecated (from v1 build)

---

## §0. Non-Negotiables (v2)

### ⬜ `deployed-live-site`
- **Description:** Production deployment reachable from any laptop or phone on cellular.
- **Technologies:** Vercel (frontend), Fly.io or Render (backend), PostgreSQL on `72.62.82.57:5433`.
- **Expected outcome:** `shadowlaunch.ayushojha.com` and `shadow-launch.vercel.app` both resolve; both load from a phone on cellular.
- **What should happen:** Any judge can open either URL and submit a real URL to get real results.

### ⬜ `database-postgres`
- **Description:** Real database, not JSON files. All runs, competitors, social snapshots, campaigns, calendars, debates persist in PostgreSQL.
- **Technologies:** PostgreSQL 17.7 on shared VPS `72.62.82.57:5433`, accessed via SSH tunnel. SQLAlchemy 2.x async + asyncpg. Alembic for migrations.
- **Expected outcome:** Every run, every competitor, every asset, every persona reaction is retrievable by `run_id` after restart.
- **What should happen:**
  - Database: `shadowlaunch` on the shared instance.
  - Schema includes: `runs`, `product_profiles`, `competitors`, `social_snapshots`, `campaigns`, `content_posts`, `image_assets`, `content_calendars`, `calendar_slots`, `persona_reactions`, `debate_rounds`, `verdicts`, `kalibr_events`, `trace_events`.
  - Connection string loaded from `DATABASE_URL` env var.
  - All writes atomic within a run.

### ⬜ `no-dummy-fallback-policy`
- **Description:** Non-`/demo` routes never serve cache-fallback data. On failure, surface a real error state with retry.
- **Expected outcome:** When Apify errors, the user sees "Competitor discovery failed: rate limited — retry in X minutes," not a pre-baked Linear twin.
- **What should happen:** Remove every cache-fallback branch from `api/agents/*.py` for production paths. `/demo/*` pages keep their own cached JSON loader; they import from a separate `api/demo_loader.py` to keep the concerns visibly separate.

### ⬜ `demo-screen-recording`
- **Description:** 90-second narrated recording of a real live run, saved locally and on unlisted YouTube.
- **What should happen:** Recording captures a real input URL → real Apify harvest → real competitors → real debate. Offline fallback only.

---

## §1. Input / Output Contract

### ⬜ `run-input-url-only`
- **Description:** Single-field input: product URL. Everything else auto-discovered.
- **Technologies:** Frontend form, Pydantic `RunInput` validation.
- **Database / persistence:** Written to `runs` table with columns `run_id`, `product_url`, `submitted_at`, `status`.
- **Expected outcome:** Backend rejects non-URL input. URL must be reachable (HTTP 200 or 301/302 chain ending in 200).
- **What should happen:**
  - Only required field: `product_url`.
  - Optional: `brand_voice_guide` (textarea), `target_regions` (multi-select), `budget_constraint` (enum).
  - Submit → POST `/api/runs` → receive `{run_id, status}` → redirect to `/run/{run_id}`.
  - Validation errors: invalid URL, unreachable URL, blocked robots.txt — all surface clear messages.

### ⬜ `run-output-complete`
- **Description:** Every run returns the complete GTM deliverable bundle. The Results page renders all sections.
- **What should happen — the complete output:**
  1. **Product research profile** — positioning claims, implicit audience, tone inventory, current messaging gaps.
  2. **5–8 discovered competitors** — each with URL, one-line positioning, relevance-to-you score.
  3. **Cross-competitor social traction** — aggregated engagement per competitor across LinkedIn, X, Facebook, Instagram, TikTok.
  4. **Proposed GTM campaign** — 1–3 positioning angles, hook lines, channel mix, rationale grounded in competitor gaps.
  5. **Generated creative** — 3–5 image assets per campaign angle (real image files via OpenAI Images).
  6. **14-day content calendar** — per-channel posts with copy + asset references + post-time rationale.
  7. **Persona debate** — 6-persona reactions per campaign asset, per content post, per calendar slot. Round 1 and Round 2 (if plan allows).
  8. **Per-asset verdicts** — endorsed / flagged / rejected with reasoning.
  9. **Kalibr telemetry** — cost total, reroute count, per-asset model attribution.
  10. **Shareable results URL** and **exportable artifact** (markdown + JSON bundle).

---

## §2. Pipeline Agents (6-stage GTM flow)

### ⬜ `agent-product-researcher` (Stage 01)
- **Description:** Research the user's product from public signals. Build a `ProductProfile`.
- **Technologies:** Apify Website Content Crawler + Google SERP Scraper. OpenAI `gpt-4o` via Kalibr (`goal="research_synthesis"`).
- **Database / persistence:** `product_profiles` row linked to `run_id`.
- **Expected outcome:** `ProductProfile` with `positioning_claims` (5–10), `implicit_audience` (1–3 paragraphs), `tone_inventory` (list of style descriptors), `messaging_gaps` (what competitors say that this site doesn't).
- **What should happen:**
  - Apify fans out: crawl product URL + top-level pages, then Google SERP for brand + review mentions.
  - Summarize into `ProductProfile` via Kalibr → OpenAI.
  - On Apify failure: error state to user. No cache fallback.

### ⬜ `agent-competitor-discoverer` (Stage 02)
- **Description:** Automatically discover 5–8 competitors. Deduplicate and rank.
- **Technologies:** Apify Google SERP (queries: `"{product} alternatives"`, `"{product} vs"`, `"like {product}"`), Product Hunt scraper, G2 scraper. OpenAI via Kalibr (`goal="competitor_ranking"`).
- **Database / persistence:** `competitors` table, linked to `run_id`, each with `competitor_url`, `name`, `positioning`, `relevance_score`, `discovery_source`.
- **Expected outcome:** 5–8 `Competitor` rows per run. `relevance_score ∈ [0, 1]` with the top 5 flagged `selected=true`.
- **What should happen:**
  - Execute 3+ parallel Apify queries.
  - Aggregate + dedupe by canonical URL.
  - Kalibr ranks by relevance to the product profile.
  - Select top 5. Store all discovered.

### ⬜ `agent-social-analyzer` (Stage 03)
- **Description:** For each selected competitor, scrape social media across LinkedIn, X, Facebook, Instagram, TikTok. Compute engagement, cadence, and standout posts.
- **Technologies:** Apify platform-specific actors (LinkedIn Company Scraper, X/Twitter Scraper, Facebook Pages Scraper, Instagram Business Scraper, TikTok Business Scraper). Concurrency-aware orchestration.
- **Database / persistence:** `social_snapshots` rows — one per `(competitor_id, platform)` with `followers`, `avg_engagement_rate`, `posting_cadence_per_week`, `top_posts` (JSONB of top 10 posts with content + metrics), `last_scraped_at`.
- **Expected outcome:** For 5 competitors × 5 platforms = 25 social snapshots per run. Each with numeric engagement + sample posts.
- **What should happen:**
  - Run the 25 actor invocations via Apify with concurrency cap (8 in flight).
  - Graceful per-platform failure (if LinkedIn errors for one competitor, others continue; failed snapshot marked `status="error"`).
  - No data fabrication on failure.

### ⬜ `agent-campaign-generator` (Stage 04)
- **Description:** Synthesize the findings into a GTM campaign proposal with real creative assets.
- **Technologies:** OpenAI `gpt-4o` via Kalibr (`goal="creative"`) for copy. OpenAI Images (`dall-e-3` or `gpt-image-1`) via Kalibr (`goal="image_gen"`) for visuals.
- **Database / persistence:** `campaigns` row per run + `image_assets` rows per generated image. Image files stored as bytes in DB or as S3-style object storage (TBD — S3 preferred if we add a bucket).
- **Expected outcome:** 1–3 campaign angles, each with: positioning hook, channel mix, 3–5 image assets with URLs.
- **What should happen:**
  - Campaign draft cites competitor gaps as evidence for each angle.
  - For each angle: generate image prompts → call OpenAI Images → persist bytes → return asset URLs.
  - Every asset stamped with the model that made it (via Kalibr metadata).

### ⬜ `agent-calendar-builder` (Stage 05)
- **Description:** Lay out 14 days of per-channel content.
- **Technologies:** OpenAI `gpt-4o` via Kalibr (`goal="calendar_planning"`).
- **Database / persistence:** `content_calendars` row + `calendar_slots` rows (one per post: `day`, `channel`, `post_type`, `copy`, `asset_id`, `posting_time`, `rationale`).
- **Expected outcome:** 14-day calendar with ~20–40 posts across 5 channels. Each post cites which competitor behavior or persona response informed its timing.
- **What should happen:**
  - Calendar is sequenced against competitor posting cadence (we go when they're quiet).
  - Every slot references either a generated image asset or a text-only post.
  - Rationale is a 1–2 sentence explanation per slot.

### ⬜ `agent-persona-debater` (Stage 06)
- **Description:** Six synthetic buyer personas debate and score every piece of the plan.
- **Technologies:** Minds AI Panels API. `httpx` SSE consumer. OpenAI via Kalibr as the fallback when Minds plan doesn't cover 6 personas.
- **Database / persistence:** `debate_rounds` + `persona_reactions` + `verdicts` tables.
- **Expected outcome:** Per campaign angle + per content post + per image asset: 6 reactions with score ∈ [-1, +1] and a 1–2 sentence in-character objection or endorsement.
- **What should happen:**
  - 6 personas (see below).
  - Round 1: each persona reacts independently.
  - Round 2 (if Minds plan allows): personas respond to each other's objections.
  - Consensus computed with weighted scoring (weights tuned per persona's GTM-decision influence).
  - Any asset where ≥3 personas score <0 → flagged `action_required=true`.

---

## §3. The Six Personas

### ⬜ `personas-six-panel`
- **Description:** Six composite personas (NOT real individuals), each built from Apify-harvested LinkedIn corpora of real people in those roles.
- **Personas + weights (must sum to 1.0):**
  1. **Marketing VP** (0.20) — the buyer of GTM tools. Weighs ROI on brand spend.
  2. **CFO Skeptic** (0.25) — the one who signs the check. Demands payback math.
  3. **Engineering Lead** (0.15) — technical credibility filter. Vetoes tone-deaf copy.
  4. **Target End-User** (0.20) — the persona the product actually serves. The ICP.
  5. **Social Media Manager** (0.10) — the one executing the calendar. Flags unworkable cadence or off-voice creative.
  6. **PR / Brand Authority** (0.10) — protects brand reputation. Flags risk and hype drift.
- **Database / persistence:** `minds_sparks` table caches `persona_id → spark_id` so we don't burn Minds plan quota re-creating sparks across runs.
- **Spec deviation note:** Spec §4.2 mandated 4 personas. v2 expands to 6 for richer debate. Minds plan tier ≥ Premium required (free/lite tiers cap at 1/3 minds).

---

## §4. Architecture

### ⬜ `backend-fastapi-v2`
- **Description:** FastAPI app exposing the v2 routes.
- **Technologies:** Python 3.14, FastAPI, asyncpg, SQLAlchemy 2.x async, Pydantic v2.
- **Routes:**
  - `POST /api/runs` — accept `RunInput`, queue pipeline, return `{run_id, status}`.
  - `GET /api/runs/{id}` — full `Run` from DB.
  - `GET /api/runs/{id}/events` — SSE stream of trace events.
  - `GET /api/runs/{id}/competitors` — competitor list.
  - `GET /api/runs/{id}/competitors/{competitor_id}` — competitor detail + socials.
  - `GET /api/runs/{id}/calendar` — content calendar.
  - `GET /api/runs/{id}/debate` — debate transcript.
  - `GET /api/runs/{id}/assets/{asset_id}` — image bytes.
  - `POST /api/runs/{id}/feedback` — approve/reject an asset (feeds Kalibr learning).

### ⬜ `orchestrator-v2`
- **Description:** Kalibr-wrapped 6-stage pipeline with parallel sub-fan-outs (Apify concurrency in Stages 02 + 03).
- **Data flow:** `RunInput → ProductProfile → Competitor[] → SocialSnapshot[] → Campaign → ContentCalendar → Debate/Verdict`.

### ⬜ `event-bus-sse-v2`
- **Description:** Same event bus architecture as v1 — **keep the implementation**. Extend `TraceEvent` to carry `kalibr_model`, `kalibr_cost_delta`, and `stage` fields.

### ⬜ `kalibr-routing-layer-v2`
- **Description:** Existing Kalibr router extended with image-gen routing + cost telemetry.
- **What should happen:**
  - `goal` values: `research_synthesis`, `competitor_ranking`, `creative`, `image_gen`, `calendar_planning`, `persona_facilitation`.
  - Each `goal` maps to an ordered path of candidate models.
  - For `image_gen`: `["gpt-image-1", "dall-e-3"]`.
  - Every completion returns cost in USD; bus broadcasts a `cost_update` trace event.

### ⬜ `frontend-nextjs-v2`
- **Description:** Existing Next.js 16 scaffold — **keep it**. Landing page copy replaced. Live Run View extended for 6 stages. Results Page sections re-structured. New routes for competitor detail + calendar + debate.

---

## §5. Frontend Screens (v2)

### ⬜ `landing-v2`
- **Description:** New copy per the v2 paragraph. Single URL input.
- **Copy:** *"Drop in your product URL. Shadow Launch researches your company, discovers the market around you, analyzes competitors and their social traction, generates a proposed GTM campaign and content calendar, then pressure-tests every idea against a panel of synthetic buyer personas before you launch."*
- **What should happen:** The old marketing page design survives. Only the hero copy and form get rewritten. The input form drops to one required field (product URL) + two optional fields.

### ⬜ `live-run-6-stages`
- **Description:** Live Run View extended for 6 stages instead of 5.
- **Stage cards in order:** Product Research · Competitor Discovery · Social Analysis · Campaign Generation · Content Calendar · Persona Debate.
- **Right panel:** trace stream (existing component). Added: per-stage progress bar and Apify-actor-fan-out visualization.

### ⬜ `results-v2`
- **Description:** Results page completely restructured for new outputs.
- **Sections:**
  1. Product research profile
  2. Competitor grid (5 cards, clickable → detail page)
  3. Social traction comparison chart (engagement rates across platforms)
  4. Campaign proposal (angles + creative gallery)
  5. Content calendar (compact view + link to full calendar route)
  6. Persona debate summary (6 personas, top endorsements + top objections)
  7. Per-asset verdicts (green/yellow/red list)
  8. Kalibr summary (cost, reroutes, model attribution)
  9. Export + shareable URL actions

### ⬜ `competitor-detail-page`
- **Description:** New route `/run/{run_id}/competitor/{competitor_id}`.
- **Content:** Competitor positioning, one social card per platform (followers, engagement, top 3 posts, cadence chart).

### ⬜ `content-calendar-view`
- **Description:** New route `/run/{run_id}/calendar`.
- **Content:** 14-day calendar grid. Per-day column with multi-channel posts. Click a post to see copy + asset + rationale.

### ⬜ `persona-debate-panel`
- **Description:** New route `/run/{run_id}/debate` OR integrated section on results page.
- **Content:** 6 personas side-by-side. Per-asset reactions visible. Round 2 rebuttals as threaded replies.
- **Live variant:** During the Live Run View, Stage 06 renders this panel with reactions streaming in via Minds SSE.

### ⬜ `creative-gallery`
- **Description:** Inline component on results page showing generated images with per-asset persona dissent overlay.

---

## §6. Creative Sponsor Integrations (the differentiators)

### ⬜ `minds-panel-6-persona-debate`
- **Description:** Minds AI Panels drives the live debate. 6 sparks created per persona (cached in `minds_sparks` table).
- **What should happen:**
  - On first run: create 6 sparks (one per persona, `mode="manual"` with persona brief as system prompt), create 1 panel containing all 6. Store IDs.
  - Subsequent runs: reuse cached spark/panel IDs.
  - For each deliberation target (campaign angle, post, image), `POST /panels/{id}/ask` with the target as the question. Consume SSE. Parse per-persona reactions into `persona_reactions` rows.
- **Prize track:** Best Use of Minds AI.

### ⬜ `minds-round-2-rebuttals`
- **Description:** After round 1, personas respond to each other's top-3 objections.
- **What should happen:** Gated behind `MINDS_ROUND_2=1` env. Each persona sees a composite of the other 5's reactions and provides a rebuttal. Rendered as threaded replies in the debate panel.

### ⬜ `minds-dissent-heat-map`
- **Description:** Visual overlay on every campaign asset and calendar slot showing which personas objected.
- **What should happen:** Color-coded badges per asset (red: ≥3 persona dissent, yellow: 1–2, green: full endorsement). Hover reveals which personas and why.

### ⬜ `minds-auto-revise-flagged`
- **Description:** For any asset flagged `action_required=true`, auto-generate an alternative via Kalibr + re-run the relevant personas for a second opinion.
- **What should happen:** Marked as "revision 1" in the UI; shows both versions with persona delta scores.

### ⬜ `kalibr-cost-ticker`
- **Description:** Live cost counter streamed to UI during the run.
- **Technologies:** Kalibr completion cost telemetry → bus emits `cost_update` trace events.
- **What should happen:** Top-of-page badge: `$0.12 so far · 3 reroutes · 0 human interventions`. Updates in real time as each Kalibr call completes.

### ⬜ `kalibr-model-attribution-badges`
- **Description:** Every generated asset carries a "made by gpt-4o" (or whichever model) annotation, with reroute history if the primary failed.
- **What should happen:** Small italic caption under every image, post, calendar slot, and persona reaction. Badge color indicates model tier (fast vs capable). Hover shows full Kalibr reroute trail.

### ⬜ `kalibr-image-gen-routing`
- **Description:** Route image generation calls through Kalibr. Cheap first, reroute on quality reject.
- **What should happen:** `goal="image_gen"` paths: `["gpt-image-1", "dall-e-3"]`. If primary errors or returns a NSFW flag, reroute to secondary. Record event.

### ⬜ `kalibr-cross-run-learning`
- **Description:** When users approve or reject assets on the Results page, post outcome back to Kalibr. Future runs for the same tenant get sharper model selection.
- **Technologies:** `kalibr.report_outcome(trace_id, goal, success)` after feedback.
- **What should happen:** Every feedback button on the Results page is a Kalibr reward signal.

### ⬜ `kalibr-trace-capsule`
- **Description:** Every run gets a Kalibr trace capsule ID pinned on the Results page.
- **What should happen:** Link opens Kalibr's own dashboard showing the full decision graph of the run. Judge-accessible.

### ⬜ `apify-parallel-harvest`
- **Description:** Stage 02 + Stage 03 fan out many Apify actors simultaneously with a concurrency cap.
- **What should happen:** Up to 25 concurrent actor invocations (5 competitors × 5 platforms) with a per-platform concurrency limit of 8. All visible in the trace panel as a fan-out / fan-in pattern.
- **Prize track:** Best Use of Apify.

---

## §7. Data Models (v2)

Schema lives in `api/models.py` (Pydantic) + `api/db/schema.py` (SQLAlchemy). Every Pydantic model has a corresponding DB table where appropriate.

### ⬜ `model-run-v2`
- Fields: `run_id`, `product_url`, `brand_voice_guide?`, `target_regions?`, `budget_constraint?`, `status`, `created_at`, `completed_at?`, `cost_usd_total`, `kalibr_trace_capsule_id?`.

### ⬜ `model-product-profile`
- Fields: `run_id`, `positioning_claims: list[str]`, `implicit_audience: str`, `tone_inventory: list[str]`, `messaging_gaps: list[str]`.

### ⬜ `model-competitor`
- Fields: `competitor_id`, `run_id`, `url`, `name`, `positioning`, `relevance_score`, `discovery_source`, `selected`.

### ⬜ `model-social-snapshot`
- Fields: `snapshot_id`, `competitor_id`, `platform` (linkedin|x|facebook|instagram|tiktok), `followers`, `avg_engagement_rate`, `posting_cadence_per_week`, `top_posts` (JSONB), `last_scraped_at`, `status` (ok|error).

### ⬜ `model-campaign`
- Fields: `campaign_id`, `run_id`, `angles: list[CampaignAngle]`.
- `CampaignAngle`: `hook`, `channel_mix`, `rationale`, `asset_ids: list[int]`.

### ⬜ `model-image-asset`
- Fields: `asset_id`, `run_id`, `campaign_angle_id`, `prompt`, `model` (e.g. gpt-image-1), `bytes` (or `storage_url`), `kalibr_trace_id`.

### ⬜ `model-content-calendar`
- Fields: `calendar_id`, `run_id`, `days_span` (default 14).

### ⬜ `model-calendar-slot`
- Fields: `slot_id`, `calendar_id`, `day`, `channel`, `post_type`, `copy`, `asset_id?`, `posting_time`, `rationale`.

### ⬜ `model-persona-reaction`
- Fields: `reaction_id`, `run_id`, `persona_id` (one of 6), `target_type` (angle|post|asset|slot), `target_id`, `round` (1|2), `score` (−1..+1), `quote`, `top_objection`.

### ⬜ `model-verdict`
- Fields: `verdict_id`, `run_id`, `target_type`, `target_id`, `consensus_score`, `action_required` (bool), `dissenting_personas: list[persona_id]`, `why`.

### ⬜ `model-kalibr-event`
- Fields: `event_id`, `run_id`, `t`, `goal`, `from_model`, `to_model?`, `failure_category?`, `recovered`, `cost_usd_delta`.

### ⬜ `model-trace-event`
- Fields: `event_id`, `run_id`, `t`, `agent` (stage name), `message`, `kind` (info|ok|warn|error), `kalibr_model?`, `stage_index?`.

---

## §8. Environment Config

### ⬜ `env-v2`
- Required: `DATABASE_URL`, `KALIBR_API_KEY`, `KALIBR_TENANT_ID`, `OPENAI_API_KEY`, `APIFY_TOKEN`, `MINDS_API_KEY`.
- Optional flags: `MINDS_ROUND_2` (default `0`), `SCOUT_CONCURRENCY` (default `8`), `KALIBR_COST_TICKER` (default `1`).
- Deprecated: `ANTHROPIC_API_KEY` (kept in `.env.example` as optional hedge but not used by default).
- `DATABASE_URL` format: `postgresql+asyncpg://admin:<password>@127.0.0.1:5433/shadowlaunch` after SSH tunnel.

---

## §9. Demo Safety (separated from production)

### ⬜ `demo-pages-isolated`
- **Description:** `/demo/*` routes remain the visual showcase. They load from `cache/demo-linear.json` and never touch the production code path or database.
- **What should happen:** Confirmed untouched by v2 work. They exist for visual reference only.

### ⬜ `demo-screen-recording-v2`
- **Description:** 90-second recording of a real v2 live run (not a /demo page).

---

## §10. Prize-Track Strategy

1. **Best Use of Minds AI** — 6-persona debate + round-2 rebuttals + dissent heat map. Primary.
2. **Best Use of Apify** — 25 concurrent actors across 5 platforms per run. Primary.
3. **Best Use of Kalibr** — cost ticker + model attribution + cross-run learning + trace capsule. Secondary.
4. **Overall** — category-defining pitch: "GTM strategy simulator with synthetic validation." Aspirational.

---

## §11. Out of Scope (v2)

Kept from v1 spec, explicitly NOT building:
- ⛔ User auth / accounts
- ⛔ Multi-tenancy
- ⛔ Billing
- ⛔ Real ad-account push to Meta / LinkedIn
- ⛔ Real outbound messages to prospects
- ⛔ Named individuals as personas (all composite)

Added for v2:
- ⛔ Custom persona editing (6 fixed)
- ⛔ Real posting to social accounts (calendar is generative, not executional)
- ⛔ Image editing / regeneration beyond auto-revise

---

## Appendix A — Deprecated v1 Features

These features were built in v1 (earlier today, 4-stage flow). All ⛔ — replaced by v2 features above. Code is preserved in git history and referenced where reusable.

- ⛔ `precached-hero-run` (moved to /demo only; production never uses cache)
- ⛔ `run-input-contract` (3-field form → replaced by `run-input-url-only`)
- ⛔ `run-output-contract` (6 outputs → replaced by `run-output-complete` 10-section bundle)
- ⛔ `agent-scout` (replaced by `agent-product-researcher` + `agent-competitor-discoverer` + `agent-social-analyzer`)
- ⛔ `agent-cartographer` (replaced by `agent-campaign-generator`)
- ⛔ `agent-clerk` (4-juror panel → replaced by 6-persona `agent-persona-debater`)
- ⛔ `agent-producer` (single-shot 5-ad generation → replaced by `agent-campaign-generator` + image gallery)
- ⛔ `agent-scribe` (launch board → replaced by `agent-calendar-builder` + 14-day calendar)
- ⛔ `rory-integration` (no third-party board dependency; we own the calendar via our own `/calendar/{run_id}` route)
- ⛔ `pixero-integration` (OpenAI Images via Kalibr is the primary image path; no third-party creative tool dependency)
- ⛔ `screen-results` (v1 structure) — replaced by `results-v2`
- ⛔ `screen-live-run` (5 stages) — replaced by `live-run-6-stages`
- ⛔ `screen-landing-input` (3-field form) — replaced by `landing-v2`
- ⛔ `fallback-apify-rate-limited`, `fallback-minds-slow`, `fallback-pixero-down`, `fallback-rory-unreachable` — policy change: real data or error state, no silent cache fallback
- ⛔ All v1 data-model features (`data-model-run`, `data-model-wedge`, etc.) — entire schema rewritten for v2

Infrastructure reused from v1 (not deprecated, not rewritten):
- ✅ Kalibr routing layer (extended with new goals + image routing + cost telemetry)
- ✅ Event bus SSE implementation
- ✅ Next.js 16 scaffold + design system (Fraunces + paper/ink)
- ✅ FastAPI app structure
- ✅ `/demo/*` pages (visual showcase, isolated from production)

---

**Last reconciled:** 2026-04-18 (v2 pivot to GTM strategy simulator with 6-persona validation).
