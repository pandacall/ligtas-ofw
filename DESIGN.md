---
name: LigtasOFW — Tarpaulin Babala
description: A Philippine large-format tarpaulin rendered as an interface — saturated CMYK fields, shouting display type, hard ink keylines, brass grommets.
colors:
  tarp: "#f5c518"
  paper: "#fff8ec"
  paper-edge: "#eadfcb"
  ink: "#1a1614"
  ink-soft: "#4a423c"
  ink-faint: "#6b6058"
  risk: "#c8210f"
  risk-deep: "#97180a"
  caution: "#b4560a"
  caution-deep: "#8a4108"
  verified: "#0e6b52"
  verified-deep: "#0a4f3d"
  grommet: "#8c8378"
typography:
  display:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(3.1rem, 15vw, 7rem)"
    fontWeight: 400
    lineHeight: 0.96
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(2.1rem, 6vw, 3.4rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.4rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 500
    lineHeight: 1.625
  body-sm:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 400
    lineHeight: 1.625
  footnote:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.12em"
  label-micro:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.14em"
rounded:
  none: "0"
  focus: "2px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  grommet-inset: "0.55rem"
components:
  card-tarp:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.875rem 1rem 1.25rem"
  card-header-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    padding: "0.625rem 2.25rem"
  verdict-banner-high-risk:
    backgroundColor: "{colors.risk}"
    textColor: "{colors.paper}"
    typography: "{typography.headline}"
    padding: "1rem"
  verdict-banner-caution:
    backgroundColor: "{colors.caution}"
    textColor: "{colors.paper}"
    typography: "{typography.headline}"
    padding: "1rem"
  verdict-banner-verified:
    backgroundColor: "{colors.verified}"
    textColor: "{colors.paper}"
    typography: "{typography.headline}"
    padding: "1rem"
  verdict-inline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label-micro}"
    padding: "0.125rem 0.5rem"
  tier-chip-critical:
    backgroundColor: "{colors.risk}"
    textColor: "{colors.paper}"
    typography: "{typography.label-micro}"
    padding: "0.125rem 0.375rem"
  tier-chip-warning:
    backgroundColor: "{colors.caution}"
    textColor: "{colors.paper}"
    typography: "{typography.label-micro}"
    padding: "0.125rem 0.375rem"
  tier-chip-info:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label-micro}"
    padding: "0.125rem 0.375rem"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "44px"
    padding: "0 0.875rem"
  chip-armed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    height: "44px"
    padding: "0 0.875rem"
  button-action:
    backgroundColor: "{colors.tarp}"
    textColor: "{colors.ink}"
    height: "44px"
    padding: "0 0.75rem"
  button-send:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    height: "44px"
    width: "44px"
  button-send-disabled:
    backgroundColor: "{colors.paper}"
    textColor: "rgb(26 22 20 / 0.35)"
    height: "44px"
    width: "44px"
  button-attach:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "44px"
    width: "44px"
  input-composer:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: "44px"
    padding: "0.625rem 0.75rem"
  message-user:
    backgroundColor: "{colors.tarp}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0.625rem 0.875rem"
  nav-header:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tarp}"
    padding: "0.5rem 0.75rem"
---

# Design System: LigtasOFW — Tarpaulin Babala

## Overview

**Creative North Star: "Tarpaulin Babala"**

This is a Philippine large-format tarpaulin rendered as an interface: the vinyl banner a barangay strings across a road when everyone needs to know something today. Missing persons, flood warnings, BABALA signs. The world was chosen because it is *already* a warning medium — the audience reads a tarp fluently without being taught it, it survives outdoor daylight on a cheap phone in a way a dark UI cannot, and a thing a community *posts* maps onto reporting a recruiter far better than a chat bubble does.

The system is committed rather than accented. Tarp yellow owns the surface; it is not a highlight colour on a neutral shell. A verdict does not get a badge — it gets a full-bleed field of its own colour with the word at shouting scale, because in this world a verdict is a banner. Everything is printed: hard 2px ink keylines, 4px offset solid block shadows, brass grommets pinning the corners of every card, three real press signatures (vinyl weave, halftone rosette, plate misregistration) applied to large colour fields and display type only. Nothing is soft. There is no blur, no gradient, no rounded corner, no monospace, and no emoji.

