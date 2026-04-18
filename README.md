# Shadow Launch

Shadow Launch is a GTM strategy simulator.

You give it a product URL. It researches the company, discovers the market around it, studies competitors and their social traction, proposes a campaign and a content calendar, and then runs that plan through a panel of synthetic buyer personas before anything goes live.

The goal is simple: instead of launching ideas directly into the real market and learning the hard way, Shadow Launch lets a team rehearse the launch first.

Built for the Marketing Agents Hackathon at Entrepreneurs First SF on 2026-04-18.

---

## What The App Does

At a high level, the app turns one product URL into a full GTM output.

1. You paste in a product URL on the landing page.
2. Shadow Launch researches the product and summarizes what the company is claiming, who it seems to be selling to, and where its current messaging is weak.
3. It discovers the most relevant competitors automatically instead of asking the user to type them all in.
4. It scrapes public signals from those competitors, including website positioning and social activity, to understand what they are doing, how often they post, and what kind of traction they seem to be getting.
5. It uses those findings to generate campaign angles, creative prompts, visual assets, and a multi-day content plan.
6. It sends those ideas into a synthetic debate, where multiple buyer personas react, object, agree, and score what should move forward.
7. It collects everything into a results page that a founder, marketer, or GTM lead can actually use.

The point is not "AI makes some copy."

The point is "AI builds a research-backed plan, then pressure-tests that plan before a human team ships it."

---

## What Happens In The App

The product is organized around three main user-facing surfaces:

### Landing page

The landing page is where the run starts.

It explains the product idea, frames the problem, and gives the user a clear entry point. In the live v2 direction, the important user action is entering a product URL and starting a run. The job of this page is to answer:

- What is Shadow Launch?
- Why does it matter?
- What will happen if I give it my URL?

### Live run view

The live run view is the operational screen.

This is where the user watches the system work through the pipeline in stages. Rather than showing one black-box spinner, the app is meant to expose the work as it happens:

- product research
- competitor discovery
- social analysis
- market discourse
- campaign generation
- content calendar
- persona debate

This screen is where the app feels alive. The trace should show what is being researched, what stage is running, when a model is rerouted, and where outputs are being produced.

### Results page

The results page is the final artifact.

This is the page that should answer, in plain business terms, "What did Shadow Launch learn, what does it recommend, and what should we do next?"

In the current v2 structure, the results page is designed to include:

1. A product profile that explains how the company currently presents itself.
2. A competitor grid showing who else matters in the market and why.
3. A social traction comparison so the user can see who is posting, where they are active, and what kind of engagement they are getting.
4. A campaign proposal with the main angles Shadow Launch thinks are worth pursuing.
5. A creative gallery with generated visual assets tied to those campaign angles.
6. A compact content calendar so the plan turns into something operational, not just strategic.
7. A persona debate summary showing how the synthetic audience reacted.
8. A verdict list that highlights what should be pushed forward, what needs revision, and what should be rejected.
9. A Kalibr summary that shows routing, recovery, and cost telemetry.
10. Export and share actions so the run becomes reusable outside the app.

This page matters the most because it is where all of the sponsor work becomes legible to a human.

---

## How Each Sponsor Is Used

This repo has gone through more than one product direction, so some older demo-era files still mention a slightly different story. The current live direction is easiest to understand if you think about the sponsors in terms of responsibility.

### Apify

Apify is the research layer.

Apify is how Shadow Launch gets out of its own head and looks at the real public web. It is used to:

- crawl the user's site
- discover competitor candidates
- scrape competitor websites
- collect social activity from platforms like LinkedIn, X, Facebook, Instagram, and TikTok
- gather supporting discourse from places like Reddit and review sites

Without Apify, Shadow Launch would just be generating strategy from the user's own description. With Apify, it has real market inputs to work from.

In human terms: Apify is the system's eyes and ears.

### Minds AI

Minds AI is the evaluation layer.

Once Shadow Launch has campaign ideas, creative directions, and content plans, Minds AI is used to simulate how different buyer personas react to them. Instead of treating the generated plan as automatically good, the app asks:

- Would a Marketing VP buy this?
- Would a CFO push back on this?
- Would an Engineering Lead think this is credible?
- Would the target end-user actually care?
- Would a Social Media Manager think this is usable?
- Would a PR or brand-minded persona think this creates risk?

That synthetic panel is what turns the product from "marketing generation" into "marketing validation."

In human terms: Minds AI is the room where the work gets challenged before a real audience sees it.

### Kalibr

Kalibr is the control layer.

Shadow Launch makes a lot of model calls across research synthesis, reasoning, campaign writing, calendar generation, and image generation. Kalibr sits in the middle of those calls and handles:

- model routing
- retries
- reroutes when a path fails
- telemetry
- cost tracking

