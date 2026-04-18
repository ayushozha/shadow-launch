"use client";

/**
 * Mono text shown in the image well while the asset is still loading.
 * Paper-tinted box, subtle pulse. Content is the prompt if we have one,
 * otherwise the angle's hook.
 */
export function PromptPreview({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex animate-pulse items-start justify-start overflow-hidden bg-[var(--paper-deep)] p-3">
      <span className="font-mono text-[10px] leading-[1.5] tracking-[0.02em] text-[var(--muted)]">
        {text}
      </span>
    </div>
  );
}
