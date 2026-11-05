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

Light theme is intentional (Airbnb-directed clarity). No dark cinematic gradients as the main canvas.

## Primitives

[`src/components/flat/`](../src/components/flat/) — `MetaLabel`, `FlatSurface`, `FlatRow`, `FlatBento`, `StackSection`, `SegmentedControl`, `FilterChip`, `FlatDivider`.

[`src/components/ui.tsx`](../src/components/ui.tsx) — `Button`/`ButtonLink` sizes `sm|md|lg`, fields, badges, section headers.

## Sticky stacking (refined)

Kept for marketing desktop + motion-ok sections (`hero`, `how-it-works`, `paths`, final CTA).

**Change vs prior:** removed forced `min-height: ~100dvh` that made sections look empty. Sticky is content-sized with a light section depth shadow.

Still **not** sticky: categories, FAQ, app routes, mobile, `prefers-reduced-motion`.

## DOM investigation notes

- “Doubled” headline in HTML extraction was **`sr-only` + visible text**, not a visual duplicate. Landing h1 is now a single visible string.
- Tall empty-feeling sections were largely **sticky min-height**, not missing content — addressed above.

## Protected chrome

Keep discernible borders on inputs, selected chips, segmented controls, focus rings. Do not strip those for “flatness.”

## Test commands

```bash
npm run lint
npm run build
npm run start
npm run test:smoke
npm run test:live   # when env + seeded users available
```

Smoke checks light theme, control sizing bounds, sticky without huge min-heights, reduced-motion, overflow, category links — **no screenshots**.
