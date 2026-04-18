import type { ReactNode } from "react";

export default function SectionHead({
  marker,
  children,
  light = false,
}: {
  marker: string;
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <div className="section-head mb-14 grid items-baseline gap-10 md:grid-cols-[1fr_3fr]">
      <span
        className={`mono ${
          light ? "text-[rgba(236,228,210,0.6)]" : "text-[var(--muted)]"
        }`}
      >
        {marker}
      </span>
      <h2
        className={`font-serif max-w-[900px] ${light ? "text-[var(--paper)]" : ""}`}
        style={{
          fontVariationSettings: '"opsz" 60, "wght" 380, "SOFT" 40',
          fontSize: "clamp(34px, 4.5vw, 58px)",
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
        }}
      >
        {children}
      </h2>
    </div>
  );
}
