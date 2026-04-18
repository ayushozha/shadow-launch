"use client";

import { useState } from "react";
import Link from "next/link";
import type { Run } from "@/lib/types";

// Section 10 — Export + Re-run actions. Four buttons:
//   - Run again (→ /)
//   - Copy shareable URL
//   - Copy as Markdown
//   - Download JSON

export default function ExportActions({ run }: { run: Run }) {
  const [copied, setCopied] = useState<"url" | "md" | null>(null);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/results/${run.run_id}`
      : `/results/${run.run_id}`;

  const markdown = buildMarkdown(run);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied("url");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const copyMd = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied("md");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(run, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.run_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="border-b border-[var(--rule)] px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--rule-soft)] pb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
            §11 · Export + re-run
          </span>
          <span className="font-serif text-[13px] italic text-[var(--muted)]">
            share the verdict · start the next round
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="border border-[var(--ink)] bg-[var(--ink)] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--paper)] transition-colors hover:bg-[var(--accent)] hover:border-[var(--accent)]"
          >
            run again
          </Link>
          <button
            type="button"
            onClick={copyUrl}
            className="border border-[var(--ink)] bg-transparent px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
          >
            {copied === "url" ? "copied ✓" : "copy shareable url"}
          </button>
          <button
            type="button"
            onClick={copyMd}
            className="border border-[var(--ink)] bg-transparent px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
          >
            {copied === "md" ? "copied ✓" : "copy as markdown"}
          </button>
          <button
            type="button"
            onClick={downloadJson}
            className="border border-[var(--ink)] bg-transparent px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
          >
            download json
          </button>
        </div>
      </div>
    </section>
  );
}

function buildMarkdown(run: Run): string {
  const lines: string[] = [];
  lines.push(`# Shadow Launch · ${run.run_id}`);
  lines.push("");
  lines.push(
    `**Status:** ${run.status} · **Cost:** $${run.cost_usd_total.toFixed(3)}`,
  );
  lines.push("");

  if (run.product_profile) {
    lines.push(`## ${run.product_profile.brand_name}`);
    lines.push(`_${run.product_profile.one_liner}_`);
    lines.push("");
    lines.push("### Positioning claims");
    for (const c of run.product_profile.positioning_claims) {
      lines.push(`- ${c}`);
    }
    lines.push("");
    lines.push("### Messaging gaps");
    for (const g of run.product_profile.messaging_gaps) {
      lines.push(`- ${g}`);
    }
    lines.push("");
  }

  if (run.competitors.length > 0) {
    lines.push("## Competitors");
    for (const c of run.competitors.filter((x) => x.selected)) {
      lines.push(
        `- **${c.name}** (${(c.relevance_score * 100).toFixed(0)}%) — ${c.positioning}`,
      );
    }
    lines.push("");
  }

  if (run.campaign) {
    lines.push("## Proposed campaign");
    for (const a of run.campaign.angles) {
      lines.push(`### ${a.hook}`);
      lines.push(a.positioning);
      lines.push("");
      lines.push(`**Channels:** ${a.channel_mix.join(", ")}`);
      lines.push(`**Rationale:** ${a.rationale}`);
      lines.push("");
    }
  }

  if (run.verdicts.length > 0) {
    lines.push("## Verdicts");
    for (const v of run.verdicts) {
      const tag = v.action_required
        ? "🔴"
        : v.dissenting_personas.length > 0
          ? "🟡"
          : "🟢";
      lines.push(
        `- ${tag} \`${v.target_type}/${v.target_id}\` · ${v.consensus_score.toFixed(2)} · ${v.why}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
