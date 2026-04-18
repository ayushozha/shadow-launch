import type { ReactNode } from "react";

export default function Beat({
  marker,
  title,
  accentTitle,
  children,
}: {
  marker: string;
  title: string;
  accentTitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid items-baseline gap-8 border-t border-[var(--rule-soft)] py-10 md:grid-cols-[1fr_3fr]">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
        {marker}
      </span>
      <div>
        <h3
          className="font-serif text-[var(--ink)]"
          style={{
            fontVariationSettings: '"opsz" 32, "wght" 420, "SOFT" 60',
            fontSize: "clamp(22px, 2vw, 28px)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
          }}
        >
          {title}
          {accentTitle ? (
            <>
              {" "}
              <em className="text-[var(--accent)]">{accentTitle}</em>
            </>
          ) : null}
        </h3>
        <div
          className="mt-4 max-w-[680px] text-[var(--ink-soft)]"
          style={{ fontSize: "17px", lineHeight: 1.55 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