The direction explicitly refuses two things and the refusals are visible in the markup. It refuses the AI-chat empty state — no centred avatar, no greeting, no suggestion chips above the fold, and on arrival no bottom-pinned composer. It refuses the navy government portal that would be the predictable opposite. One note on the record: PRODUCT.md carries a volunteered "bright, soft, friendly" constraint from 2026-08-04; the build delivered bright and legible but deliberately *not* soft, because a soft treatment cannot make HIGH_RISK land. Where they disagree, the build is the system.

**Key Characteristics:**
- Saturated CMYK fields on warm paper — colour is the ground, never a tint
- Anton at shouting scale with a hard offset shadow; Archivo for everything else
- Square corners and 2px ink keylines everywhere; zero radius is a rule, not a default
- Depth is offset ink, never blur — struck, not lifted
- Printed texture on large fields and display type only, never behind body copy
- One drawn icon family, 24px grid, round caps — including the three verdict marks
- Tuned for a cheap Android phone in outdoor daylight

## Colors

Four saturated printing inks on a warm paper stock, with a warm near-black standing in for ink; nothing here is a tint of grey and nothing is pure `#000`.

### Primary
- **Tarp Yellow** (`#f5c518`): The banner stock and the default surface. It owns the entire first viewport, the user's own speech strips, every call-to-action and `tel:` link, and the bottom-pinned composer bar. Ink type sits directly on it, never paper type.
- **Warm Paper** (`#fff8ec`): The reading surface. `body` background, every card interior, and the text colour used *on* saturated fields. Anything meant to be read at length is on paper.

### Secondary — the verdict fields
Three ground colours, each with a darker mate used only as the display type's offset shadow. They are never used as tints, borders, or accents on neutral: a verdict colour appears as a full-bleed field or not at all.
- **Signal Red** (`#c8210f`) / **Deep Red** (`#97180a`): HIGH_RISK. Also the CRITICAL tier chip on an evidence row and the BABALA chip on the registry-contradicts-post note.
- **Burnt Orange** (`#b4560a`) / **Deep Orange** (`#8a4108`): CAUTION. Also the WARNING tier chip. Chosen over amber because amber-on-yellow was unreadable — which is what forced fields over badges in the first place.
- **Deep Green** (`#0e6b52`) / **Deeper Green** (`#0a4f3d`): VERIFIED. Also the one inline mark on a matched job order.

### Neutral
- **Print Ink** (`#1a1614`): All primary body text, every keyline, every block shadow, the header band, the send button, and the armed-chip fill. A warm near-black, never `#000`.
- **Soft Ink** (`#4a423c`): Bantatay's spoken words, footer copy, secondary annotations.
- **Faint Ink** (`#6b6058`): Printed labels and input placeholders. Measured at 4.6:1 on paper — the floor, not a guess.
- **Paper Edge** (`#eadfcb`): The 2px dashed rule that divides sections inside a card. Its only job.
- **Grommet Brass** (`#8c8378`): The eyelet ring. Hardware, never type or surface.

### Named Rules

**The One Banner Rule.** Only the deterministic engine gets a colour field. A coloured verdict banner renders solely for `checkAgency` / `scorePost` output, and exactly one per card. A registry verdict nested inside a job-post scan is rendered *colourless* (ink keyline on paper) — a green mark inside a HIGH_RISK card argues against the warning the card exists to deliver, which is precisely the misread the impersonation scam engineers.

**The Unadjudicated Rule.** No verdict means no colour. Escape hatches — unanalyzable, quota exhausted, rate limited, not a job post — get a plain ink header band. Those states must never look adjudicated.

**The Triple-Carry Rule.** Verdict meaning never rides on colour alone. Every verdict carries a colour field *and* the word *and* a drawn mark, so it survives greyscale, colour-blindness, and a screen read in sunlight.

