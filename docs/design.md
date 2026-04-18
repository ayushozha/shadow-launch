# Shadow Launch · Design System

**Design reference · v0.1 · 04.18.26**

> A living document. Extracted from the homepage build. Use it when porting to Next.js and when building the product UI (input → run view → results).

---

## 1. Design Philosophy

The aesthetic is **field manual meets scientific instrument**. Not luxury. Not playful. Not corporate SaaS.

Three words to hold in your head while designing:

- **Authoritative.** Editorial typography, confident hierarchy, nothing tentative. This is a tool for people who make high-stakes GTM calls.
- **Instrumental.** Technical readouts, mono-font traces, numerical precision. The product is a measuring device, not a magic box.
- **Warm.** The palette is paper and ink, not chrome and glass. Warmth is how we signal we are on the operator's side, not a vendor selling at them.

The tension between editorial warmth (serif display, cream paper) and technical coldness (mono numbers, agent traces) is the whole aesthetic. Lose either and it collapses into a generic AI tool.

### Anti-principles

What we explicitly reject:

- Purple gradients, holographic anything, glassmorphism
- Rounded friendly sans-serif marketing voice (Inter, DM Sans on cream)
- Neon/cyberpunk "AI agent" tropes
- Stock isometric illustrations of robots or brains
- Emoji in UI (copy only, and sparingly)
- Generic "Built with AI ✨" badges

---

## 2. Color System

### 2.1 Tokens

Every color in the product lives in these CSS variables. Do not introduce new ones without updating this doc.

```css
:root {
  /* surfaces */
  --paper: #ece4d2;          /* primary background, warm newsprint */
  --paper-deep: #e1d8c3;     /* secondary surfaces, method/wedge sections */

  /* ink */
  --ink: #0c0c0a;            /* primary text, near-black warm */
  --ink-soft: #1a1a16;       /* body text, slightly softer */
  --muted: #6a6454;          /* meta, labels, de-emphasized */

  /* rules and shadows */
  --rule: rgba(12, 12, 10, 0.22);        /* primary borders */
  --rule-soft: rgba(12, 12, 10, 0.10);   /* dashed and secondary */
  --shadow: rgba(12, 12, 10, 0.12);      /* ghost typography */
  --shadow-strong: rgba(12, 12, 10, 0.22);

  /* signals */
  --accent: #e33312;         /* vermilion, stamp red, single accent */
  --accent-ink: #b3260a;     /* hover / pressed state */
  --phosphor: #2b6b3f;       /* success / ok state, used sparingly */
}
```

### 2.2 Usage rules

- **There is one accent color.** `--accent` carries every interactive signal, every "selected" state, every stamp, every "this matters" cue. Resist the urge to introduce blue for links or green for success. The accent does the work.
- **Backgrounds are `--paper` by default, `--paper-deep` for alternating bands, `--ink` for the one dark section.** No white. Ever.
- **Text is `--ink` for headlines, `--ink-soft` for body prose, `--muted` for meta and labels.** Three tiers, do not add a fourth.
- **Borders are always one of the two rule tokens.** Solid for primary, dashed for secondary. No custom line weights.
- **`--phosphor` appears only on "OK" / "success" states in trace output.** It is not a general-purpose green. Using it anywhere else breaks the warning/signal hierarchy.

### 2.3 Contrast ratios

- `--ink` on `--paper`: 17.2:1 (AAA)
- `--ink-soft` on `--paper`: 14.4:1 (AAA)
- `--muted` on `--paper`: 4.8:1 (AA for body, AAA for large)
- `--accent` on `--paper`: 4.9:1 (AA), use for large text or UI signals, not long prose
- `--paper` on `--ink`: 17.2:1 (AAA)

---

## 3. Typography

### 3.1 Typefaces

Two families. No exceptions.

**Fraunces** (Google Fonts). Display and body.
- Variable axes in use: `opsz` (9 to 144), `wght` (300 to 900), `SOFT` (0 to 100).
- At display sizes use low `SOFT` (20 to 40) for crispness. At smaller sizes bump `SOFT` to 60 to 100 for warmth.
- Italic variation is *the* emphasis tool. Use it liberally for emphasis within headlines, never bold.

