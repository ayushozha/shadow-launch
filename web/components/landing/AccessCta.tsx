import InputForm from "./InputForm";

export default function AccessCta() {
  return (
    <section
      id="access"
      className="cta relative overflow-hidden bg-[var(--paper)] px-10 py-36 text-center"
    >
      <div className="cta-deco pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
        <span
          className="font-serif italic"
          style={{
            fontVariationSettings: '"opsz" 144, "wght" 300, "SOFT" 100',
            fontSize: 320,
            lineHeight: 0.8,
            letterSpacing: "-0.05em",
            color: "var(--ink)",
          }}
        >
          shadow
        </span>
      </div>

      <div className="cta-inner relative mx-auto max-w-[720px]">
        <span className="mono mb-6 block text-[var(--muted)]">§06 · Access</span>
        <h2
          className="mb-6 font-serif"
          style={{
            fontVariationSettings: '"opsz" 144, "wght" 400, "SOFT" 40',
            fontSize: "clamp(40px, 5.4vw, 80px)",
            lineHeight: 0.98,
            letterSpacing: "-0.03em",
          }}
        >
          One URL.{" "}
          <em
            className="italic text-[var(--accent)]"
            style={{
              fontVariationSettings: '"opsz" 144, "wght" 380, "SOFT" 90',
            }}
          >
            A validated GTM plan
          </em>{" "}
          on the other side.
        </h2>
        <p
          className="mx-auto mb-10 max-w-[620px] text-[19px] text-[var(--ink-soft)]"
          style={{ fontVariationSettings: '"wght" 400' }}
        >
          Paste the product URL. Shadow Launch runs the full pipeline — research,
          competitors, social traction, campaign, calendar, six-persona debate —
          and hands back a shareable results page in under ten minutes.
        </p>

        <InputForm />

        <div className="cta-note mt-7 font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
          Built 04.18.26 at the Marketing Agents Hackathon · SF
        </div>
      </div>
    </section>
  );
}