**The Info Stays Ink Rule.** The Info severity tier is ink-on-paper with a keyline, never a colour chip. Info surfaces but does not score; giving it a colour would score it in the UI.

**The Real-Surface Contrast Rule.** Contrast is measured against the surface a colour actually sits on, not against white. `#6b6058` is recorded as 4.6:1 *on paper*; that is the form the check takes.

## Typography

**Display Font:** Anton (400 only, with Arial Narrow fallback)
**Body Font:** Archivo (with `ui-sans-serif, system-ui`)
**Label Font:** Archivo — small, bold, tracked, uppercase. There is no third face and no mono.

**Character:** Anton is a single-weight condensed poster face; it fits a long Tagalog sentence across a two-metre banner and does nothing else well, which is exactly the job. Archivo was drawn for signage and high-performance print legibility — the same job a tarp does — so it carries body copy, forms, and the small tracked labels that a lesser system would have set in monospace.

### Hierarchy
- **Display** (Anton 400, `clamp(3.1rem, 15vw, 7rem)` → `clamp(7rem, 9.5vw, 9.5rem)` at `lg`, line-height 0.96, tracking -0.01em, uppercase, `text-wrap: balance`): The arrival shout only. One line, capped at ~16ch, set to *fill* the field rather than to fit — a polite headline in a full-viewport yellow section reads as an empty rectangle with a sentence in it. It carries the misregistration signature.
- **Headline** (Anton 400, 2.1rem / 2.6rem `sm` / 3.4rem `lg`, line-height 0.92, uppercase): The verdict word on its banner, paired with its drawn mark and the offset shadow in the verdict's deep mate.
- **Title** (Anton 400, 1.5rem → 2.4rem `lg`, line-height 0.95, uppercase): The matched agency's name inside a record, the header wordmark (1.05rem), and KB topic headings.
- **Body** (Archivo 500, 0.95rem, line-height ~1.6; card interiors step to 1.05rem at `lg`): All reading copy, messages, verdict explanations. Base `body` line-height is 1.55.
- **Body small** (Archivo 400, 0.88–0.92rem): Evidence rows, registry fields, list items.
- **Footnote** (Archivo 400, 0.75rem): The mandatory result footer.
- **Label** (Archivo 700, 0.7rem, tracking 0.12em, uppercase): Section labels inside a card, the "or choose here" line.
- **Label micro** (Archivo 700, 0.6rem, tracking 0.14em, uppercase): Tier chips, the tarp's lower-matter field labels, the header's persona tag.

### Named Rules

**The No Monospace Rule.** A tarp has printed labels, not code. Small tracked Archivo caps do every job monospace would have done — field labels, tiers, data stamps. There is no monospace anywhere in the system.

**The No Kicker Rule.** No tracked all-caps string above a heading, and none below it either. Relocating a kicker under the body is the same defect in a new position. The banner says what the verdict is and the reasons name the query; a label restating the heading adds nothing and truncates.

**The Shout Is Rationed Rule.** Anton appears in exactly four places: the arrival line, the verdict word, a record's own name, and the wordmark. It never sets body copy, never sets a label, and never appears at reading size.

## Layout

Single column, mobile-first, `min-h-dvh`. Three container widths, all centred: `max-w-2xl` for the header and the message stream (widening to `max-w-4xl` at `lg`), and `max-w-5xl` for the arrival tarp at `lg`. Only two breakpoints are in play — `sm` (640px) and `lg` (1024px); there is no `md` step anywhere in the build.

The arrival viewport is constructed, not hoped for. One section holds `min-h-[calc(100dvh-3.25rem)]` (the viewport minus the sticky header) with `justify-between`: the shout and its one-line instruction pin to the top, the composer and the tarp's lower matter pin to the bottom in the thumb zone. Everything else — the chip row, the persona note, the disclaimer — falls below the fold by construction. `dvh` rather than `vh` so an open mobile keyboard shrinks the field correctly.

