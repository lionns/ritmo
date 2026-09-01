# Design Handoff

Tokens and rules for the Ritmo interface. Non-normative like `research.md`: it records what the
design is and why, it does not create requirements. Where a rule here exists because a requirement
demands it, the requirement is named.

## Visual References

- **Approved canvas** — five artboards, light and dark, at
  `https://claude.ai/code/artifact/c21822cb-584e-4600-8f31-0b9afbc8d629`. Screens: portfolio
  (desktop + mobile), log-progress, weekly close, dormant project.
- **Navigation canvas** — the route map and both navigation options drawn side by side, at
  `https://claude.ai/code/artifact/bd48460c-5385-4894-aa86-d9ba288d4a34`. Option B is the one settled;
  the artboards there are the only drawing of it.
- **Awwwards, *Best Free Fonts*** and ***Gradients in Web Design***  — sources for the typeface
  shortlist and for the blurred-gradient ground. Owner picked the pairing and the magenta→cyan move
  from these.
- **Laws of UX** (`lawsofux.com`) — Fitts, Doherty, Von Restorff, Selective Attention, Peak-End and
  Miller each changed something concrete; each is cited at the rule it produced.
- **Fontshare** (`fontshare.com`, Indian Type Foundry) — all three typefaces. Free for commercial
  use under the ITF Free Font Licence. **The four faces are vendored, with the licence beside them.**
  Fetching them during the build made a required gate depend on the network, which `D-013` forbids;
  corrected 2026-08-31. Re-check the licence before any redistribution.

## Design Tokens

Two complete palettes, not one inverted. Dark is the default; light is a first-class peer. Values
below are the ones running in the approved canvas.

### Color

| Token | Dark | Light | Role |
|---|---|---|---|
| `bg` | `#07090A` | `#F2F0EA` | Page ground. Never pure black or pure white. |
| `ink` | `#EDE9DF` | `#121110` | Primary text. |
| `dim` | `#93908A` | `#56524A` | Secondary text, labels, captions. |
| `faint` | `#4A4F52` | `#A9A396` | **Decorative only** — hairlines, empty-day marks. See Accessibility. |
| `faint-text` | `#6B7276` | `#827C6D` | The text-safe grade of `faint`. Use wherever `faint` carries words or numbers. |
| `hair` | `rgba(237,233,223,0.10)` | `rgba(18,17,16,0.14)` | Row dividers inside glass. |
| `accent` | `#00E0FF` | `#00707F` | The single accent. Light is **not** the same cyan — see below. |
| `accent-ink` | `#07090A` | `#FFFFFF` | Text on an accent fill. |
| `glass` | `rgba(5,9,10,0.64)` | `rgba(255,255,255,0.55)` | Panel fill behind `backdrop-filter`. Dark corrected against a real screen on 2026-08-31. |
| `glass-border` | `rgba(237,233,223,0.10)` | `rgba(18,17,16,0.10)` | 1px panel edge. |
| `glow` | `0,224,255` | `0,112,127` | RGB triplet for the ground gradient. |
| `sleep` | `#7E7565` | `#8A7E68` | Dormant projects. Warm, not grey — a paused project is not a dead one. |

**Light accent is a different hue on purpose.** `#00E0FF` on `#F2F0EA` measures **1.41:1** — it is
invisible. `#00707F` measures **5.08:1** and holds the same cyan family. Do not "just reuse" the
dark accent in light mode.

**The 2% rule.** Accent covers roughly 2% of any screen: the primary button, the one live metric,
the filled progress dots. Nothing else. Von Restorff — the mark that differs is the mark that is
remembered; spreading it kills it. The dormant screen carries **no accent at all**, and that absence
is the message.

**Never red.** NFR-8 forbids rendering week attribution as loss. There is no error-red in the
palette and no debt accumulates across weeks. A missed week is stated in `dim` and drops.

### Typography

Three faces, each with one job.

| Family | Weights | Job |
|---|---|---|
| **Clash Display** | 600 | Display only — the one headline per screen. |
| **Switzer** | 400 / 500 / 600 | Everything read as language: body, labels, buttons, project names. |
| **Martian Mono** | 300 / 400 | Numbers and machine labels only. Loaded from Google Fonts. |

Scale, as used (px):

| Step | Desktop | Mobile | Applied to |
|---|---|---|---|
| Display | 132 | 40–54 | Screen headline. Clash Display 600, `line-height:0.84`, `letter-spacing:-0.04em`. |
| Metric | 64 | 46–50 | The live number. Martian Mono 300, `line-height:0.8`, `letter-spacing:-0.06em`. |
| Title | 20 | 17–19 | Project name. Switzer 600, `letter-spacing:-0.02em`. |
| Body | 15 | 14–15 | Commitment sentence. Switzer 400, `line-height:1.45`. |
| Button | 16 | 17 | Switzer 600. |
| Label | 9 | 8 | Martian Mono, `letter-spacing:0.20–0.22em`, uppercase, colour `dim`. |

