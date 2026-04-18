"""Stage 04 — Campaign Generator.

Synthesizes the upstream research (ProductProfile + competitors + social
snapshots + market discourse) into a GTM campaign proposal, then produces
generated image assets for each campaign angle.

Routing
-------
- Copy (angles + image prompts): through Kalibr (`goal="creative"`) —
  typically gpt-4o.
- Images: direct OpenAI SDK (`gpt-image-1`). The Kalibr router handles
  text-only completions today, so image calls bypass it but still emit a
  KalibrEvent-shaped trace on the bus so the cost ticker tracks them.

Persistence
-----------
- One `CampaignRow` per run with JSONB `angles` — written first (empty
  `asset_ids`), then updated after images are generated so that angles carry
  the newly minted asset ids.
- One `ImageAssetRow` per successful image call, bytes stored in the `bytes`
  column. `media_type="image/png"`, 1024x1024.

Failure policy (docs/features.md §2 Stage 04)
---------------------------------------------
- Kalibr copy-call failure → re-raise. No cache fallback.
- SOME image failures → warn and continue, but each angle must end with at
  least one successful image.
- ALL image calls for an angle (or overall) fail → emit error + raise.

No cache, ever.
"""

from __future__ import annotations

import base64
import logging
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field
from sqlalchemy import select

from api.db.schema import CampaignRow, ImageAssetRow, KalibrEventRow
from api.db.session import get_session
from api.models import (
    Campaign,
    CampaignAngle,
    Competitor,
    ImageAsset,
    MarketDiscourse,
    ProductProfile,
    SocialSnapshot,
)

if TYPE_CHECKING:
    from api.events import EventBus
    from api.kalibr_router import KalibrRouter

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured-output schemas used with Kalibr `response_model=...`.
# Kept private: they only describe the wire shape Kalibr should emit — we
# convert to the canonical `CampaignAngle` / `Campaign` types before we
# return anything to the caller.
# ---------------------------------------------------------------------------


class _CampaignModel(BaseModel):
    """Top-level Kalibr response shape for campaign copy."""

    angles: list[CampaignAngle] = Field(min_length=1, max_length=3)


class _PromptList(BaseModel):
    """Kalibr response shape for per-angle image prompts."""

    prompts: list[str] = Field(min_length=3, max_length=3)


# ---------------------------------------------------------------------------
# Pricing (docs/features.md §6)
#
# OpenAI gpt-image-1 standard quality @ 1024x1024 ≈ $0.04 / image. This is a
# flat estimate surfaced on the cost ticker; actual billing comes from the
# OpenAI dashboard.
# ---------------------------------------------------------------------------

_IMAGES_PER_ANGLE = 3
_IMAGE_MODEL = "gpt-image-1"
_IMAGE_SIZE = "1024x1024"
_IMAGE_COST_USD = 0.04


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


async def run(
    *,
    run_id: str,
    profile: ProductProfile,
    competitors: list[Competitor],
    snapshots: list[SocialSnapshot],
    discourse: MarketDiscourse,
    event_bus: "EventBus",
    kalibr: "KalibrRouter",
) -> tuple[Campaign, list[ImageAsset]]:
    """Execute Stage 04.

    Returns a validated `Campaign` + the list of persisted `ImageAsset`s.
    """
    await event_bus.emit(
        agent="campaign_generator",
        message="stage 04 · campaign generation · start",
        kind="info",
    )

    # ------------------------------------------------------------------ copy
    angles = await _generate_angles(
        profile=profile,
        competitors=competitors,
        snapshots=snapshots,
        discourse=discourse,
        kalibr=kalibr,
    )

    campaign_id = f"camp_{run_id[-8:]}"
    campaign = Campaign(campaign_id=campaign_id, run_id=run_id, angles=angles)

    # Persist the angles first (with empty asset_ids). We rewrite the row
    # once images land so the sequencing is: copy -> row v1 -> images ->
    # row v2 (with asset_ids). If image generation blows up partway, the
    # row in the DB at least reflects the accepted copy.
    await _persist_campaign(campaign)

    # ----------------------------------------------------------------- images
    assets: list[ImageAsset] = []
    for angle in campaign.angles:
        angle_assets = await _generate_angle_images(
            run_id=run_id,
            angle=angle,
            profile=profile,
            kalibr=kalibr,
            event_bus=event_bus,
        )
        if not angle_assets:
            # Every image for this angle failed; the feature spec mandates
            # ≥1 image per angle, so bail loudly.
            await event_bus.emit(
                agent="campaign_generator",
                message=f"no images generated for angle {angle.angle_id}",
                kind="error",
            )
            raise RuntimeError(
                f"stage 04: failed to generate any image for angle {angle.angle_id}"
            )
        angle.asset_ids = [a.asset_id for a in angle_assets]
        assets.extend(angle_assets)

    # Rewrite the campaign row with the finalized asset_ids.
    await _persist_campaign(campaign, update=True)

    await event_bus.emit(
        agent="campaign_generator",
        message=f"stage 04 · {len(campaign.angles)} angles, {len(assets)} images generated",
        kind="ok",
    )

    return campaign, assets