Once a conversation starts the geometry changes: the header goes compact, the composer un-nests from the tarp and pins to the window bottom on its own yellow bar with `pb-[max(0.75rem,env(safe-area-inset-bottom))]`, and the stream scrolls between them at `space-y-6`.

Spacing rhythm is base-4 with a small working set: `0.5rem` inside chips and slips, `0.75rem` for the gap under a dividing rule, `1rem` for the gap above one, `1.5rem` between messages, `2rem` for below-fold blocks. Card interiors run `1rem` horizontal (`1.25rem` at `sm`, `1.75rem` at `lg`) with an asymmetric vertical — tighter above (`0.875rem`) than below (`1.25rem`), because the banner already supplies the top weight. Grommets sit `0.55rem` in from each corner, and any header band that shares a card with them takes `2.25rem` of side padding to clear the top pair.

Every tap target clears 44px: chips, the textarea, both composer icon buttons, and every `tel:` and external link rendered as an action.

**The Constructed Fold Rule.** The first viewport's contents are fixed by measurement (`calc(100dvh - header)` plus `justify-between`), never by ordering and luck. If something must be above the fold, it is in that section; if it must be below, it is outside it.

## Elevation & Depth

There are no soft shadows in this system and no blur of any kind. Depth is printed: a solid offset block in ink, the way a banner sits a few millimetres off a wall, and a hairline lift on hover. Every shadow value in the build has a blur radius of exactly `0`. Layering is done with keylines and grounds, not with elevation.

### Shadow Vocabulary
- **Card block** (`box-shadow: 4px 4px 0 #1a1614`): Every result card, paired with its 2px ink border. The signature object shadow.
- **Speech block** (`box-shadow: 3px 3px 0 rgb(26 22 20 / 0.16)`): The user's own tarp-yellow speech strip. Lighter than a card because speech is not an object.
- **Chip block** (`box-shadow: 2px 2px 0 rgb(26 22 20 / 0.14)`, armed: `0.25`): Quick-action chips. The armed state deepens the shadow and inverts to ink-on-paper.
- **Shout shadow** (`text-shadow: 0.035em 0.038em 0 var(--shout-shadow, rgb(0 0 0 / 0.22))`): Display type printed twice. Em-relative so it scales with the type; a verdict banner overrides `--shout-shadow` with its own deep mate.
- **Misregistration** (`text-shadow: -0.012em -0.008em 0 rgb(200 33 15 / 0.5), 0.035em 0.038em 0 …`): Sub-pixel, single-sided colour fringe on the arrival shout only. Single-sidedness is what makes it read as a press fault rather than a glow.
- **Focus ring** (`outline: 3px solid #1a1614; outline-offset: 2px`): Ink, because ink is the one colour visible on every field in the palette.

### Named Rules

**The Struck-Not-Blurred Rule.** Blur radius is `0` in every shadow, without exception. If depth is needed, offset solid ink. A soft or translucent shadow anywhere in this system is a defect.

**The Lift Is One Pixel Rule.** Pressable things respond with `hover:-translate-y-px` and nothing else — no scale, no colour shift, no shadow growth.

## Shapes

Zero radius, universally. Cards, chips, buttons, inputs, speech strips, tier chips, the avatar's frame — all square. The single exception in the entire build is the `2px` radius on the focus ring, which exists so a 3px outline doesn't cut a hard corner across a keyline.

Borders are `2px solid` ink and they are the primary structural device: they define cards, buttons, chips, slips, the header band, and the boundary between the arrival tarp and everything below it. Internal division uses rules, not containers: `2px dashed #eadfcb` between sections of a card, `2px solid #1a1614` for the heavier break above a report block, `border-t-2 border-ink/25` under the tarp's lower matter.

Grommets are the recurring silhouette — four radial-gradient rings (11px, paper centre, brass ring) painted as an overlay pseudo-element at `z-index: 1` so all four sit in front of whatever the card paints, including an opaque verdict field. Icons are one drawn family on a 24px grid, `stroke-width` 1.75 (2.2–2.4 for the three verdict marks), round caps and joins, `fill: none`, `currentColor`.