Two rules that carry the look: display type is set **tight** (negative tracking, sub-1 leading) and
mono labels are set **wide** (0.2em+). The contrast between them is the typographic identity.

### Spacing

4px grid throughout — the same grid the ER diagrams use.

| Token | px | Use |
|---|---|---|
| `2xs` | 4 | Icon gaps. |
| `xs` | 8 | Inside a row. |
| `sm` | 14 | Between a title and its sentence. |
| `md` | 16 | Row padding inside glass. |
| `lg` | 22 | Glass horizontal padding. |
| `xl` | 38 | Between blocks in a column. |
| `2xl` | 56–64 | Column gap, page padding, header-to-content. |

Page padding: `44px 64px` desktop, `32px 20px 24px` mobile.

### Radius

| Token | px | Use |
|---|---|---|
| `field` | 18 | Inputs, list rows. |
| `panel` | 20–22 | Glass panels. |
| `pill` | 26–29 | Buttons — always exactly half the height, so a 58px button uses 29. |
| `dot` | 50% | Progress dots, 12px. |

### Elevation

There are no drop shadows. Depth comes from three stacked layers, in this order:

1. **Ground glow** — a `radial-gradient` from `rgba(glow,0.5)` to transparent at 72%, blurred
   `86px`, anchored bottom-centre and bled past every edge.
2. **The hero chart** — see below.
3. **Glass** — `background: glass`, `backdrop-filter: blur(22px) saturate(1.3)` (ship the
   `-webkit-` prefix too), `1px solid glass-border`.

**Performance risk:** `backdrop-filter` is expensive on low-end mobile GPUs and can cost frames on
scroll. Cap it at **two glass surfaces per screen** and measure against NFR-6 before adding a third.
Fallback where unsupported: raise `glass` alpha to opaque and drop the blur.

**Grain** sits above everything at `z-index:9`, `pointer-events:none`: an inline
`feTurbulence` SVG, `baseFrequency 0.8`, `numOctaves 4`, 160×160 tile. `mix-blend-mode: screen` at
`0.10` in dark, `multiply` at `0.16` in light. It is what stops the gradients banding.

## The Hero Chart

The bars behind every screen are data, not texture. **Settled with the owner on 2026-08-30.**

- **X axis** — one mark per day, most recent at the right. **28 days on desktop, 14 on mobile.**
  Miller: 28 marks at 390px is noise wearing the costume of a chart.
- **Y axis** — mark height encodes **minutes logged that day** (`Entry.effortMinutes`).
- **Three states, because `effortMinutes` is optional** (`data-model.md`, Entry):
  1. **Nothing logged** → a 9px stub at the baseline in `faint-text`, no accent.
  2. **Entries logged, no minutes given** → accent mark at a **fixed 12px floor**.
  3. **Minutes logged** → accent mark, height proportional.
  Without state 2, a day with three untimed entries would render identical to an empty day — the
  chart would lie about exactly the thing the product exists to protect.
- **Always labelled.** `28 DIAS · ALTURA = MINUTOS REGISTRADOS` / `14 DIAS · MINUTOS`, in the mono
  label style. An unlabelled height is not a datum.
- **Opacity 0.30 applies to marks, never labels.** The legend remains full-opacity `dim`, at 9px
  mobile / 10px desktop; settled after owner readability testing on 2026-08-31.

## The Project Row

Every project inside the glass panel. Drawn in the approved canvas (`L-Escritorio` and `L-Movil`,
page `page-ux`) but never written down until now, so the first implementation could not build it.
**Settled with the owner on 2026-09-01**, reading the artboards back.

- **Three elements, in this order:** the marker row, the project title, one sentence. Nothing else.
  No area label, no field labels, no per-field rows. The artboards carry four fewer text blocks than
  a labelled form does, and that difference is the design.
- **The markers, above the title.** A small path, left to right: one **filled `accent` circle per
  recent progress entry**, then one **`faint` outlined circle** — the next step, always drawn — then
  a **`faint` diamond** for the objective. A project with nothing logged opens at its empty circle.
  The outline is not conditional: `data-model.md` requires every active project to carry exactly one
  open next action, so the step always exists, and all three rows of the canvas draw it.
  | Mark | Geometry | Desktop | Mobile |
  |---|---|---|---|
  | Progress | circle, filled `accent` | 12px | 11px |
  | Open next action | circle, `1.5px` border in `faint`, no fill | 12px | 11px |
  | Objective | square rotated `45deg`, filled `faint`, `margin-left: 5px` | 9px | 8px |
  Row is `flex`, `align-items: center`, `gap: 10px`.
