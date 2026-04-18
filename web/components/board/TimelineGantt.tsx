import type { Milestone, Task } from "@/lib/types";

// 14-day horizontal timeline rendered as inline SVG so it prints cleanly
// and survives copy/share. Milestones are plotted on the day axis;
// a connecting rail links them left-to-right. Tasks are shown as ticks
// underneath, grouped per owner row, anchored at their due_day.

type RichTask = Task & { description?: string; due_day?: number };
type RichMilestone = Milestone & { milestone?: string };

type Props = {
  tasks: RichTask[];
  timeline: RichMilestone[];
  totalDays?: number;
};

const OWNER_ROWS = ["Marketing", "Founder", "Design", "GTM Eng"];

// Row colors for the ticks — kept muted so the accent (vermilion) still
// pops for the milestone dots.
const OWNER_FILL: Record<string, string> = {
  Marketing: "#0c0c0a",
  Founder: "#6a6454",
  Design: "#2b6b3f",
  "GTM Eng": "#b3260a",
};

export default function TimelineGantt({ tasks, timeline, totalDays = 14 }: Props) {
  // SVG viewport. Using a fixed internal coordinate system (0..1000 x 0..420)
  // and CSS-scaling to container width preserves crisp vector output at any size.
  const W = 1000;
  const H = 420;
  const padL = 140;
  const padR = 40;
  const padT = 60;
  const padB = 60;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const dayX = (d: number) => padL + ((d - 1) / (totalDays - 1)) * plotW;
  const rowY = (idx: number) =>
    padT + (plotH / (OWNER_ROWS.length + 1)) * (idx + 1);

  // Only plot tasks whose owner is in OWNER_ROWS; anything else still counts
  // on the total but does not render a tick (kept simple for the demo data).
  const tasksByOwner: Record<string, RichTask[]> = {};
  for (const o of OWNER_ROWS) tasksByOwner[o] = [];
  for (const t of tasks) {
    if (OWNER_ROWS.includes(t.owner)) tasksByOwner[t.owner].push(t);
  }

  // Build the milestone rail path — a single polyline across all plotted milestones.
  const sortedMs = [...timeline].sort((a, b) => a.day - b.day);
  const railY = padT + 14;
  const railPath = sortedMs
    .map((m, i) => `${i === 0 ? "M" : "L"} ${dayX(m.day)} ${railY}`)
    .join(" ");

  return (
    <section className="border-b border-[var(--rule)] bg-[var(--paper-deep)] px-5 py-14 md:px-14 md:py-20 print:bg-[var(--paper)] print:py-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-[1fr_3fr] md:items-baseline">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
            Timeline · {totalDays} days
          </p>
          <h2
            className="font-serif text-[clamp(26px,3.5vw,42px)] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]"
            style={{ fontVariationSettings: '"opsz" 60, "wght" 400, "SOFT" 40' }}
          >
            Milestones on the rail. <em className="italic text-[var(--accent)]">Tasks underneath.</em>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${totalDays}-day launch timeline with ${sortedMs.length} milestones and ${tasks.length} tasks`}
            className="block h-auto w-full min-w-[720px]"
          >
            {/* Day axis grid */}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
              const x = dayX(d);
              return (
                <g key={`axis-${d}`}>
                  <line
                    x1={x}
                    y1={padT}
                    x2={x}
                    y2={H - padB}
                    stroke="rgba(12,12,10,0.08)"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={H - padB + 22}
                    textAnchor="middle"
                    fontFamily="var(--font-mono), ui-monospace, monospace"
                    fontSize={11}
                    fill="#6a6454"
                    letterSpacing="0.14em"
                  >
                    D{d}
                  </text>
                </g>
              );
            })}

            {/* Owner row labels + row baselines */}
            {OWNER_ROWS.map((owner, idx) => {
              const y = rowY(idx);
              return (
                <g key={`row-${owner}`}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={W - padR}
                    y2={y}
                    stroke="rgba(12,12,10,0.15)"
                    strokeWidth={1}
                    strokeDasharray="2 6"
                  />
                  <text
                    x={padL - 14}
                    y={y + 4}
                    textAnchor="end"
                    fontFamily="var(--font-mono), ui-monospace, monospace"
                    fontSize={11}
                    fill="#0c0c0a"
                    letterSpacing="0.14em"
                  >
                    {owner.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {/* Milestone rail path */}
            {sortedMs.length > 1 && (
              <path
                d={railPath}
                fill="none"
                stroke="#0c0c0a"
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}

            {/* Milestone nodes on the rail */}
            {sortedMs.map((m, i) => {
              const x = dayX(m.day);
              return (
                <g key={`ms-${i}`}>
                  <line
                    x1={x}
                    y1={railY}
                    x2={x}
                    y2={H - padB - 4}
                    stroke="rgba(227,51,18,0.3)"
                    strokeWidth={1}
                    strokeDasharray="3 4"
                  />
                  <circle
                    cx={x}
                    cy={railY}
                    r={8}
                    fill="#e33312"
                    stroke="#ece4d2"
                    strokeWidth={3}
                  />
                  <text
                    x={x}
                    y={railY - 18}
                    textAnchor="middle"
                    fontFamily="var(--font-mono), ui-monospace, monospace"
                    fontSize={10}
                    fill="#0c0c0a"
                    letterSpacing="0.16em"
                  >
                    DAY {m.day}
                  </text>
                </g>
              );
            })}

            {/* Task ticks grouped per owner row */}
            {OWNER_ROWS.map((owner, idx) => {
              const y = rowY(idx);
              const fill = OWNER_FILL[owner] ?? "#0c0c0a";
              return (
                <g key={`ticks-${owner}`}>
                  {tasksByOwner[owner].map((t, ti) => {
                    const d = t.due_day ?? t.day;
                    if (d === undefined) return null;
                    const x = dayX(d);
                    return (
                      <g key={`tick-${owner}-${ti}`}>
                        <circle cx={x} cy={y} r={6} fill={fill} />
                        <text
                          x={x}
                          y={y + 20}
                          textAnchor="middle"
                          fontFamily="var(--font-mono), ui-monospace, monospace"
                          fontSize={9}
                          fill="#6a6454"
                          letterSpacing="0.12em"
                        >
                          {t.id ?? ""}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Plain-text milestone legend — the SVG is the visual, this is the readable spec */}
        <ol className="mt-10 grid grid-cols-1 gap-4 border-t border-[var(--rule)] pt-6 md:grid-cols-2">
          {sortedMs.map((m, i) => (
            <li key={`leg-${i}`} className="flex items-baseline gap-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
                Day {m.day}
              </span>
              <p className="font-serif text-[15px] leading-[1.5] text-[var(--ink-soft)]">
                {m.milestone ?? m.label}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
