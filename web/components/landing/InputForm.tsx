"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, createRun } from "@/lib/api";
import type { RunInput } from "@/lib/types";

type FieldErrors = {
  product_url?: string;
};

function isHttpUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return (u.protocol === "http:" || u.protocol === "https:") && Boolean(u.hostname) && u.hostname.includes(".");
  } catch {
    return false;
  }
}

type Budget = "lean" | "standard" | "premium";

export default function InputForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [label, setLabel] = useState("Run Shadow Launch");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setApiError(null);

    const fd = new FormData(e.currentTarget);
    const product_url = String(fd.get("product_url") ?? "").trim();
    const brand_voice_guide_raw = String(fd.get("brand_voice_guide") ?? "").trim();
    const target_regions_raw = String(fd.get("target_regions") ?? "").trim();
    const budget_raw = String(fd.get("budget_constraint") ?? "").trim();

    const nextErrors: FieldErrors = {};
    if (!product_url) nextErrors.product_url = "Product URL is required.";
    else if (!isHttpUrl(product_url))
      nextErrors.product_url = "Enter a valid http(s) URL.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const target_regions = target_regions_raw
      ? target_regions_raw
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : null;

    const budget_constraint: Budget | null =
      budget_raw === "lean" || budget_raw === "standard" || budget_raw === "premium"
        ? (budget_raw as Budget)
        : null;

    const payload: RunInput = {
      product_url,
      brand_voice_guide: brand_voice_guide_raw || null,
      target_regions,
      budget_constraint,
    };

    setSubmitting(true);
    setLabel("DISPATCHING…");

    try {
      const { run_id } = await createRun(payload);
      setLabel("✓ RUNNING · REDIRECTING");
      // Give the label flip a beat before navigating.
      window.setTimeout(() => {
        router.push(`/run/${encodeURIComponent(run_id)}`);
      }, 350);
    } catch (err) {
      setSubmitting(false);
      setLabel("Run Shadow Launch");
      if (err instanceof ApiError) {
        setApiError(`${err.status} · ${err.statusText || "Error"} — ${err.body || "The backend rejected the request."}`);
      } else if (err instanceof Error) {
        setApiError(err.message || "Could not reach the Shadow Launch backend.");
      } else {
        setApiError("Unknown error. Could not reach the Shadow Launch backend.");
      }
    }
  }

  const inputBase =
    "block w-full border border-[var(--rule)] bg-transparent px-5 py-4 font-serif text-[17px] text-[var(--ink)] outline-none placeholder:italic placeholder:text-[var(--muted)] focus:border-[var(--ink)]";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="access-form mx-auto flex w-full max-w-[620px] flex-col gap-4 border border-[var(--ink)] bg-[rgba(255,252,244,0.6)] p-5 text-left"
    >
      <div>
        <label
          htmlFor="product_url"
          className="mb-2 block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]"
        >
          Product URL <span className="text-[var(--accent)]">*</span>
        </label>
        <input
          id="product_url"
          name="product_url"
          type="url"
          required
          placeholder="https://your-product.com"
          autoComplete="url"
          className={inputBase}
          aria-invalid={Boolean(errors.product_url)}
        />
        {errors.product_url && (
          <p className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--accent)]">
            {errors.product_url}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="brand_voice_guide"
          className="mb-2 block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]"
        >
          Brand voice guide <span className="opacity-60">· optional</span>
        </label>
        <textarea
          id="brand_voice_guide"
          name="brand_voice_guide"
          rows={3}
          placeholder="Optional — paste 1-2 paragraphs of tone notes"
          className={`${inputBase} resize-vertical min-h-[96px] leading-[1.5]`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="target_regions"
            className="mb-2 block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]"
          >
            Target regions <span className="opacity-60">· optional</span>
          </label>
          <input
            id="target_regions"
            name="target_regions"
            type="text"
            placeholder="e.g. US, EU, APAC"
            autoComplete="off"
            className={inputBase}
          />
        </div>
        <div>
          <label
            htmlFor="budget_constraint"
            className="mb-2 block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]"
          >
            Budget <span className="opacity-60">· optional</span>
          </label>
          <select
            id="budget_constraint"
            name="budget_constraint"
            defaultValue=""
            className={`${inputBase} cursor-pointer`}
          >
            <option value="">Unspecified</option>
            <option value="lean">Lean</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </div>
      </div>

      {apiError && (
        <div
          role="alert"
          className="border border-[var(--accent)] bg-[rgba(227,51,18,0.08)] p-4 font-mono text-[11px] leading-[1.6] tracking-[0.04em] text-[var(--accent-ink)]"
        >
          <div className="mb-1 text-[10px] tracking-[0.18em] uppercase text-[var(--accent)]">
            Request failed
          </div>
          <div className="break-words whitespace-pre-wrap">{apiError}</div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 border border-[var(--ink)] bg-[var(--ink)] px-6 py-4 font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--paper)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-80"
      >
        {label}
        {!submitting && <span aria-hidden="true">→</span>}
      </button>
    </form>
  );
}
