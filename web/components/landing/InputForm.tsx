"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FieldErrors = {
  product_url?: string;
  competitor_1?: string;
  competitor_2?: string;
  icp_description?: string;
};

// Loose URL check: scheme is optional, but we need something that looks
// like a hostname. Strong validation happens server-side once the API lands.
function isUrlish(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  try {
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    const u = new URL(withScheme);
    return Boolean(u.hostname) && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export default function InputForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [label, setLabel] = useState("Run Shadow Launch");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const fd = new FormData(e.currentTarget);
    const product_url = String(fd.get("product_url") ?? "").trim();
    const competitor_1 = String(fd.get("competitor_1") ?? "").trim();
    const competitor_2 = String(fd.get("competitor_2") ?? "").trim();
    const icp_description = String(fd.get("icp_description") ?? "").trim();

    const nextErrors: FieldErrors = {};
    if (!product_url) nextErrors.product_url = "Product URL is required.";
    else if (!isUrlish(product_url))
      nextErrors.product_url = "Enter a valid URL.";

    if (!competitor_1) nextErrors.competitor_1 = "Competitor URL is required.";
    else if (!isUrlish(competitor_1))
      nextErrors.competitor_1 = "Enter a valid URL.";

    if (!competitor_2) nextErrors.competitor_2 = "Competitor URL is required.";
    else if (!isUrlish(competitor_2))
      nextErrors.competitor_2 = "Enter a valid URL.";

    if (!icp_description)
      nextErrors.icp_description = "Describe your ICP in a sentence or two.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setLabel("✓ ROUTING TO SIM");

    // TODO: replace with POST /api/runs per spec §6.1 once backend lands.
    // The run id below matches cache/demo-linear.json so the live-run screen
    // can hydrate from the cached hero run during the hackathon demo.
    const payload = {
      product_url,
      competitor_urls: [competitor_1, competitor_2],
      icp_description,
    };
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          "shadow_launch_last_input",
          JSON.stringify(payload),
        );
      } catch {
        // sessionStorage may be unavailable in private mode; non-blocking.
      }
    }

    // Give the label flip a beat before navigating.
    window.setTimeout(() => {
      router.push("/run/demo-linear-001");
    }, 450);
  }

  const inputBase =
    "block w-full border border-[var(--rule)] bg-transparent px-5 py-4 font-serif text-[17px] text-[var(--ink)] outline-none placeholder:italic placeholder:text-[var(--muted)] focus:border-[var(--ink)]";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="access-form mx-auto flex w-full max-w-[560px] flex-col gap-3 border border-[var(--ink)] bg-[rgba(255,252,244,0.6)] p-5 text-left"
    >
      <div>
        <label
          htmlFor="product_url"
          className="mb-2 block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]"
        >
          Product URL
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor="competitor_1"
            className="mb-2 block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]"
          >
            Competitor URL 1
          </label>
          <input
            id="competitor_1"
            name="competitor_1"
            type="url"
            required
            placeholder="https://competitor-a.com"
            autoComplete="off"
            className={inputBase}
            aria-invalid={Boolean(errors.competitor_1)}
          />
          {errors.competitor_1 && (
            <p className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--accent)]">
              {errors.competitor_1}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="competitor_2"
            className="mb-2 block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]"
          >
            Competitor URL 2
          </label>
          <input
            id="competitor_2"
            name="competitor_2"
            type="url"
            required
            placeholder="https://competitor-b.com"
            autoComplete="off"
            className={inputBase}
            aria-invalid={Boolean(errors.competitor_2)}
          />
          {errors.competitor_2 && (
            <p className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--accent)]">
              {errors.competitor_2}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="icp_description"
          className="mb-2 block font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]"
        >
          ICP description
        </label>
        <textarea
          id="icp_description"
          name="icp_description"
          required
          rows={4}
          placeholder="Series A-C B2B SaaS buyers, head of product or ops, team of 30-300, feels the wedge pain weekly…"
          className={`${inputBase} resize-vertical min-h-[112px] leading-[1.5]`}
          aria-invalid={Boolean(errors.icp_description)}
        />
        {errors.icp_description && (
          <p className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--accent)]">
            {errors.icp_description}
          </p>
        )}
      </div>

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
