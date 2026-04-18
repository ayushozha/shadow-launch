import Link from "next/link";

export default function StepCard({
  href,
  marker,
  title,
  hook,
  duration,
  accentTitle,
}: {
  href: string;
  marker: string;
  title: string;
  hook: string;
  duration: string;
  accentTitle?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between border border-[var(--rule)] bg-transparent p-10 transition-colors hover:bg-[var(--paper-deep)]"
    >
      <div>
        <span className="block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
          {marker}
        </span>
        <h3
          className="mt-6 font-serif text-[var(--ink)]"
          style={{
            fontVariationSettings: '"opsz" 60, "wght" 380, "SOFT" 30',
            fontSize: "clamp(32px, 3.2vw, 44px)",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
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
        <p
          className="mt-6 max-w-[460px] text-[var(--ink-soft)]"
          style={{ fontSize: "17px", lineHeight: 1.5 }}
        >
          {hook}
        </p>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-[var(--rule-soft)] pt-5">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
          Duration · {duration}
        </span>
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
          Open →
        </span>
      </div>
    </Link>
  );
}
