"use client";

import { useEffect, useState } from "react";

import type { ProductProfile } from "@/lib/types";

import { DifferentiatorList } from "./DifferentiatorList";
import { DossierField } from "./DossierField";
import { VoiceChipGroup } from "./VoiceChipGroup";

interface Props {
  profile: ProductProfile;
  ready: boolean;
}

/**
 * Stage 1 · Brand Read workspace.
 *
 * Editorial dossier: Fraunces for the brand identity block, mono labels
 * for the sections. Cover placeholder is intentionally empty — og:image
 * wiring lands later; today it just anchors the composition.
 *
 * Fade-in is a single 200ms pass when `ready` flips true. No per-field
 * staged crossfade yet; that's a v2 polish.
 */
export function BrandDossier({ profile, ready }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) {
      setVisible(false);
      return;
    }
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [ready]);

  return (
    <article
      className="flex flex-col gap-8 transition-opacity duration-200 ease-out"
      style={{ opacity: visible ? 1 : 0.001 }}
    >
      {/* Identity block: cover placeholder + name + one-liner */}
      <header className="flex gap-6">
        <div
          aria-hidden="true"
          className="relative flex h-[112px] w-[112px] flex-shrink-0 items-center justify-center border-2 border-dashed border-[var(--accent)] bg-[rgba(227,51,18,0.04)]"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--accent)]">
            cover
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <div className="group/ident flex items-baseline gap-3">
            <h2
              className="font-serif text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[52px]"
              style={{ fontVariationSettings: '"opsz" 60, "wght" 420, "SOFT" 40' }}
            >
              {profile.brand_name}
            </h2>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)] opacity-0 transition-opacity duration-200 group-hover/ident:opacity-100">
              (editable)
            </span>
          </div>
          <p className="font-serif text-[18px] italic leading-[1.4] text-[var(--ink-soft)]">
            {profile.one_liner}
          </p>
          {profile.category && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Category · {profile.category}
            </span>
          )}
        </div>
      </header>

      {/* Positioning */}
      <DossierField label="Positioning" editable>
        {profile.positioning_claims && profile.positioning_claims.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {profile.positioning_claims.map((claim, i) => (
              <li
                key={`${i}-${claim.slice(0, 24)}`}
                className="border-l-2 border-[var(--rule)] pl-4 font-serif text-[17px] italic leading-[1.5] text-[var(--ink)]"
              >
                “{claim}”
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-serif italic text-[var(--muted)]">
            No positioning claims extracted.
          </p>
        )}
      </DossierField>

      {/* Audience */}
      <DossierField label="Audience" editable>
        {profile.implicit_audience ? (
          <p>{profile.implicit_audience}</p>
        ) : (
          <span className="italic text-[var(--muted)]">
            Audience not yet inferred.
          </span>
        )}
      </DossierField>

      {/* Voice */}
      <DossierField label="Voice" editable>
        <VoiceChipGroup tones={profile.tone_inventory ?? []} />
      </DossierField>

      {/* Messaging gaps */}
      <DossierField label="Messaging Gaps" editable>
        <DifferentiatorList
          items={profile.messaging_gaps ?? []}
          emptyLabel="No gaps surfaced — Apify found the page coherent."
        />
      </DossierField>
    </article>
  );
}

/**
 * Loading state while the product_profile is still being extracted.
 * No dummy values. Mono status line plus a few paper-tinted bars.
 */
export function BrandDossierSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Apify is reading your site…
      </p>

      <div className="flex gap-6">
        <div className="h-[112px] w-[112px] flex-shrink-0 animate-pulse border border-dashed border-[var(--rule)] bg-[rgba(255,252,244,0.5)]" />
        <div className="flex flex-1 flex-col justify-center gap-3">
          <div className="h-[34px] w-3/5 animate-pulse bg-[var(--paper-deep)]" />
          <div className="h-[16px] w-4/5 animate-pulse bg-[rgba(225,216,195,0.7)]" />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 border-t border-[var(--rule)] pt-5"
          >
            <div className="h-[10px] w-[90px] animate-pulse bg-[rgba(225,216,195,0.8)]" />
            <div className="h-[14px] w-full animate-pulse bg-[var(--paper-deep)]" />
            <div className="h-[14px] w-[70%] animate-pulse bg-[var(--paper-deep)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
