# docs/DESIGN.md — Marga Design System Reference

Direction: "A surveyor's field notebook meets a municipal control room."
Warm, tactile, confident, data-dense but calm.

---

## 1. Identity

**Wordmark:** "Marga" in Fraunces display serif, with a dashed road-centreline under it.
**Logomark:** Two converging lane lines forming an M, or a reflective road-stud. Simple SVG.
**Tagline:** "Every road, in the order it needs you."

### Banned patterns (§11.1 — these scream "AI template")
- Purple/indigo/blue-violet gradients
- Glassmorphism & frosted blur cards
- Neon glows or gradient text
- Emoji as icons or bullets
- Centered-everything hero layouts on tool screens
- Three identical rounded feature cards in a row
- Pill shapes > 8 px radius
- Inter / Roboto / Arial / system-ui as the visible typeface
- "Welcome back 👋" copy
- Buzzwords: unlock, seamless, supercharge, leverage, revolutionise, next-gen
- Generic Lucide + shadcn default look
- Perfectly uniform spacing with no hierarchy

---

## 2. Colour Tokens

### Light mode — "Daylight Survey"
```
--paper      #F3EFE6   page background
--surface    #FBF9F4   card / panel background
--ink        #1B1A17   primary text
--ink-muted  #5F5B52   secondary text
--rule       #D9D3C5   dividers / borders
--asphalt    #2B2D2F   nav rail, dark blocks
--marking    #F2C230   road-marking yellow, highlights, active indicator
--accent     #E8590C   primary actions (safety orange)
--ok         #2F7D5B   repaired / verified
```

### Dark mode — "Night Patrol"
```
--paper      #14161A
--surface    #1C1F24
--ink        #ECE8DD
--ink-muted  #9B9589
--rule       #2E3138
--asphalt    #0D0F12
--marking    #F2C230   (unchanged)
--accent     #F06B2A   (lightened for contrast ≥ 4.5:1)
--ok         #3D9E72   (lightened)
```

### Severity scale (colour-blind-safe + redundant shape)
```
Low      #5E8C61  ●  circle     score 0–24
Medium   #D9A21B  ◆  diamond    score 25–49
High     #D9531E  ▲  triangle   score 50–74
Critical #B3202A  ⬢  hexagon    score 75–100
```

### Semantic
```
--info     #4A7FA5
--warning  #D9A21B   (same as severity-medium)
--error    #B3202A   (same as critical)
--success  #2F7D5B   (same as ok)
```

---

## 3. Typography

| Role | Family | Usage |
|------|---------|-------|
| Display | Fraunces (variable, opsz axis) | Headlines, big number labels — sparingly |
| UI / body | Instrument Sans | All body text, UI labels |
| Data | JetBrains Mono | IDs, coordinates, timestamps, metrics |

### Type scale (rem, base 16 px)
```
xs   0.75rem  / 12px   data labels, captions
sm   0.875rem / 14px   secondary UI text
base 1rem     / 16px   body
md   1.25rem  / 20px   sub-headings
lg   1.75rem  / 28px   section headings
xl   2.75rem  / 44px   display numbers (KPI)
2xl  4rem     / 64px   hero numbers
```

Rules:
- `text-wrap: balance` on headings
- `font-variant-numeric: tabular-nums` on all data display
- `font-optical-sizing: auto` on Fraunces

---

## 4. Shape & Texture

- Border radius: **4–6 px** only. Never > 8 px (our "pill" cap).
- Borders: 1 px, tinted with `--rule`.
- Shadows: hard, small offset — `2px 2px 0 rgba(27,26,23,.08)` NOT soft blurry drops.
- Paper grain: SVG `feTurbulence` at 3–4 % opacity on `--paper` background areas.
- Contour-line SVG in hero/empty states.

---

## 5. Spacing

Base grid: 8 pt (0.5 rem increments).
Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 px.

Layouts are **deliberately asymmetric**: one dominant column, one narrow notes column.
Big numbers against small captions. Align to baselines.
Let some elements break the grid slightly: rotated stamps ±2°, tags overhanging image corners.