That matters because this app is not one prompt. It is a chain of dependent steps. If one model call fails or becomes too expensive, the product needs a way to keep the system moving and explain what happened.

In human terms: Kalibr is the traffic controller and black box recorder for the run.

### OpenAI

OpenAI is the generation layer in the current v2 build.

Once Apify has collected the raw market material, OpenAI is used to:

- summarize the product and market findings
- rank and frame competitors
- generate campaign angles
- draft copy
- build calendar entries
- generate image assets

OpenAI is not being used as the "whole product." It is being used as the writing and image engine inside a broader system that is grounded by research and judged by synthetic personas.

In human terms: OpenAI turns the inputs into strategy, copy, and creative output.

### About older sponsor references

Some earlier hackathon materials in this repo still mention Pixero and Rory. Those came from an earlier version of the product concept. The current live v2 direction is centered on Apify, Minds AI, Kalibr, and OpenAI.

The `/demo/*` pages still preserve parts of that earlier storytelling, but the current backend-driven app is aimed at the v2 GTM simulator flow.

---

## The Full Flow In Plain English

If you want the simplest explanation of the product, it is this:

1. The user gives Shadow Launch a product URL.
2. Shadow Launch reads that product the way a market analyst would.
3. It finds the competitors that matter.
4. It studies how those competitors position themselves and how they behave on social channels.
5. It turns those findings into a proposed GTM strategy.
6. It generates creative directions and supporting assets.
7. It arranges the work into a content plan.
8. It asks a synthetic panel of buyers and operators to critique the plan.
9. It returns a results page that shows what to keep, what to revise, and why.

That is the core promise of the app.

---

## App Surfaces In This Repo

The repo currently contains both the live product direction and preserved demo assets.

### Live app routes

- `/` - landing page
- `/run/[id]` - run entrypoint, which forwards into the staged run flow
- `/results/[id]` - backend-driven results page

### Demo routes

- `/demo`
- `/demo/01-landing`
- `/demo/02-run`
- `/demo/03-results`

The `/demo/*` routes are useful as static visual references. They are not the same thing as the backend-driven product flow.

---

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind v4

### Backend

- FastAPI
- Python 3.14
- Pydantic v2
- SQLAlchemy async
- asyncpg

### Data

- PostgreSQL 17.7
- direct TLS connection

### External systems

- Apify for research and scraping
- Minds AI for persona debate
- Kalibr for routing and telemetry
- OpenAI for text and image generation

---

## Repo Layout

```text
shadow-launch/
|-- web/                  # Next.js frontend
|   |-- app/              # routes
|   |-- components/       # UI pieces
|   `-- lib/              # typed API client + shared types
|-- api/                  # FastAPI backend
|   |-- agents/           # stage agents
|   |-- db/               # SQLAlchemy schema + session
|   |-- tests/            # backend tests
|   |-- events.py         # SSE event bus
|   |-- kalibr_router.py  # routing + telemetry
|   |-- main.py           # API routes
|   |-- models.py         # Pydantic models
|   `-- orchestrator.py   # run pipeline
|-- cache/                # demo artifacts
|-- docs/                 # specs, features, design notes
|-- requirements.txt      # Python deps
|-- specs.md              # original hackathon spec
`-- README.md
```

---

## Quick Start

```bash
git clone git@github.com:ayushozha/shadow-launch.git
cd shadow-launch

# backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# frontend
cd web
npm install
cd ..
```

Create a `.env` from `.env.example`, then start the services:

```bash
# backend
uvicorn api.main:app --reload --port 8000

# frontend
cd web
npm run dev
```

Local defaults:

- frontend: `http://localhost:3000`
- backend: `http://localhost:8000`

---

## Environment Variables

The important environment variables are:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `KALIBR_API_KEY`
- `KALIBR_TENANT_ID`
- `APIFY_TOKEN`
- `MINDS_API_KEY`
- `NEXT_PUBLIC_API_URL`

Optional:

- `APIFY_ACTOR_MEMORY_MB`
- `MINDS_ROUND_2`
- `ANTHROPIC_API_KEY`
- `PYTHONIOENCODING` for Windows

See [.env.example](.env.example) for the exact format and notes.

---

## Documentation

- [docs/features.md](docs/features.md) - feature tracker for the v2 GTM simulator direction
- [docs/design.md](docs/design.md) - visual and interaction direction
- [specs.md](specs.md) - original hackathon spec and earlier product framing

---

## Why This README Was Reframed

This project evolved quickly during a hackathon. Earlier versions of the repo described a narrower "wedge, ads, launch board" flow. The current direction is broader and more concrete:

- research the company
- discover competitors
- analyze social traction
- generate campaign strategy
- build a content calendar
- debate the work with synthetic personas
- present the final recommendation in a results page

This README is meant to explain that flow in normal language first, and only then point to the underlying code and setup.
