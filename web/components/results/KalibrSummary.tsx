import type { KalibrEvent } from "@/lib/types";

// Section 9 — Kalibr summary. Totals: cost, reroute count, recovered count,
// image-gen count, + trace-capsule link button.

export default function KalibrSummary({
  events,
  costTotal,
  capsuleId,
}: {
  events: KalibrEvent[];
  costTotal: number;
  capsuleId?: string | null;
}) {
  const reroutes = events.filter((e) => !!e.to_model).length;
  const recovered = events.filter((e) => e.recovered).length;
  const imageGen = events.filter((e) => e.goal === "image_gen").length;

  const capsuleUrl = capsuleId
    ? `https://app.kalibr.ai/capsule/${encodeURIComponent(capsuleId)}`
    : null;

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §10 · Kalibr routing telemetry
          </span>
          <span className="font-serif text-[13px] italic text-[var(--muted)]">
            every LLM/image call routed · cost tracked live
          </span>
        </div>

        <div className="grid grid-cols-2 gap-0 border border-[var(--rule)] bg-[rgba(255,252,244,0.5)] md:grid-cols-4">
          <Stat label="Total cost" value={`$${costTotal.toFixed(3)}`} big />
          <Stat label="Reroutes" value={String(reroutes)} />
          <Stat label="Recovered" value={String(recovered)} />
          <Stat label="Image gens" value={String(imageGen)} />
        </div>

        {capsuleUrl ? (
          <a
            href={capsuleUrl}
            target="_blank"
            rel="noreferrer"
            className="self-start border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--paper)] transition-colors hover:bg-[var(--accent)] hover:border-[var(--accent)]"
          >
            open trace capsule ↗
          </a>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            no trace capsule id emitted
          </span>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  big = false,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 border-r border-b border-[var(--rule-soft)] p-5 last:border-r-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
      <span
        className={
          big
            ? "font-serif text-[40px] leading-none tracking-[-0.02em] text-[var(--accent)]"
            : "font-serif text-[24px] leading-none text-[var(--ink)]"
        }
      >
        {value}
      </span>
    </div>
  );
}