- **Filled circles cap at four.** Owner's number, not the canvas's — the artboards only ever draw
  two. Four is the 28-day window read as weeks, and it holds the row near 65px inside a 400–480px
  panel. Past four the row stops growing.
- **The markers are a path, not a score.** They carry no number, no streak and no target, and a
  missed period removes nothing that was there (`NFR-7`, `AC-X4`). If a count is ever rendered
  beside them, that rule is the one it breaks.
- **The sentence is the next action, read as language.** `trigger` and `act` join into one line in
  `dim`: the trigger already carries its own *Cuando* / *Si* / *El sábado*, so the rendering joins
  them with a comma, lowercases the first letter of `act` unless that word is capitalised in its own
  right, and closes with a period. `Cuando pase el despliegue de la mañana, verifico la réplica.`
  A project with no open next action shows the prompt to write one instead, also in `dim`.
- **The marks are `aria-hidden`.** Everything they encode is already in text on the same screen:
  the section heading says whether the project moved, and the sentence says whether a next action is
  open. Only the count of advances is theirs alone, and `NFR-7` does not want that spoken any more
  than it wants it drawn. Shape already carries the states for anyone reading them (§ Accessibility
  Notes, "Progress dots pair fill with an outline shape").
- **Spacing.** `14px` above and below the row on mobile, `16px` on desktop, a `hair` rule between
  rows, and **`8px` between the marks, the title and the sentence**. Those three 8px gaps are the
  hierarchy of the row; compact height mode takes its space from the outer padding (down to `12px`)
  and never from them.
- **The whole row is the link** to `/registrar?project=<id>`, which is what preserves the prefilled
  project without spending a visible element on it (`NFR-1`). The canvas draws a single accent
  button in the headline column; a second call to action per card was never in it.

## Navigation Map

Six routes, three levels deep. Settled with the owner on 2026-08-30 after drawing both options.

| Route | What it is | How you reach it |
|---|---|---|
| `/` | **Portfolio.** What moved, before what is outstanding (US-3). The landing. | The wordmark, from anywhere. |
| `/p/:id` | **Project.** History, next action, dormant state, log form inline. | Tapping a project. |
| `/semana` | **The ritual.** One route, two states: proposal when the week opens (FR-10), close when it ends (US-7, US-8). | A strip below the header on `/`, shown only when the week is due. |
| `/archivo` | **Shelved, dormant, closed.** The backlog that may never be the landing. | A footer link at the end of the portfolio list. |
| `/ajustes` | Capacity cap (US-1), areas, tags, **export** (FR-21), passkey. | A footer link beside the archive. |
| `/entrar` | Passkey sign-in (D-004). | Only without a session. |

**`/semana` is one route with two states, not two routes.** Opening the week and closing it are the
same ritual at different moments; splitting them creates two places the owner has to remember to
visit.

**No persistent navigation chrome.** No tab bar, no top nav. The wordmark returns to `/`; everything
else is reached from where it is relevant. Two reasons this beat a persistent bar, both of which only
became visible once both were drawn:

1. **On mobile a tab bar and the primary CTA fight over the same thumb band.** The CTA is a 58px
   target at the bottom of the screen (Fitts); a 72px tab bar under it either pushes the CTA up or
   crowds it.
2. **A tab bar needs an active state, and the active state wants the accent.** That pushes accent
   coverage from ~2% to ~4% and puts it twice on one screen — Von Restorff says two highlighted
   things are none.

The cost is discoverability in the first week. It is small here and only here: there is one user,
four destinations, and no onboarding funnel to lose people in.

**Settings is a footer link, not a gesture.** An earlier proposal hid it behind a long-press on the
wordmark. Drawing it showed a hidden affordance with nothing announcing it, so it sits beside the
archive link at the end of the list.

## Responsive Behavior

Mobile-first; desktop is where the owner actually spends the day, so both are designed, not derived.

| Range | Layout |
|---|---|
| **390px** (base) | Single column. Full-bleed hero. Full-width CTA pinned low. 14-day chart. |
| **≥ 768px** | Single column, wider gutters, chart to 28 days. |
| **≥ 1200px** | Two columns, `minmax(0,1fr)` plus a fluid 400–480px glass, 64px gap. Headline left, glass panel right. |

Artboards are drawn at 390×844 and 1440×900.