# ---------------------------------------------------------------------------
# Copy generation
# ---------------------------------------------------------------------------


async def _generate_angles(
    *,
    profile: ProductProfile,
    competitors: list[Competitor],
    snapshots: list[SocialSnapshot],
    discourse: MarketDiscourse,
    kalibr: "KalibrRouter",
) -> list[CampaignAngle]:
    """Ask Kalibr (gpt-4o) for 1–3 positioning angles.

    Raises on Kalibr failure — no cache fallback (§0 policy).
    """
    valid_competitor_ids = {c.competitor_id for c in competitors}

    system = (
        "You are a senior GTM strategist. Given a product profile, a set of "
        "competitors with their positioning, cross-competitor social traction, "
        "and market discourse signals (Reddit complaints + Trustpilot "
        "reviews), design 1 to 3 distinct positioning angles for a launch "
        "campaign.\n\n"
        "Each angle MUST:\n"
        "- Have a sharp hook (single sentence, <=14 words).\n"
        "- State its positioning claim in one sentence.\n"
        "- Pick a channel mix from: linkedin, twitter, facebook, instagram, "
        "tiktok, blog, email, youtube (1–5 channels).\n"
        "- Include a 2–3 sentence rationale that cites at least one competitor "
        "gap, one social-traction signal, or one discourse pattern.\n"
        "- Cite at least one competitor by its competitor_id in "
        "evidence_competitor_ids (must be one of the provided IDs).\n"
        "- Leave asset_ids as an empty list (images are attached later).\n\n"
        "Angles should be genuinely distinct — different hooks, different "
        "audiences, different channel mixes. If the product has only one "
        "defensible lane, return a single angle rather than padding."
    )

    user = _build_copy_prompt(
        profile=profile,
        competitors=competitors,
        snapshots=snapshots,
        discourse=discourse,
    )

    result = await kalibr.complete(
        goal="creative",
        system=system,
        user=user,
        response_model=_CampaignModel,
        max_tokens=3000,
    )
    assert isinstance(result, _CampaignModel)

    # Post-process: assign stable angle IDs and clamp evidence to real IDs.
    angles: list[CampaignAngle] = []
    for i, raw in enumerate(result.angles, start=1):
        evidence = [cid for cid in raw.evidence_competitor_ids if cid in valid_competitor_ids]
        if not evidence and competitors:
            # Force at least one citation so the UI can render the "grounded
            # in:" badge. Pick the top-ranked competitor as a safe default.
            evidence = [max(competitors, key=lambda c: c.relevance_score).competitor_id]
        angle_id = f"angle_{i}_{uuid.uuid4().hex[:8]}"
        angles.append(
            CampaignAngle(
                angle_id=angle_id,
                hook=raw.hook,
                positioning=raw.positioning,
                channel_mix=raw.channel_mix,
                rationale=raw.rationale,
                evidence_competitor_ids=evidence,
                asset_ids=[],
            )
        )
    return angles