**The No Nested Boxes Rule.** A section of a card is a dashed or solid rule, never a keylined container inside a keylined card. Two containment levels is the ceiling — card, then ruled sections. Nested cards are always wrong, most of all at the moment a reader is deciding whether to send money.

**The No Coloured Edge Rule.** A thick accent border on one edge of a block is the clearest tell of a generated interface, and nothing in a tarpaulin has one. Severity is carried by a printed tier chip instead.

## Components

### Buttons
- **Shape:** Square (`0` radius), 2px ink keyline on every variant.
- **Action / link button:** Tarp yellow ground, ink text, bold, `min-height: 44px`, `0.75rem` horizontal padding, trailing 15–17px drawn icon. Used for `tel:` calls, the DMW verify link, and KB source links.
- **Send:** 44×44 solid ink block with a paper up-arrow. Disabled reads as an *empty* paper box with 35%-alpha ink, not a dimmed ink block — ink at reduced alpha over yellow renders as a muddy olive that looks broken rather than inactive.
- **Attach:** 44×44 paper box with an ink paperclip; the file input is `sr-only` inside the label, and the label carries a `has-[:focus-visible]` ring so keyboard focus is visible.
- **Hover / Focus:** `translateY(-1px)`; 3px ink outline at 2px offset.
- **Dismiss (armed chip / attached image):** A compact ink or paper chip with a trailing close mark and an `sr-only` name.

### Chips
- **Style:** Paper ground, ink text, 2px ink keyline, 2px offset block shadow, bold 0.85rem, `min-height: 44px`.
- **State:** Armed inverts to ink ground / paper text with a deeper shadow and sets `aria-pressed`. Arming a chip also focuses the composer, so the tap visibly does something. Disabled drops to 45% opacity.

### Cards / Containers
- **Corner style:** Square (`0`).
- **Background:** Paper interior. The top band is either a verdict colour field or solid ink — never paper.
- **Shadow strategy:** Card block (`4px 4px 0` ink); see Elevation.
- **Border:** 2px solid ink on all sides, plus a 2px ink rule under the top band.
- **Internal padding:** `0.875rem 1rem 1.25rem`, stepping to `1.25rem` sides at `sm` and `1.75rem 1.75rem 1.75rem` at `lg`.
- **Grommets:** All four corners, always.

### Inputs / Fields
- **Style:** Paper ground, 2px ink keyline, square, medium-weight 0.95rem ink text, `min-height: 44px` growing to a `180px` (~8 line) cap. Placeholder is faint ink at normal weight.
- **Focus:** 3px ink outline at 2px offset — explicit, not `outline-none`.
- **Disabled:** 60% opacity.
- **Field display (read-only data):** A tracked micro-caps label in faint ink stacked directly above its bold ink value, in a 2-column grid (3 at `lg`). This is the printed-form pattern that replaced every monospace key/value.

### Navigation
- **Style:** Sticky ink band (`top-0`, `z-10`) with a 2px ink bottom border, `0.5rem 0.75rem` padding. Anton wordmark in tarp yellow at 1.05rem with a tracked micro-caps persona tag beside it at 70% paper, and the standing "Hindi opisyal na DMW tool" disclaimer right-aligned in micro-caps at 80% paper. It is the one element present in every state.

### Verdict Banner (signature)
The system's centre. A full-bleed field of the verdict's own colour spanning the card's full width, `1rem` padding (`1.25rem` at `lg`), a 2px ink rule beneath it, textured with both press signatures, carrying a 30px drawn mark (36px at `lg`) beside the verdict word in Anton at 2.1–3.4rem with the offset shadow set to the verdict's deep mate. Rendered as the card's `h2` so it is the first waypoint a screen-reader user lands on, with an `sr-only` spoken sentence ahead of the `aria-hidden` visual pair. It enters with `banner-drop`: `translateY(-0.5rem) scaleY(0.94)` → rest over 340ms on `cubic-bezier(0.16, 1, 0.3, 1)`, decelerating hard with no overshoot — a tarp dropping and settling when the last corner is tied. Never opacity: the verdict must be legible from the first frame even if motion fails.

