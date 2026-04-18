"use client";

interface Props {
  sources?: string[];
  label?: string;
}

/**
 * Small mono source tag shown beneath positioning claims and other
 * extracted brand facts. Muted by default; no hover drilldown wired
 * yet — that lives in a later iteration.
 */
export function SourceTag({ sources, label = "source" }: Props) {
  if (!sources || sources.length === 0) return null;
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
      {label} · {sources.join(" · ")}
    </span>
  );
}