def _build_copy_prompt(
    *,
    profile: ProductProfile,
    competitors: list[Competitor],
    snapshots: list[SocialSnapshot],
    discourse: MarketDiscourse,
) -> str:
    """Assemble the structured input the copy model sees."""
    lines: list[str] = []
    lines.append("# Product profile")
    lines.append(f"brand: {profile.brand_name}")
    lines.append(f"one_liner: {profile.one_liner}")
    lines.append(f"category: {profile.category}")
    lines.append(f"implicit_audience: {profile.implicit_audience}")
    lines.append("positioning_claims:")
    for c in profile.positioning_claims:
        lines.append(f"  - {c}")
    if profile.tone_inventory:
        lines.append("tone_inventory: " + ", ".join(profile.tone_inventory))
    if profile.messaging_gaps:
        lines.append("messaging_gaps:")
        for g in profile.messaging_gaps:
            lines.append(f"  - {g}")

    lines.append("")
    lines.append("# Competitors (use these competitor_id values in evidence)")
    for c in competitors:
        lines.append(
            f"- competitor_id={c.competitor_id} name={c.name} "
            f"relevance={c.relevance_score:.2f} positioning={c.positioning}"
        )

    # Social summary: roll up engagement per competitor so the model sees
    # which competitors actually have traction.
    lines.append("")
    lines.append("# Social traction summary")
    by_comp: dict[str, list[SocialSnapshot]] = {}
    for s in snapshots:
        by_comp.setdefault(s.competitor_id, []).append(s)
    for cid, snaps in by_comp.items():
        parts: list[str] = []
        for s in snaps:
            fol = s.followers if s.followers is not None else "?"
            eng = (
                f"{s.avg_engagement_rate:.3f}"
                if s.avg_engagement_rate is not None
                else "?"
            )
            parts.append(f"{s.platform}(followers={fol}, eng={eng})")
        lines.append(f"- {cid}: " + ", ".join(parts))

    lines.append("")
    lines.append("# Market discourse")
    if discourse.top_complaints:
        lines.append("top_complaints:")
        for t in discourse.top_complaints:
            lines.append(f"  - {t}")
    if discourse.top_desires:
        lines.append("top_desires:")
        for t in discourse.top_desires:
            lines.append(f"  - {t}")
    # A handful of raw excerpts to ground the copy in real voice-of-customer.
    excerpts = (discourse.reddit_items[:3]) + (discourse.trustpilot_items[:3])
    if excerpts:
        lines.append("discourse_excerpts:")
        for d in excerpts:
            snippet = d.body[:200].replace("\n", " ")
            lines.append(f"  - [{d.source}] {snippet}")

    lines.append("")
    lines.append(
        "Return 1–3 angles with hooks, channel mixes, rationales, and "
        "evidence_competitor_ids."
    )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Image generation
# ---------------------------------------------------------------------------


async def _generate_angle_images(
    *,
    run_id: str,
    angle: CampaignAngle,
    profile: ProductProfile,
    kalibr: "KalibrRouter",
    event_bus: "EventBus",
) -> list[ImageAsset]:
    """Ask Kalibr for 3 image prompts, call OpenAI Images for each."""
    prompts = await _request_image_prompts(
        angle=angle, profile=profile, kalibr=kalibr
    )

    assets: list[ImageAsset] = []
    for idx, prompt in enumerate(prompts):
        try:
            image_bytes = await _call_openai_image(prompt)
        except Exception as exc:  # noqa: BLE001 — openai raises anything
            await event_bus.emit(
                agent="campaign_generator",
                message=(
                    f"image gen failed for angle={angle.angle_id} "
                    f"prompt#{idx+1}: {exc}"
                ),
                kind="warn",
            )
            log.warning("image gen failed: %s", exc, exc_info=True)
            continue

        asset_id = f"img_{uuid.uuid4().hex[:12]}"
        asset = ImageAsset(
            asset_id=asset_id,
            campaign_angle_id=angle.angle_id,
            prompt=prompt,
            model=_IMAGE_MODEL,
            media_type="image/png",
            width=1024,
            height=1024,
            kalibr_trace_id=None,  # direct OpenAI call, no kalibr trace
            asset_url=f"/api/runs/{run_id}/assets/{asset_id}",
        )
        await _persist_asset(run_id=run_id, asset=asset, image_bytes=image_bytes)
        assets.append(asset)

        # Mirror the cost + trace on the bus so the cost ticker picks it up
        # even though Kalibr didn't dispatch this call itself. We set the
        # cost via the first-class `kalibr_cost_delta_usd` kwarg so the
        # orchestrator's cost aggregator can read it directly off the
        # trace_events row without parsing the message string.
        await event_bus.emit(
            agent="campaign_generator",
            message=f"image_gen +${_IMAGE_COST_USD:.2f}",
            kind="cost",
            kalibr_model=_IMAGE_MODEL,
            kalibr_cost_delta_usd=_IMAGE_COST_USD,
            meta={"goal": "image_gen", "angle_id": angle.angle_id},
        )
        # Double-record into kalibr_events — the orchestrator de-dupes by
        # source-of-truth query, so this is safe and keeps the per-event
        # image-gen row available for the Kalibr capsule summary.
        await _persist_kalibr_event(run_id=run_id, cost=_IMAGE_COST_USD)

    return assets


