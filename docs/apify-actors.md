# Apify Actors — Shadow Launch v2

Confirmed working as of **2026-04-18** on a **Free-tier Apify account**
(`$5/mo credits`, `pay-per-event` pricing). Every slug below was smoke-tested
against a real target (`asana` / `asana.com`) and returned non-empty, non-demo
data. Run IDs captured in the Apify console for audit.

If a run comes back empty in production, check the run log for CAPTCHA /
403 / account-gating. The canonical fallback is a clean `ApifyUnavailable`
error — **never** a stubbed response (per `no-dummy-fallback-policy`).

## Stage 01 · Product research

| Source | Actor slug | Input keys | Last verified | Notes |
|---|---|---|---|---|
| Website content | `apify/website-content-crawler` | `{"startUrls": [{"url": "…"}]}` | already-working, 2026-04-18 | Official, robust. |
| Google SERP | `apify/google-search-scraper` | `{"queries": "…"}` | already-working, 2026-04-18 | Official. Uses SERP proxy credit. |

## Stage 02 · Competitor discovery

| Source | Actor slug | Input keys | Last verified | Notes |
|---|---|---|---|---|
| G2 reviews | `zen-studio/g2-reviews-scraper` | `{"url": "…", "limit": 10}` | 2026-04-18 · runId `CjotCRVdfzvotipk9` · 10 items | Pay-per-event. Input is a **single** URL string, not an array. Large review corpora can exceed a 3-minute call; keep `limit` ≤ 50 for stage discovery. |
| Product Hunt | `getdataforme/product-hunt-reviews-scraper` | `{"urls": ["…"], "itemLimit": N, "proxyConfiguration": {"useApifyProxy": true}}` | 2026-04-18 · 0 items for asana | **Best-effort only.** No free-tier PH actor currently returns reliable data for arbitrary product URLs (tested `maximedupre`, `shahidirfan`, `muzafferkadir`, `getdataforme` — all return 0). Google SERP covers most of the PH discovery surface. Marked as "needs a better actor". |

## Stage 03 · Social scrapers

| Platform | Actor slug | Input keys | Last verified | Notes |
|---|---|---|---|---|
| LinkedIn (company record) | `harvestapi/linkedin-company` | `{"companies": ["<linkedin-url>"]}` | 2026-04-18 · runId `2ifakVPoLYn7NBq6c` · 1 item | Massive store presence (4.5M runs). Returns `followerCount`, `employeeCount`, `industries`, logo, locations. |
| LinkedIn (company posts) | `harvestapi/linkedin-company-posts` | `{"targetUrls": ["<linkedin-url>"], "maxPosts": 30}` | 2026-04-18 · runId `j3fFiS5uWs4JzeJJf` · 5 items | Separate actor from the company record scraper. Emits posts with nested `engagement` subdict (`likes`, `comments`, `shares`, `reactions`). |
| Twitter / X | `kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest` | `{"from": "<handle>", "maxItems": 30, "queryType": "Latest"}` | 2026-04-18 · runId `zs6AggOpjzK4cy0hM` · 20 items | **Only** pay-per-event X actor that returns real tweets on Free plan. `apidojo/tweet-scraper` and `apidojo/twitter-scraper-lite` both return `{noResults: true}` or `{demo: …}` placeholder rows on free accounts. |
| Facebook | `apify/facebook-pages-scraper` | `{"startUrls": [{"url": "https://www.facebook.com/<handle>"}], "resultsLimit": 30}` | 2026-04-18 · runId `HYkAdA5fNtGvI8ueI` · 1 item (page profile) | Official. Returns page profile; post dataset depends on page visibility. |
| Instagram | `apify/instagram-profile-scraper` | `{"usernames": ["<handle>"], "resultsLimit": 30, "resultsType": "posts"}` | 2026-04-18 · runId `5paOfOMDzdxE5Jmqp` · 1 item (profile with nested `latestPosts`) | Official. `latestPosts` is an embedded array on the profile record. |
| TikTok | `clockworks/tiktok-scraper` | `{"profiles": ["<handle>"], "resultsPerPage": 30, "shouldDownloadVideos": false}` | 2026-04-18 · runId `6jhbZ7DuGdfy2zRpK` · 5 items | Returns videos with nested `authorMeta.fans` for followers. |

## Stage 03.5 · Market discourse

| Source | Actor slug | Input keys | Last verified | Notes |
|---|---|---|---|---|
| Reddit | `trudax/reddit-scraper-lite` | `{"searches": ["…"], "maxItems": 60, "sort": "top", "time": "year", "proxy": {"useApifyProxy": true}}` | 2026-04-18 · runId `zbaqwgyHIclWbFM22` · 5 items | Replaces dead `trudax/reddit-scraper` (paid-rent). Can hit 403s on some subreddit pages but still yields 2–5 posts per search term on average. |
| Trustpilot (primary) | `memo23/trustpilot-scraper-ppe` | `{"startUrls": [{"url": "…"}], "maxItems": 30}` | 2026-04-18 · runId `p4VcKLNJolsdo1vST` · 50 items | Most comprehensive review output — emits `text`, `title`, `rating`, `consumer`, `dates`, `likes`, `reply`. |
| Trustpilot (alt) | `getwally.net/trustpilot-reviews-scraper` | `{"startUrls": [{"url": "…"}], "limit": 30}` | 2026-04-18 · runId `2laNZWoKGlrR4EhYX` · 60 items | Simpler schema (`reviewText`, `reviewTitle`, `ratingValue`). Kept as automatic fallback. |

## Known gaps / "needs paid plan"

- **Product Hunt by URL**: no currently-functional free-tier actor. Acceptable
  because Stage 02 already has Google SERP. Flagged for future hunt.
- **LinkedIn company posts**: harvestapi's posts actor charges per post/comment
  (still pay-per-event, not paid-rent) — on Free tier the $5 credit covers
  ~2000 posts which is far more than a single run consumes.
- **Twitter on Free plan**: only kaitoeasyapi works. If its behaviour regresses,
  the next-best option is to upgrade to Apify's $49/mo tier and switch to
  `apidojo/tweet-scraper`.

## Regression test

Re-run `python scripts/smoke_apify_actors.py` (not yet committed) to re-verify
all slugs. Or manually:

```python
import asyncio, os
from apify_client import ApifyClientAsync

async def smoke(slug, run_input):
    c = ApifyClientAsync(os.environ["APIFY_TOKEN"])
    r = await c.actor(slug).call(
        run_input=run_input, timeout_secs=120, memory_mbytes=512,
    )
    page = await c.dataset(r["defaultDatasetId"]).list_items()
    return len(page.items), r.get("id")
```