**JetBrains Mono** (Google Fonts). Technical layer only.
- Labels, timestamps, data readouts, trace output, scores, status badges.
- Always uppercase, always with `letter-spacing: 0.12em` to 0.20em.
- Size 9px to 11px for labels, 11px to 14px for readouts.

Do not introduce a third typeface. Do not use Fraunces for trace output. Do not use JetBrains Mono for prose.

### 3.2 Scale

```
/* Display */
.h-hero:      clamp(56px, 9vw, 132px) / 0.92 line-height / -0.035em tracking
.h-section:   clamp(34px, 4.5vw, 58px) / 1.02 / -0.02em
.h-cta:       clamp(44px, 6vw, 88px)   / 0.96 / -0.03em

/* Prose */
.p-lead:      28px / 1.3  / Fraunces wght 420
.p-body:      20px / 1.55 / Fraunces wght 400
.p-small:     17px / 1.5  / Fraunces wght 400
.p-micro:     14px / 1.5  / Fraunces wght 380

/* Mono */
.m-label:     11px / letter-spacing 0.14em / uppercase
.m-trace:     11px / letter-spacing 0.08em / normal case
.m-meta:      10px / letter-spacing 0.18em / uppercase
.m-micro:     9px  / letter-spacing 0.14em / uppercase
```

### 3.3 Rules for headlines

- **One italic word per headline** for emphasis. No more. The italic in Fraunces has a higher `SOFT` axis, which makes it softer and more voice-forward. That contrast is the effect.
- **Use `em` tags with a class for accent-colored italic.** This is the signature move. See `h2 em` in the stylesheet.
- **Ghost typography is for hero-tier display only.** Offset outlined shadow version of the word, behind the main. Do not use this effect in subheadings or buttons.

### 3.4 Rules for prose

- Opening paragraphs in long sections get a drop cap in Fraunces + accent color. See `.drop` class. Use once per section maximum.
- Italic inline is for titles and emphasis. Not decorative.
- Never center-align body prose. Left-align or justified.

---

## 4. Layout and Grid

### 4.1 Spacing scale

Base unit: 4px. The scale is 4, 6, 8, 10, 14, 20, 24, 32, 40, 56, 80, 96, 140.

Section padding: `96px 40px` on desktop, `60px 22px` on tablet, `40px 22px` on mobile.

### 4.2 Section structure

Every major section follows this pattern:

```html
<section>
  <div class="section-head">
    <span class="mono">§0X · Section Label</span>
    <h2>The <em>headline</em> with one italic accent.</h2>
  </div>
  <div class="reveal">
    <!-- section content -->
  </div>
</section>
```

The `section-head` is a two-column grid (`1fr 3fr`). The meta label on the left, the headline on the right. This is the rhythm of the whole site and it must be preserved in product screens.

### 4.3 Rules

- **Borders separate sections, not shadows.** Horizontal rules at `1px solid var(--rule)` between sections.
- **Vertical rhythm is aggressive.** 96px between sections on desktop is correct. Do not reduce to "feel more modern." The breathing room is the voice.
- **Alternating background bands** (`--paper` → `--paper-deep` → `--paper` → `--ink`) create the structural rhythm. Do not stack three same-color sections in a row.
- **The dark section is a feature, not a template.** Use it once per page, for the "stack" or "instrumentation" moment.

### 4.4 Responsive breakpoints

```
Desktop: ≥ 1100px
Tablet:  761px to 1100px → multi-column grids collapse to 2-column
Mobile:  ≤ 760px         → everything to 1 column, section padding shrinks
```

---

## 5. Components

The homepage has eleven reusable patterns. Port them to React with the same class names preserved so the CSS ports cleanly.

### 5.1 Trace Bar

A fixed-top ticker showing live agent activity. Present on every product screen, not just the homepage.

```
[LIVE / SIMULATION TRACE][APIFY scanning... | MINDS instantiating... | KALIBR rerouting...]
```

- Height: 26px, fixed
- Left label: uppercase mono on `--accent`, blinking dot prefix
- Stream: mono text, 10px, infinite left-scroll marquee
- Contents rotate: real event stream when live, canned messages when idle

On product screens this upgrades to show the *actual* run's events.

### 5.2 Nav