---

## 6. Component Patterns

### Severity stamp
Shape + colour + word. Slightly rotated (±2°). Ink-bleed border.
Stamps down with 180 ms scale-and-settle animation when a defect is verified.

### Priority row
Rank number (big Fraunces serif) · defect thumbnail · one-line summary ·
risk meter (segmented bar, NOT donut) · status chip · tiny sparkline.

### Evidence image frame
Thin 1 px border. Mono caption bar (coordinates · date · time).
Taped-corner motif on the detail view. SHA-256 "sealed" indicator.

### Map markers
Severity shapes (●◆▲⬢), clustered with count rings.
Hover card with thumbnail.
Recurring hotspots: dashed pulsing ring (CSS only, reduced-motion safe).

### Waterfall "Why this score" chart
Direct labels (no legend). Each component is a bar. Orientation: horizontal.
Show the weight, the input value, and the contribution.

### Buttons
- Primary: `--accent` solid background, `--surface` text.
- Secondary: `--ink` outline, transparent background.
- Tertiary: text only in `--accent`.
- All: visible 2 px focus ring in `--accent` with 2 px offset.
- Disabled: 40% opacity, cursor not-allowed.

### Cards
Radius 4–6 px. 1 px `--rule` border. `2px 2px 0` shadow.
No blur. No gradient backgrounds. `--surface` background.

---

## 7. Motion

- Stamp-down on verify: 180 ms scale (1.15 → 1.0) + slight rotation settle.
- Staggered marker drop-in: 20 ms delay per marker, opacity + translateY.
- List FLIP reorder: framer-motion layout animation when risk weights change.
- Number count-up: first load of Briefing KPIs only, 600 ms.
- Progress bar road-dash: animated dashed-line stroke.
- Page transitions: ≤ 200 ms fade.
- `prefers-reduced-motion`: disable all transforms and transitions; keep opacity fades ≤ 100 ms.

---

## 8. Copy Voice (§11.8)

Slightly dry. Specific. Never buzzwords. Always real units.

| Context | Example |
|---------|---------|
| Empty | "No scans yet. Drive a road, drop the clip here, and Marga will mark what it finds." |
| Error | "Couldn't read GPS from this file. Draw the route on the map instead?" |
| Success | "14 defects found, 9 new. 3 need a human look today." |
| KPI | "4 roads slipped a grade this month." |

Use ₹ and Indian digit grouping (₹1,25,000).
Use real local names: Perundurai, Erode, NH 544 (verify from OSM).
Never invent names.

---

## 9. Accessibility

- WCAG AA minimum: contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for UI components.
- Severity never conveyed by colour alone (redundant shape + label).
- All interactive elements have visible focus states.
- Keyboard-navigable; no focus traps.
- aria-labels on icon-only buttons.
- Dark mode supported.
- Reduced-motion respected.

---

## 10. Responsive Strategy

Desktop-first (≥ 1280 px): Briefing, Map, Queue, Planner, Work Orders, Segments, Model Lab.
Mobile-first (390 px, large tap targets): Citizen portal, Capture, Review queue.
Usable at 768 px even for desktop-first screens.

---

## 11. Iconography

Phosphor Icons (regular weight), consistent size per context (20 px UI, 16 px dense, 24 px large).
Custom SVG severity shapes (●◆▲⬢) for map and stamps.
No emoji. No Lucide. No Heroicons.

---

## 12. Road Motifs (reuse across the app)

- Dashed centre-line dividers (CSS border-image or SVG)
- Road-marking yellow highlights and underlines
- Survey-stake and benchmark symbols
- Contour-line backgrounds in empty/hero states
- "Inspection tag" labels (slightly rotated, tab-corner die-cut shape)
- Rubber-stamp severity badges
- Coordinates in JetBrains Mono like a survey plate
- Hand-drawn circles/arrows (rough.js) for annotations in detail view and onboarding
