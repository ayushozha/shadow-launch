"use client";

interface Props {
  tones: string[];
}

/**
 * Voice / tone chips. Paper-tinted pill, thin rule border, mono label.
 * Add / remove interactions aren't wired in this iteration.
 */
export function VoiceChipGroup({ tones }: Props) {
  if (!tones || tones.length === 0) {
    return (
      <span className="font-serif italic text-[var(--muted)]">
        No voice signals extracted yet.
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {tones.map((tone) => (
        <span
          key={tone}
          className="inline-flex items-center rounded-full border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] px-3 py-[6px] font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]"
        >
          {tone}
        </span>
      ))}
      <span
        aria-hidden="true"
        className="inline-flex items-center rounded-full border border-dashed border-[var(--rule)] px-3 py-[6px] font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]"
      >
        +
      </span>
    </div>
  );
}
