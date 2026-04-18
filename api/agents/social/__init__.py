"""Platform-specific social scraping adapters for Stage 03.

Each adapter exposes `scrape(*, competitor, apify, event_bus) -> SocialSnapshot`.
The coordinator (`api.agents.social_scraper`) fans out 5 platforms × 5
competitors = 25 calls via `asyncio.gather`, using the global `ApifyRunner`
semaphore (cap = 8) for backpressure.

Adapters return a `SocialSnapshot` with:
- `status="ok"` on success,
- `status="not_found"` when a handle can't be derived or the actor returns
  nothing usable (per-platform permission/privacy),
- `status="error"` with `error_detail` on any actor failure.

Adapters never raise — one broken platform must not kill the whole stage.

This module also exposes small shared helpers used by every adapter:
`derive_brand_slug`, `compute_metrics`, `coerce_dt`, `safe_int`.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable
from urllib.parse import urlparse

# Second-level domain suffixes we want to keep as brand ("example.co.uk" -> "example")
_KNOWN_MULTIPART_SUFFIXES = {
    "co.uk", "co.jp", "com.au", "com.br", "com.mx", "co.in",
}

_HANDLE_CLEAN = re.compile(r"[^a-zA-Z0-9_\-.]")


def derive_brand_slug(url_or_str: str | None, fallback_name: str | None = None) -> str | None:
    """Best-effort: pull the brand token out of a competitor URL.

    Examples:
        https://asana.com/features -> "asana"
        https://www.atlassian.com/software/jira -> "atlassian"
        https://go.example.co.uk/ -> "example"

    Falls back to `fallback_name` (lowercased, alphanumeric-only, no spaces)
    when no URL is available or the host doesn't yield a useful token.
    """
    candidate: str | None = None
    if url_or_str:
        try:
            parsed = urlparse(str(url_or_str))
            host = (parsed.netloc or parsed.path or "").lower().strip("/")
            # Strip port if any.
            host = host.split(":")[0]
            # Drop leading www. / m. / app. / go. etc.
            for prefix in ("www.", "m.", "app.", "go.", "shop.", "store."):
                if host.startswith(prefix):
                    host = host[len(prefix):]
            if host:
                parts = host.split(".")
                if len(parts) >= 3 and ".".join(parts[-2:]) in _KNOWN_MULTIPART_SUFFIXES:
                    candidate = parts[-3]
                elif len(parts) >= 2:
                    candidate = parts[-2]
                elif parts:
                    candidate = parts[0]
        except Exception:
            candidate = None

    if not candidate and fallback_name:
        candidate = fallback_name

    if not candidate:
        return None

    cleaned = _HANDLE_CLEAN.sub("", candidate).strip("-._")
    return cleaned.lower() or None


def safe_int(v: Any) -> int | None:
    """Coerce arbitrary actor payloads to int; strip commas/K/M when needed."""
    if v is None:
        return None
    if isinstance(v, bool):  # bool is subclass of int; reject it
        return None
    if isinstance(v, (int,)):
        return int(v)
    if isinstance(v, float):
        return int(v)
    if isinstance(v, str):
        s = v.strip().replace(",", "").replace(" ", "")
        if not s:
            return None
        mult = 1
        if s[-1].lower() == "k":
            mult, s = 1_000, s[:-1]
        elif s[-1].lower() == "m":
            mult, s = 1_000_000, s[:-1]
        elif s[-1].lower() == "b":
            mult, s = 1_000_000_000, s[:-1]
        try:
            return int(float(s) * mult)
        except ValueError:
            return None
    return None


def coerce_dt(v: Any) -> datetime | None:
    """Best-effort conversion of whatever the actor handed us into a datetime."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, (int, float)):
        # Apify often returns epoch milliseconds; heuristically split.
        ts = float(v)
        if ts > 1e12:
            ts /= 1000.0
        try:
            return datetime.fromtimestamp(ts, tz=timezone.utc)
        except (OSError, ValueError, OverflowError):
            return None
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return None
        # ISO-8601 with trailing Z.
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        try:
            return datetime.fromisoformat(s)
        except ValueError:
            pass
        # "Mon, 08 Apr 2026 10:01:00 GMT"-style fallback
        for fmt in (
            "%a, %d %b %Y %H:%M:%S %Z",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
        ):
            try:
                return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    return None


def compute_metrics(
    posts: Iterable[dict[str, Any]],
    *,
    followers: int | None,
    likes_key: str = "likes",
    comments_key: str = "comments",
    shares_key: str = "shares",
    date_key: str = "posted_at",
) -> tuple[float | None, float | None]:
    """Compute (avg_engagement_rate, posting_cadence_per_week)."""
    posts = list(posts)
    if not posts:
        return (None, None)

    total = 0
    counted = 0
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    recent_count = 0
    have_any_date = False

    for p in posts:
        likes = safe_int(p.get(likes_key)) or 0
        comments = safe_int(p.get(comments_key)) or 0
        shares = safe_int(p.get(shares_key)) or 0
        total += likes + comments + shares
        counted += 1
        dt = coerce_dt(p.get(date_key))
        if dt is not None:
            have_any_date = True
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if dt >= recent_cutoff:
                recent_count += 1

    avg_er: float | None = None
    if followers and followers > 0 and counted > 0:
        avg_er = round((total / followers) / counted, 6)

    cadence: float | None = None
    if have_any_date:
        # 30 days / 7 ~= 4.2857 weeks
        cadence = round(recent_count / (30 / 7), 3)

    return (avg_er, cadence)


def pick_first(d: dict[str, Any] | None, keys: Iterable[str]) -> Any:
    if not d:
        return None
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return None


__all__ = [
    "coerce_dt",
    "compute_metrics",
    "derive_brand_slug",
    "pick_first",
    "safe_int",
    "facebook",
    "instagram",
    "linkedin",
    "tiktok",
    "twitter",
]


def __getattr__(name: str):  # pragma: no cover — lazy module loader
    """Lazy-import adapters to avoid circular imports with helpers above."""
    if name in {"facebook", "instagram", "linkedin", "tiktok", "twitter"}:
        from importlib import import_module

        return import_module(f"{__name__}.{name}")
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
