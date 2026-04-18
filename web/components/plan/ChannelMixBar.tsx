"use client";

import { useEffect, useState } from "react";

interface Props {
  channel: string;
  percent: number;
  index: number;
}

/**
 * Single horizontal bar for the channel-mix section. The width animates
 * from 0 to `percent` on mount, staggered by index (100ms between bars,
 * 800ms total ramp). Calm easing, no bounce.
 */
export function ChannelMixBar({ channel, percent, index }: Props) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const delay = index * 100;
    const t = window.setTimeout(() => setWidth(percent), delay);
    return () => window.clearTimeout(t);
  }, [percent, index]);

  return (
    <div className="flex items-center gap-4">
      <span className="w-24 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {channel}
      </span>
      <div className="relative h-2 flex-1 bg-[var(--rule-soft)]">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--ink)]"
          style={{
            width: `${width}%`,
            transition: "width 800ms cubic-bezier(0.2, 0.7, 0.2, 1)",
          }}
        />
      </div>
      <span className="w-12 text-right font-mono text-[11px] tabular-nums text-[var(--ink)]">
        {percent}%
      </span>
    </div>
  );
}
