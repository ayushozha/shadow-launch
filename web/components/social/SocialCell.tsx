"use client";

import { useEffect, useRef, useState } from "react";

import type { SocialSnapshot } from "@/lib/types";

interface Props {
  snapshot: SocialSnapshot | null;
  delayMs: number;
  onOpen: () => void;
}

const COUNT_UP_MS = 400;

/**
 * Heat color from engagement rate.
 *   0 → paper bg (no tint)
 *   <1% → muted
 *   1–5% → accent tint (fading up)
 *   >5% → phosphor tint
 * Input is a fraction (e.g. 0.038 = 3.8%).
 */
function heatStyle(rate: number | null | undefined): {
  background: string;
  borderColor: string;
  numeralColor: string;
} {
  if (rate == null || rate <= 0) {
    return {
      background: "rgba(255,252,244,0.4)",
      borderColor: "var(--rule)",
      numeralColor: "var(--ink)",
    };
  }
  const pct = rate * 100;
  if (pct < 1) {
    return {
      background: "rgba(106,100,84,0.06)",
      borderColor: "var(--rule-soft)",
      numeralColor: "var(--muted)",
    };
  }
  if (pct > 5) {
    // phosphor tint — stronger the higher it goes. Clamp at 10%+.
    const intensity = Math.min((pct - 5) / 5, 1); // 0..1
    const alpha = 0.14 + intensity * 0.22; // .14 .. .36
    return {
      background: `rgba(43,107,63,${alpha.toFixed(3)})`,
      borderColor: "var(--phosphor)",
      numeralColor: "var(--phosphor)",
    };
  }
  // 1–5%: accent-tinted warm range, soft
  const intensity = (pct - 1) / 4; // 0..1
  const alpha = 0.04 + intensity * 0.1; // .04 .. .14
  return {
    background: `rgba(227,51,18,${alpha.toFixed(3)})`,
    borderColor: "var(--rule)",
    numeralColor: "var(--ink)",
  };
}

function useCountUp(target: number | null | undefined, triggerKey: unknown): number | null {
  const [value, setValue] = useState<number | null>(target ?? null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) {
      setValue(null);
      return;
    }
    const start = performance.now();
    const from = 0;
    const to = target;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / COUNT_UP_MS, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, triggerKey]);

  return value;
}

const NUMBER_FMT = new Intl.NumberFormat("en-US");

function compactFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return NUMBER_FMT.format(n);
}

export function SocialCell({ snapshot, delayMs, onOpen }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);

  const ok = snapshot?.status === "ok";
  const followers = ok ? snapshot?.followers ?? null : null;
  const rate = ok ? snapshot?.avg_engagement_rate ?? null : null;
  const counted = useCountUp(mounted ? followers : null, snapshot?.snapshot_id);

  const heat = heatStyle(rate);

  if (!snapshot || !ok) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="relative flex h-full min-h-[78px] items-center justify-center border border-[var(--rule-soft)] bg-[rgba(255,252,244,0.3)] transition-opacity"
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 320ms ease-out",
        }}
        aria-label="no data"
      >
        <span className="font-mono text-[14px] text-[var(--muted)]">—</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-full min-h-[78px] flex-col items-center justify-center gap-1 border transition-[opacity,transform,box-shadow] duration-300 ease-out hover:shadow-[0_4px_12px_var(--shadow)]"
      style={{
        background: heat.background,
        borderColor: heat.borderColor,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(4px)",
      }}
    >
      <span
        className="font-mono text-[15px] leading-none tracking-tight tabular-nums"
        style={{ color: heat.numeralColor }}
      >
        {followers == null
          ? "—"
          : counted == null
            ? compactFollowers(followers)
            : compactFollowers(counted)}
      </span>
      <span
        className="font-mono text-[10px] uppercase leading-none tracking-[0.12em] tabular-nums"
        style={{
          color:
            rate == null
              ? "var(--muted)"
              : rate * 100 > 5
                ? "var(--phosphor)"
                : "var(--ink-soft)",
        }}
      >
        {rate == null ? "—" : `${(rate * 100).toFixed(1)}%`}
      </span>
    </button>
  );
}
