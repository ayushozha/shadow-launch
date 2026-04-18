"use client";

import type { KalibrEvent } from "@/lib/types";

// The Kalibr operations readout. Matches the "rerouted N / recovered N / no
// human intervention" line from spec §4.4.

export default function KalibrSummary({ events }: { events: KalibrEvent[] }) {
  const reroutes = events.length;
  const recovered = events.filter((e) => e.recovered).length;
  const humanInterventions = events.filter(
    (e) => e.recovered === false,
  ).length;

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_3fr] md:items-baseline">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §05 · Operations
          </span>
          <h2
            className="font-serif text-[clamp(30px,4vw,52px)] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]"
            style={{ fontVariationSettings: '"opsz" 60, "wght" 380, "SOFT" 40' }}
          >
            Kalibr kept the <em className="italic text-[var(--accent)]">agent loop alive</em>, automatically.
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-3 border-2 border-[var(--accent)] bg-[rgba(227,51,18,0.05)] px-4 py-2 font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--accent)]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
              KALIBR · {reroutes} · {recovered}
            </span>
            <span className="font-serif text-[16px] italic text-[var(--muted)]">
              rerouted {reroutes} / recovered {recovered} / {humanInterventions === 0 ? "no human intervention" : `${humanInterventions} needed human intervention`}
            </span>
          </div>

          {events.length > 0 && (
            <ul className="flex flex-col divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)]">
              {events.map((e, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[auto_auto_1fr_auto] items-start gap-4 py-3"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                    {formatOffset(e.t, i)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {(e as KalibrEvent & { goal?: string }).goal ?? e.kind}
                  </span>
                  <div>
                    <p className="font-serif text-[15px] leading-[1.45] text-[var(--ink-soft)]">
                      {e.from_model ?? "model"}{" "}
                      <span className="text-[var(--muted)]">→</span>{" "}
                      {e.to_model ?? "fallback"}
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {(e as KalibrEvent & { failure_category?: string }).failure_category ?? ""}
                      </span>
                    </p>
                    {(e as KalibrEvent & { detail?: string }).detail && (
                      <p className="mt-1 font-serif text-[13px] italic leading-[1.45] text-[var(--muted)]">
                        {(e as KalibrEvent & { detail?: string }).detail}
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                      e.recovered ? "text-[var(--phosphor)]" : "text-[var(--accent)]"
                    }`}
                  >
                    {e.recovered ? "recovered" : "unrecovered"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// KalibrEvent.t is typed string, but the demo JSON ships numeric offsets.
// Handle both without losing type safety.
function formatOffset(t: KalibrEvent["t"], index: number): string {
  const raw = t as unknown;
  if (typeof raw === "number") return `T+${raw.toFixed(1)}s`;
  if (typeof raw === "string" && raw.length > 0) {
    const asNum = Number(raw);
    if (Number.isFinite(asNum)) return `T+${asNum.toFixed(1)}s`;
    return raw;
  }
  return `event ${index + 1}`;
}