### Verdict Inline (signature)
A nested registry verdict inside a scan: paper ground, 2px ink keyline, micro-caps ink text, prefixed with its own label. Deliberately colourless. See The One Banner Rule.

### Evidence Row (signature)
A verbatim quote from the post, printed as a ruled band of the same tarp — `border-top: 2px dashed #eadfcb`, suppressed on the first child. Above the quote sits the severity tier chip: risk ground for CRITICAL, caution ground for WARNING, keylined paper for INFO, all in micro-caps. No coloured edge, no keylined slip, no nesting.

### Typing Indicator (signature)
A tarp-yellow keylined strip reading "Sinusuri…" in micro-caps, running `flap`: `skewY(0deg → -1.2deg → 0deg)` over 1.6s, `ease-in-out`, infinite. The tarp flexing in wind — not three bouncing dots.

### Persona Avatar (signature)
A 48-unit square SVG with a 3px ink keyline on a tarp-yellow ground: flat spot colours, hard keyline, no gradient and no soft shading, the way a tarpaulin prints a figure. A salakot brim reads instantly to this audience and is literally a thing that shelters you. It appears below the fold and inside no card.

### Result Footer (signature, mandatory)
Required on every result. A dashed rule, then the freshness stamp leading (record date + last-synced date) with the official DMW verify link inline, then the hotline as a `tel:` link — footnote size, soft ink. On a HIGH_RISK verdict a heavier solid ink rule opens a report block whose hotlines are full 44px tarp-yellow call buttons with a drawn phone mark, each with an `sr-only` "tumawag". A number you cannot tap is not a route to action.

## Do's and Don'ts

### Do:
- **Do** give a verdict a full-bleed field of its own colour (`#c8210f` / `#b4560a` / `#0e6b52`) with the word in Anton and a drawn mark beside it — colour, word, and mark together.
- **Do** render exactly one coloured banner per card, and only for deterministic-engine output.
- **Do** give any state without a verdict a solid ink header band instead of a colour field.
- **Do** divide a card with a `2px dashed #eadfcb` rule (or `2px solid #1a1614` for a heavier break).
- **Do** keep every shadow at blur radius `0` — `4px 4px 0` for cards, `2px 2px 0` for chips, `3px 3px 0` for speech.
- **Do** put four grommets on every card, painted as an overlay at `z-index: 1` so they sit in front of an opaque band.
- **Do** set small labels as bold Archivo caps tracked 0.10–0.14em in faint ink, stacked above their value.
- **Do** keep every tap target at `min-height: 44px` and every focusable control on the 3px ink outline.
- **Do** apply `.stock`, `.halftone`, and `.misregister` to large colour fields and display type only.
- **Do** measure contrast against the surface the colour actually sits on.
- **Do** ration Anton to the arrival line, the verdict word, a record's name, and the wordmark.

### Don't:
- **Don't** use a rounded corner anywhere — `0` radius is universal; the 2px focus-ring radius is the only exception.
- **Don't** blur a shadow, tint a verdict colour, or use a verdict colour as an accent on neutral.
- **Don't** put a coloured verdict mark inside another card's body — a nested registry verdict is colourless.
- **Don't** give the INFO tier a colour; it surfaces but never scores.
- **Don't** nest a keylined box inside a keylined card. Sections are rules, not containers.
- **Don't** put a thick coloured border on one edge of a block.
- **Don't** set a kicker, eyebrow, or tracked all-caps restatement above *or* below a heading.
- **Don't** use monospace for anything, including data, codes, and dates.
- **Don't** use an emoji as iconography — the three verdict marks and every UI glyph come from the drawn 24px family.
- **Don't** put texture behind body copy; this audience reads on cheap phones in daylight.
- **Don't** animate a verdict's opacity, or let any state depend on motion completing.
- **Don't** dim an ink control over yellow to show disabled — empty the box instead.
- **Don't** reintroduce the AI-chat empty state: no centred avatar, greeting, or chip row above the fold, and no bottom-pinned composer on arrival.