**Height and content reflow, settled with the owner on 2026-08-31.** The main grid takes available
height and centres both columns on one vertical axis, but the hero chart owns a full-width row after
the grid instead of staying fixed to the viewport. Desktop is a `100dvh` stage: page padding, header
gap, footer gap and chart height contract fluidly with viewport height, and viewports up to 1200px
tall use compact card spacing while preserving type sizes and 56px targets. The normal three-project
portfolio should fit without scrolling. The glass is capped to the remaining grid row and scrolls
internally only as a fallback for exceptional content. Mobile keeps one document flow, avoiding a
scroll surface inside a narrow screen.

When fallback scrolling appears, its track stays transparent and its thin `dim` thumb belongs to
the glass surface; it never uses accent. **Density may remove empty space, not reading structure**:
compact height mode contracts the outer padding of a row and the gaps between blocks, never the gaps
*inside* a row, and never a type size or a 56px target. The 12px figure this paragraph carried until
2026-09-01 described the retired six-block card; § The Project Row now sets the row's own numbers.

## Interaction States

| State | Rule |
|---|---|
| **Focus** | 2px `accent` outline, 2px offset. Visible in both themes; never removed. |
| **Hover** | Buttons lift `accent` ~6% and nothing moves. No transforms on hover. |
| **Active** | Fill drops ~10%. No scale. |
| **Loading** | The layout is already drawn; only the value swaps. No spinner over a known layout. |
| **Empty** | A sentence, never an illustration: "Aún no hay nada aquí. Escribe la primera línea." |
| **Error** | `ink` on `glass`, stated as a fact, with the action to fix it. Never red (NFR-8). |
| **Success** | The chart mark grows. That is the whole confirmation — no toast. |

**Targets are 56px desktop / 58px mobile, minimum.** Fitts: the earlier mobile CTA had a glass ring
around the button, which made the real target smaller than the thing the eye read as the target.
The button **is** the target now — no decorative wrapper may extend past a hit area.

**Form screens veil the hero.** A `bg` overlay at **0.78–0.82** sits over the chart on the log and
close screens. Selective Attention: on a screen with one field, the field wins.

**Peak-End on the weekly close.** The close is the end of the cycle, so it summarises before it
asks: "Cuatro de siete días con algo escrito." then the button. The last screen of a week decides
how the week is remembered.

## Motion

| Property | Value |
|---|---|
| Keyframe | `rise` — `scaleY(0) → scaleY(1)`, `transform-origin: 50% 100%`. |
| Duration | `0.22s`. |
| Easing | `cubic-bezier(.16, .9, .24, 1)`. |
| Stagger | `6ms × index`. |
| **Worst case** | 28 × 6 ms + 220 ms = **388 ms**. |

**388ms is not arbitrary.** Doherty puts the attention threshold at 400ms. The first build of this
animation ran **730ms** and had to be cut. Any future motion is measured against 400ms end-to-end,
not per element.

`@media (prefers-reduced-motion: reduce)` sets `animation: none` — bars appear at final height. This
is already in the canvas and is not optional.

## Accessibility Notes

Measured contrast (WCAG 2.1), dark / light:

- `ink` on `bg` — **16.46** / **16.55**. Passes AAA.
- `dim` on `bg` — **6.27** / **6.82**. Passes AA at any size.
- `accent` on `bg` — **12.45** / **5.08**. Passes AA.
- `accent-ink` on `accent` — **12.45** / **5.79**. Passes AA.
- `faint` on `bg` — **2.41** / **2.20**. **Fails.**

**Known issue, carried from the canvas.** The approved artboards use `faint` for two pieces of text
— the `/4` in the `3/4` metric and the mono sub-labels. At 2.41:1 that fails even the 3:1 large-text
floor. `faint-text` (`#6B7276` dark = 4.08, `#827C6D` light = 3.65) is the fix and both clear the
bar. **The canvas has not been re-rendered with it; the token table above is authoritative and the
implementation must follow the table, not the artboards.** `faint` stays legal for hairlines only.

Also binding:

- **Colour is never the only channel.** Progress dots pair fill with an outline shape; the dormant
  state pairs `sleep` with the absence of any accent, plus its own copy.
- **Every chart mark needs its label.** See The Hero Chart.
- **Grain and glass are `pointer-events:none`** and must never sit between a finger and a target.
- Target minimum 56/58px, above the 44px floor, per Fitts.

## Open Items

- [ ] Re-render the canvas artboards with `faint-text` so artboards and tokens agree.
- [ ] Measure `backdrop-filter` cost on a real phone against NFR-6 before the interface task closes.
- [x] Fontshare licence recorded at `public/fonts/LICENSE-ITF-FFL.md`, beside the four faces (T-006).
