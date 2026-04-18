import type { ReactNode } from "react";

export default function FieldRow({
  marker,
  name,
  children,
  required = true,
}: {
  marker: string;
  name: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="grid items-baseline gap-6 border-b border-[var(--rule-soft)] py-7 md:grid-cols-[140px_1fr_auto]">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
        {marker}
      </span>
      <div>
        <span
          className="block font-mono uppercase text-[var(--ink)]"
          style={{
            fontSize: "11px",
            letterSpacing: "0.14em",
          }}
        >
          {name}
        </span>
        <p
          className="mt-2 max-w-[540px] text-[var(--ink-soft)]"
          style={{ fontSize: "16px", lineHeight: 1.5 }}
        >
          {children}
        </p>
      </div>
      <span
        className={`font-mono text-[10px] tracking-[0.18em] uppercase ${
          required ? "text-[var(--accent)]" : "text-[var(--muted)]"
        }`}
      >
        {required ? "Required" : "Optional"}
      </span>
    </div>
  );
}
