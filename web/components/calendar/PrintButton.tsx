"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink)] hover:text-[var(--accent)]"
    >
      print ↗
    </button>
  );
}