async def _request_image_prompts(
    *,
    angle: CampaignAngle,
    profile: ProductProfile,
    kalibr: "KalibrRouter",
) -> list[str]:
    """Derive 3 art-director prompts for this angle."""
    system = (
        "You are an art director. For a single campaign angle, write exactly "
        "three distinct image prompts suitable for a text-to-image model "
        "(gpt-image-1). Each prompt should be a single sentence of 20–40 "
        "words describing a concrete, photorealistic or illustrative scene "
        "that embodies the angle's hook. Avoid copyrighted characters and "
        "on-image text. No numbering, no commentary — return them via the "
        "structured 'prompts' field."
    )
    user = (
        f"Brand: {profile.brand_name}\n"
        f"Category: {profile.category}\n"
        f"Angle hook: {angle.hook}\n"
        f"Positioning: {angle.positioning}\n"
        f"Channel mix: {', '.join(angle.channel_mix)}\n"
        f"Rationale: {angle.rationale}\n\n"
        f"Produce 3 image prompts (one per channel/format variation)."
    )
    result = await kalibr.complete(
        goal="creative",
        system=system,
        user=user,
        response_model=_PromptList,
        max_tokens=800,
    )
    assert isinstance(result, _PromptList)
    # Safety net: if the model returns <3 prompts (shouldn't under validation)
    # we pad; if it returns more we truncate.
    prompts = list(result.prompts)
    if len(prompts) < _IMAGES_PER_ANGLE:
        prompts += [prompts[-1]] * (_IMAGES_PER_ANGLE - len(prompts))
    return prompts[:_IMAGES_PER_ANGLE]


async def _call_openai_image(prompt: str) -> bytes:
    """Generate a single image via the OpenAI SDK. Returns raw PNG bytes."""
    # Import inside the fn so a missing openai install surfaces here rather
    # than at module import time — the rest of the module is still useful
    # for tests that monkeypatch this.
    from openai import AsyncOpenAI

    client = AsyncOpenAI()
    resp = await client.images.generate(
        model=_IMAGE_MODEL,
        prompt=prompt,
        size=_IMAGE_SIZE,
        n=1,
    )
    data = resp.data[0]
    # gpt-image-1 returns b64_json by default; dall-e-3 can return url. We
    # handle both so that future reroutes through dall-e-3 continue to work.
    b64 = getattr(data, "b64_json", None)
    if b64:
        return base64.b64decode(b64)

    url = getattr(data, "url", None)
    if url:
        import httpx

        async with httpx.AsyncClient(timeout=30.0) as http:
            r = await http.get(url)
            r.raise_for_status()
            return r.content

    raise RuntimeError("OpenAI image response had neither b64_json nor url")


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


async def _persist_campaign(campaign: Campaign, *, update: bool = False) -> None:
    """Insert (or upsert) the campaign row with its JSON-serialised angles."""
    angles_json = [a.model_dump(mode="json") for a in campaign.angles]

    async with get_session() as session:
        if update:
            existing = await session.get(CampaignRow, campaign.campaign_id)
            if existing is None:
                # Fall through to insert — defensive against a caller who
                # skipped the initial persist step.
                existing = CampaignRow(
                    campaign_id=campaign.campaign_id,
                    run_id=campaign.run_id,
                    angles=angles_json,
                )
                session.add(existing)
            else:
                existing.angles = angles_json
        else:
            existing = await session.get(CampaignRow, campaign.campaign_id)
            if existing is None:
                session.add(
                    CampaignRow(
                        campaign_id=campaign.campaign_id,
                        run_id=campaign.run_id,
                        angles=angles_json,
                    )
                )
            else:
                # Rerun with same id — overwrite.
                existing.angles = angles_json


async def _persist_asset(
    *, run_id: str, asset: ImageAsset, image_bytes: bytes
) -> None:
    row = ImageAssetRow(
        asset_id=asset.asset_id,
        run_id=run_id,
        campaign_angle_id=asset.campaign_angle_id,
        prompt=asset.prompt,
        model=asset.model,
        media_type=asset.media_type,
        width=asset.width,
        height=asset.height,
        bytes_=image_bytes,
        kalibr_trace_id=asset.kalibr_trace_id,
    )
    async with get_session() as session:
        session.add(row)


async def _persist_kalibr_event(*, run_id: str, cost: float) -> None:
    """Log a kalibr_events row so the cost ticker aggregates image spend."""
    row = KalibrEventRow(
        event_id=f"kev_{uuid.uuid4().hex[:12]}",
        run_id=run_id,
        t=datetime.now(timezone.utc),
        goal="image_gen",
        from_model=_IMAGE_MODEL,
        to_model=None,
        failure_category=None,
        recovered=True,
        cost_usd_delta=cost,
        trace_id=None,
    )
    async with get_session() as session:
        session.add(row)


__all__ = ["run"]
