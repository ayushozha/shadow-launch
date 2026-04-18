type Line = {
  t: string;
  agent: string;
  kind: "info" | "ok" | "warn";
  message: string;
};

export default function TraceSample({
  label,
  lines,
}: {
  label: string;
  lines: Line[];
}) {
  return (
    <div className="border border-[var(--rule)] bg-[var(--ink)] text-[var(--paper)]">
      <div className="flex items-center justify-between border-b border-[rgba(236,228,210,0.12)] px-5 py-3">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[rgba(236,228,210,0.6)]">
          {label}
        </span>
        <div className="flex items-center gap-[6px]">
          <span className="h-[6px] w-[6px] rounded-full bg-[var(--accent)]" />
          <span className="h-[6px] w-[6px] rounded-full bg-[var(--accent)]" />
          <span className="h-[6px] w-[6px] rounded-full bg-[rgba(236,228,210,0.2)]" />
        </div>
      </div>
      <div
        className="px-5 py-4 font-mono"
        style={{ fontSize: "11px", lineHeight: 1.9, letterSpacing: "0.02em" }}
      >
        {lines.map((line, i) => {
          const agentColor =
            line.kind === "warn"
              ? "text-[var(--accent)]"
              : line.kind === "ok"
              ? "text-[var(--phosphor)]"
              : "text-[rgba(236,228,210,0.7)]";
          return (
            <div key={i} className="whitespace-pre-wrap">
              <span className="text-[rgba(236,228,210,0.35)]">[{line.t}]</span>{" "}
              <span className={agentColor}>{line.agent}</span>{" "}
              <span className="text-[rgba(236,228,210,0.85)]">
                {line.message}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-[rgba(236,228,210,0.12)] px-5 py-3 font-mono text-[10px] tracking-[0.18em] uppercase text-[rgba(236,228,210,0.5)]">
        <span>Sample · readout panel</span>
        <span>·</span>
        <span>Cache · demo-linear.json</span>
      </div>
    </div>
  );
}
