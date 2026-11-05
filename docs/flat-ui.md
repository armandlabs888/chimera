# Beam UI system — presentable marketplace polish

Short comparison + migration notes after the Airbnb/Linear-directed light redesign.

## Reference roles (facts vs proposed)

| Source | Role | Measured / observed (HTML/CSS research) | Beam adaptation |
| --- | --- | --- | --- |
| [Airbnb](https://www.airbnb.com) | **Primary** — local marketplace clarity, human-scale actions | Proprietary **Airbnb Cereal VF** (do **not** copy); restrained accent; radius ladder ~4–24; gray text/subtle borders | Marketplace info hierarchy (title dominant, meta secondary, compact CTAs). Light canvas. Own Beam amber accent. |
| [Linear](https://linear.app) | **Secondary** — type/control discipline only | **Inter Variable**; UI sizes ~12/13/14/15/17; titles ~17/20/24/36 | Inspired **proposed** Beam scale (below). Not a dashboard layout clone. |
| [Notion](https://www.notion.com) | Principle only | Named centralized typography tokens (exact values not extracted) | Central tokens in `app/globals.css` + `.type-*` utilities |
| Refero | Unavailable | `NO_SUBSCRIPTION` | Not used; no claimed screen audits |

**Proposed Beam type scale (not claimed as Airbnb/Linear measurements):** meta 12/16 · secondary 13/18 · body 15/22 · intro 17/26 · h3 20/28 · h2 24/32 · app h1 32/40 · landing hero ~36–56 (`clamp`).

**Buttons (proposed):** compact ~36 desktop visual (`btn-compact`), standard ≥44 hit area (`touch-target`), primary hero ≤48. Radius 8–12. Content max ~1152px (`72rem`).

## Font

- **Geist Sans** via `next/font/google` → `--font-geist` (weights via variable font).
- Replaces Fraunces + Outfit. Single family for UI + headings.

## Semantic color tokens (`app/globals.css`)

| Token | Role |
| --- | --- |
| `beam-base` / `beam-raised` | White main surfaces |
| `beam-ink` / `beam-panel` | Soft gray panels (`#f7f7f7`) |
| `beam-line` | Subtle border `#dddddd` |
| `beam-cream` | Primary text `#222` (legacy name kept for churn) |
| `beam-cream-dim` / `beam-muted` | Secondary / meta text |
| `beam-charcoal` `#0c0c0e` | Wordmark / footer band |
| `beam-amber` `#e8a54b` | CTA / focus / selected |

## Primitives

[`src/components/flat/`](../src/components/flat/) — `MetaLabel`, `FlatSurface`, `FlatRow`, `FlatBento`, `LandingSection`, `SegmentedControl`, `FilterChip`, `FlatDivider`.

[`src/components/ui.tsx`](../src/components/ui.tsx) — `Button`/`ButtonLink` sizes `sm|md|lg`, fields, badges, section headers.

## Scroll / landing layout

Most marketing content uses **standard document flow** (normal up/down scroll). There is **no** old vertical sticky stacking / slide-over overlap between content sections, and **no** wheel/touch scroll hijack or snap.

### Bounded hero → proof horizontal handoff

Desktop (`min-width: 1024px`) + `prefers-reduced-motion: no-preference` only:

- `HeroProofStage` uses a **native vertical scroll range** (~200vh) with a sticky pin and a 2-panel track.
- Scroll position sets `--hero-progress` / `translate3d` so the proof panel **enters from the right** while the navy hero exits left. Scrolling up reverses.
- After the stage, remaining sections (`#categories` onward) are ordinary vertical flow.
- **No document horizontal scrollbar**; overflow contained on the pin.
- `#how-it-works` / focus inside a panel scrolls the stage so that panel is revealed.
- If the proof panel is taller than the viewport, the stage **falls back to a vertical stack** (no clipping).

Mobile, tablet width &lt; 1024, reduced-motion, and no-JS: **vertical hero + proof stack** (full `100svh`/`dvh` hero with content-fit fallback). No scroll-linked transforms.

Hero artwork is original SVG (`HeroBeamArt`) — navy canvas, luminous blue/cyan sweep, orbits/nodes — not a screenshot background. Navy palette is **hero-bounded**; the rest of the app stays light.

- `LandingSection` remains a plain `<section>` for later marketing blocks.
- Conventional sticky **nav** (dark over hero, light afterward) uses `scroll-mt-*` so anchors are not obscured.
- Former `StackSection` / `.beam-stack*` vertical overlap CSS stay removed.

## Protected chrome

Keep discernible borders on inputs, selected chips, segmented controls, focus rings.

## Test commands

```bash
npm run lint
npm run build
npm run start
npm run test:smoke
npm run test:live   # when env + seeded users available
```

Smoke checks light theme (post-hero), control sizing, **bounded horizontal hero→proof geometry** on desktop (down/up, no page x-overflow), vertical stack on mobile/reduced-motion, anchors/focus, category links — **DOM/computed-style only, no screenshots**.