Sticky top. Three regions: logo, section links, primary CTA.

- Background: `rgba(236, 228, 210, 0.92)` with `backdrop-filter: blur(8px)`
- Logo: small typographic mark + wordmark in Fraunces 15px wght 500
- Links: mono 11px uppercase, hover goes to accent
- CTA button: ink-filled, 1px border, hover flips to accent background

### 5.3 Ghost Typography

The signature hero effect. A word with an offset outlined twin drifting behind it.

```html
<span class="ghost-wrap" data-text="launch.">
  <span class="italic">launch.</span>
</span>
```

```css
.ghost-wrap::before {
  content: attr(data-text);
  position: absolute; left: 0; top: 0;
  color: transparent;
  -webkit-text-stroke: 1px var(--shadow-strong);
  transform: translate(14px, 10px);
  z-index: -1;
  animation: drift 9s ease-in-out infinite;
}
@keyframes drift {
  0%, 100% { transform: translate(14px, 10px); }
  50%      { transform: translate(18px, 14px); }
}
```

Rules: use on exactly one word per page. Never on buttons. Never on body prose.

### 5.4 Readout Panel

A terminal-style box showing agent traces. The core product instrument. Ships everywhere: hero side panel, run view main column, results page sidebar.

Structure:

```
┌──────────────────────────────────┐
│ SIM_RUN / 004-A     [●][●][●]   │ ← header (dark, mono)
├──────────────────────────────────┤
│ [00:00] init shadow_launch...    │
│ [00:03] apify → harvesting...    │ ← body (mono, streaming)
│ [00:11] market_twin assembled    │
│ ...                              │
├──────────────────────────────────┤
│ runtime · 00:01:24   conf · 0.81 │ ← footer (mono, muted)
└──────────────────────────────────┘
```

- Header: dark ink background, `--paper` text, three status dots (on = accent)
- Body: min-height 340px, line-height 1.9 for breathing
- Line colors: `.mu` for timestamps (muted), `.k` for agent names (accent), `.ok` for success (phosphor)
- Footer: mono 10px, separated by middle dot

Always include the header and footer. Never render a bare scrolling list.

### 5.5 Stamp

A rotated circular badge. Used for one-per-page moments of emphasis (`PRE TESTED / NOT LIVE` on hero).

```css
.stamp {
  width: 120px; height: 120px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  transform: rotate(-12deg);
  background: rgba(227, 51, 18, 0.06);
  color: var(--accent);
  font-family: "JetBrains Mono";
  font-size: 10px; letter-spacing: 0.14em;
  font-weight: 600; line-height: 1.3;
}
```

Animation: slams in from 2.4x scale over 0.6s, bouncy easing. Use once per screen. Candidate uses in product: "WINNER" on the selected wedge, "PRE-TESTED" on the ad set, "DEPLOYED" on a shipped launch.

### 5.6 Section Head

The two-column meta-plus-headline. Already documented in 4.2. Every section gets one.

### 5.7 Step Grid

A row of 5 numbered panels, each representing a stage. Use for the method section on the homepage. Reuse on the product run view to show progression.

- Each step: mono "STAGE 0X" label in accent, Fraunces heading, muted prose body, tag row at bottom
- Border right on each except last
- Hover state raises background slightly

### 5.8 Juror Card

A 4-up grid of synthetic buyer profiles. This pattern is also the interactive jury room on the results page.

- Portrait: 68px circle, dark fill with a radial highlight, single-letter monogram in italic Fraunces
- Role: mono label
- Name / descriptor: Fraunces 22px
- Quote: italic Fraunces 15px with oversized accent-colored quotation mark pseudo-element
- Meta row: composited count + score (positive in phosphor... actually, no, use accent for both positive and negative; the sign communicates enough)

### 5.9 Wedge Viz

The radial SVG showing three scored positioning wedges with one highlighted.

- 400×400 SVG, three wedge slices with the winner in solid accent
- Dashed concentric rings for depth
- Callout line + mono label on the winning wedge
- Center label in italic Fraunces

On the results screen this can be animated: the winner's fill transitions from outlined to filled over 800ms on reveal.

### 5.10 Stack Grid

A 5-column dark band crediting sponsors as "departments." Reusable as a teammate/stakeholder grid on the launch board view.

