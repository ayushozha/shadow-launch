# Shadow Launch

**Shadow Launch · synthetic market simulator for GTM teams.**

> Rehearse your launch against a synthetic twin of your market before you touch the real one.

Drop in a product URL, two competitor URLs, and an ICP paragraph. Shadow Launch builds a live twin of the market, pressure-tests three narrative wedges against a jury of four synthetic buyer clones, declares a winner with a dissent log, manufactures a Meta ad set for it, and hands back a launch board a human team can execute against. No real dollars spent. No real customers used as the test group.

Built for the Marketing Agents Hackathon at Entrepreneurs First SF, 04.18.26.

---

## Repo layout

```
shadow-launch/
├── web/                      # Next.js frontend                       [exists]
│   ├── app/
│   │   ├── page.tsx          # landing + input                        [exists]
│   │   ├── run/[id]/page.tsx # live run view (replays cached events)  [exists]
│   │   └── results/[id]/     # results page                           [TODO]
│   ├── components/           # TracePanel, StageCard, JuryRoom        [exists]
│   └── public/cache/         # client-side copy of demo-linear.json   [exists]
├── api/                      # FastAPI orchestrator                   [exists]
│   ├── main.py               # routes                                 [exists]
│   ├── orchestrator.py       # Kalibr-wrapped agent graph             [exists]
│   ├── events.py             # SSE event bus                          [exists]
│   ├── models.py             # Pydantic                               [exists]
│   ├── prompts.py            # Appendix A prompts                     [exists]
│   ├── agents/               # scout, cartographer, clerk,            [exists]
│   │                         # producer, scribe
│   └── tests/                # pytest suite                           [exists]
├── cache/
│   └── demo-linear.json      # hero pre-baked run (Lane A)            [exists]
├── docs/
│   ├── features.md           # completion tracker vs spec             [exists]
│   └── design.md             # design system                          [exists]
├── assets/                   # logo, favicon, brand marks             [exists]
├── runs/                     # per-run JSON at runtime (gitignored)   [exists]
├── shadow-launch.html        # static homepage reference              [exists]
├── agent.py                  # Kalibr router smoke test               [exists]
├── specs.md                  # build spec (source of truth)           [exists]
├── .env.example              # required secret NAMES, no values       [exists]
├── requirements.txt          # Python deps                            [exists]
└── README.md                 # this file
```

---

## Prerequisites

- **Node 18+** (for the Next.js frontend)
- **Python 3.10+** (matches `specs.md` §7; 3.11+ preferred)
- **git** and a **GitHub account**
- Accounts on: Kalibr, Anthropic, Apify, Minds AI, Pixero, Rory (see Live mode table below for which keys unlock which agents)

---

## Quick start

```bash
git clone git@github.com:ayushozha/shadow-launch.git
cd shadow-launch
cp .env.example .env   # fill in your keys
# Frontend
cd web && npm install && npm run dev   # http://localhost:3000
# Backend (new terminal)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt    # or: pip install kalibr anthropic openai fastapi 'uvicorn[standard]' pydantic python-dotenv httpx apify-client
uvicorn api.main:app --reload --port 8000
```

On Windows PowerShell, replace `source .venv/bin/activate` with `.venv\Scripts\Activate.ps1` and set `PYTHONIOENCODING=utf-8` in `.env`.

---

## Demo mode (no keys needed)

You can run the whole UX without a single API key. The pre-baked hero run lives at `cache/demo-linear.json` (also mirrored to `web/public/cache/demo-linear.json` so the frontend can read it directly):

1. `cd web && npm run dev`
2. Open [http://localhost:3000/run/demo-linear-001](http://localhost:3000/run/demo-linear-001).
3. Watch 75 trace events replay with artificial delay across all five stage cards. Ends on the same results layout a live run produces.

This is Lane A from `specs.md` §8.1 — the demo we actually give on stage.

---

## Live mode

Which key unlocks which agent. Missing a key is survivable: the orchestrator falls through to a scaffolded Claude-authored response in the sponsor-compatible schema, exactly per `specs.md` §8.2.

| Env var            | Agent               | Missing → what breaks                                                  |
|--------------------|---------------------|-------------------------------------------------------------------------|
| `KALIBR_API_KEY` + `KALIBR_TENANT_ID` | orchestrator routing | Every Claude call bypasses Kalibr; no routing events surface in the trace. |
| `ANTHROPIC_API_KEY` | Cartographer, Clerk facilitation, Scribe prose | Cannot run live. Only Lane A (cached) works. |
| `OPENAI_API_KEY`   | Kalibr fallback path | Kalibr has only one candidate model; no reroute demonstration.         |
| `APIFY_TOKEN`      | Scout               | Market twin falls back to cached `demo-linear.json` twin.              |
| `MINDS_API_KEY` + `MINDS_LIVE=1` | Clerk (jury)   | Jury uses Claude-authored reactions in Minds-compatible schema (scaffold mode — default). |
| `PIXERO_API_KEY`   | Producer            | 5 ad variants are Claude-generated, marked "Pixero-compatible, live generation in progress". |
| `RORY_API_KEY`     | Scribe              | No `rory_board_url`; in-app Rory-styled board UI renders instead.      |

Set `MINDS_LIVE=1` only when your Minds AI plan is Premium or higher — that's what activates the live jury. Default `0` keeps the Clerk in scaffold mode.

---

## Testing

```bash
pytest api/tests/          # backend unit + integration
cd web && npm run build    # frontend type-check + production build
```

---

## Deploy

- **Frontend:** Vercel, wired to the `main` branch. Production domain: `shadowlaunch.ayushozha.com`. Backup: `shadow-launch.vercel.app` (automatic preview; never taken down).
- **Backend:** Fly.io or Render (stub — real deploy is post-hackathon; the venue demo runs the backend locally with `uvicorn`).

---

## Spec

`specs.md` is the source of truth. If a decision is not in that document, it is out of scope. `docs/features.md` is the live completion tracker, with every feature cited to a spec section.

---

## Credits

**Ayush Ojha** — [ayushozha@outlook.com](mailto:ayushozha@outlook.com) · [linkedin.com/in/ayushozha](https://linkedin.com/in/ayushozha)

Marketing Agents Hackathon · Entrepreneurs First SF · 04.18.26.