- Background `--ink`, text `--paper`
- Role label in muted mono
- Department name in italic Fraunces 28px, accent-colored italic
- Description in 13px Fraunces

### 5.11 Watermark CTA

A section with a massive italic Fraunces word at 320px behind the content, at 0.1 opacity. Used for the final CTA. Reusable for any "hero moment" on a results page.

---

## 6. Motion

### 6.1 Principles

- **Motion signals state change, not decoration.** Nothing animates for the sake of animating.
- **Easing defaults to `cubic-bezier(0.2, 0.7, 0.2, 1)`.** Natural, slightly hesitant. Avoid linear and `ease-in-out` defaults.
- **Entrances are staggered.** Hero elements float in at 0.05s, 0.15s, 0.5s, 0.7s. This rhythm is the page's heartbeat.
- **No hover animations longer than 250ms.** Feedback must be instant.

### 6.2 Animation library

```css
@keyframes floatIn {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: none; }
}

@keyframes drift {  /* ghost typography parallax */
  0%, 100% { transform: translate(14px, 10px); }
  50%      { transform: translate(18px, 14px); }
}

@keyframes slide {  /* trace ticker marquee */
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

@keyframes blink {  /* status dot */
  0%, 60%   { opacity: 1; }
  70%, 100% { opacity: 0.2; }
}

@keyframes stampIn {
  0%   { opacity: 0; transform: rotate(-12deg) scale(2.4); }
  60%  { opacity: 0.8; transform: rotate(-12deg) scale(0.92); }
  100% { opacity: 1; transform: rotate(-12deg) scale(1); }
}
```

### 6.3 Scroll reveals

Use `IntersectionObserver` with threshold 0.15 and a single `.in` class flip. Do not attempt parallax or scroll-linked transforms. They fight the editorial feel.

```js
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
```

### 6.4 Product-specific motion

For the run view, where agents actually execute:

- **Stage cards light up one at a time**, never in parallel, even if the backend runs them concurrently. Serial visual = readable.
- **Each stage has an idle → active → complete visual state.** Muted → accent left border → phosphor checkmark.
- **Trace lines stream in at 180ms intervals.** Matches the homepage hero readout. Feels alive without looking frantic.
- **Juror reactions stream word-by-word**, not all at once. Type-on at 40 characters per second. This sells the "they are thinking" illusion.

---

## 7. Texture and Atmosphere

Two layers always present on `body`:

### 7.1 Grain overlay

A tiny SVG noise texture applied as a fixed overlay at 0.55 opacity, blend mode `multiply`. This is what makes the paper feel like paper.

```css
body::before {
  content: "";
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg...fractalNoise...>");
  opacity: 0.55;
  mix-blend-mode: multiply;
  pointer-events: none;
  z-index: 100;
}
```

The exact SVG is in the homepage source. Copy it verbatim.

### 7.2 Vignette

A radial gradient darkening the edges of the viewport. Subtle but structural.

```css
body::after {
  content: "";
  position: fixed; inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(12,12,10,0.08) 100%);
  pointer-events: none;
  z-index: 99;
}
```

Both must ship on every screen. They are not decorative.

---

## 8. Iconography

Minimal. The system is typographic, not iconographic.

- **Logo mark:** two overlapping circles, the second rotated and accent-colored via `mix-blend-mode: multiply`. See `.logo-mark` in the homepage CSS. It is the "shadow" idea made geometric.
- **Arrows:** always unicode `→` in context, never a bespoke SVG. Transitions right-shift 4px on parent hover.
- **Status dots:** `●` character in mono font. Color encodes state.
- **Bullet separators:** middle dot `·` between meta items, not pipes or slashes.

If you find yourself reaching for an icon, reach for a mono label instead.

---

## 9. Voice and Tone

The copy is as much part of the design as the typography.

### 9.1 Principles

- **Declarative over persuasive.** "The launch before the launch." Not "Launch smarter with AI."
- **Short sentences. Occasional long ones for rhythm.** Vary or it gets choppy.
- **Write like a field manual, not a pitch deck.** "The twin is only as honest as its intake." That sentence earns its keep.
- **Numbers are always specific.** "3 to 6 wedges pressure-tested" is right. "Multiple wedges" is wrong.
- **Never use "AI-powered" or "intelligent" as adjectives.** Show it working. Do not label it.
- **No em dashes.** Use commas, colons, or restructure. This applies to UI copy and documentation.

### 9.2 Lexicon

Consistent language across UI, docs, and marketing:

| Use | Not |
|---|---|
| Run | Analysis / Session / Scan |
| Wedge | Angle / Positioning option / Hypothesis |
| Jury | Panel / Audience / Focus group |
| Juror | Persona / Clone / Avatar |
| Deliberation | Review / Evaluation / Discussion |
| Twin | Model / Map / Graph |
| Shadow Launch | Pre-launch / Simulation / Test |
| Stage | Step / Phase / Part |
| Trace | Log / Output / History |

The lexicon is the product. Using "persona" instead of "juror" leaks the magic.

### 9.3 Microcopy patterns

- Buttons: imperative and specific. "Run a Shadow Launch" not "Get Started"
- Loading states: name the agent doing the work. "Apify is assembling the twin" not "Loading..."
- Empty states: short, voice-consistent. "No runs yet. Paste a URL to begin your first." not "You haven't created anything yet."
- Error states: candid, not apologetic. "Apify hit a rate limit. Using cached twin from 04:12 PM instead." not "Something went wrong."

---

## 10. Product Screen Guidelines

### 10.1 Input screen

Repurpose the homepage hero as the input surface. Replace the right-hand readout panel with the input form. Form fields styled as paper with ink bottom borders, no box backgrounds. Submit button is the primary CTA pattern.

### 10.2 Run view

Left 60%: vertical stack of 5 Stage Cards (see §5.7). Right 40%: the Readout Panel (see §5.4), live-streaming. Trace Bar pinned top. Nav visible. No footer.

When a stage completes, the card collapses to a summary line with a phosphor check, and the next card activates.

### 10.3 Results page

Long scroll. Sections in this order:

1. Verdict banner: winning wedge in hero-scale type, accent stamp rotated
2. Jury transcript: the Juror Card grid (§5.8), all reactions expanded
3. Wedge breakdown: the Wedge Viz (§5.9) + score list
4. Ad set: grid of 5 ad cards (new component, follow the Juror Card structure)
5. Launch board: task list in the Stack Grid pattern (§5.10) but on paper, not ink
6. Action row: Export, Share, Re-run

Every section gets its own Section Head. The scroll experience mimics the homepage rhythm.

---

## 11. Do's and Don'ts

### Do

- Use italic Fraunces for emphasis in every headline
- Keep one accent color per screen, never introduce a second
- Preserve section-head rhythm across every page
- Layer grain and vignette on every screen
- Name the agent doing the work in every loading state
- Cite sources in the trace ("pulled from reddit.com/r/SaaS · n=47")
- Use mono for any string that represents data, a score, or a timestamp

### Don't

- Add a blue link color, a green success color, or a yellow warning color
- Introduce a third typeface, even "just for the dashboard"
- Use bold weights for emphasis (italic is the tool)
- Center-align body prose
- Animate for decoration
- Write persuasive marketing voice inside the product
- Put a white background anywhere, including cards
- Use em dashes

---

## 12. Open Questions

Things the v0.1 design does not yet answer. Resolve as the product UI gets built.

1. **Dark mode.** Does it exist? If yes, inversion or parallel palette? (Recommend: no dark mode for v1. The paper-and-ink identity is the brand.)
2. **Data tables.** The launch board might need tabular data. Pattern not yet designed.
3. **Form density.** The hero is low-density. The run view is medium. What does a settings page look like at high density?
4. **Mobile run view.** 2-column layout collapses. Does trace panel go above or below stage list? (Recommend: tabs. "Stages | Trace" switcher.)
5. **Loading states beyond 3 seconds.** What does Stage 03 look like when Minds AI takes 40 seconds? Needs a pattern.

---

**Design reference maintained alongside the codebase. When you change a component, update this doc.**

**Author:** Ayush Ojha · ayushozha@outlook.com
**Ref implementation:** `shadow-launch.html` (homepage)
**Status:** v0.1 · extracted from homepage build · 04.18.26
