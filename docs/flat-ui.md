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
| `beam-charcoal` `#0c0c0e` | Wordmark emphasis |
| `beam-amber` `#e8a54b` | CTA / focus / selected |

## Primitives

[`src/components/flat/`](../src/components/flat/) — `MetaLabel`, `FlatSurface`, `FlatRow`, `FlatBento`, `LandingSection`, `SegmentedControl`, `FilterChip`, `FlatDivider`.

[`src/components/ui.tsx`](../src/components/ui.tsx) — `Button`/`ButtonLink` sizes `sm|md|lg`, fields, badges, section headers.

## Landing layout (conventional SaaS)

Public marketing is a **normal light SaaS page** with ordinary **vertical document scroll** on all breakpoints and reduced motion:

1. Sticky light header (Beam, section anchors, Sign in, Post)
2. Modest centered hero — “Help nearby. Done today.” + Post / Browse
3. How it works — labeled **Example** request → offer → message
4. Categories grid → real `/browse?category=` links
5. Requester / helper paths
6. Trust / FAQ + Safety link
7. Final CTA + light footer

No full-viewport forced sections, horizontal tracks, sticky content pinning, scroll hijack/snap, dramatic beam artwork, dark hero/footer bands, or overlapping stacks. Former `HeroProofStage` / `HeroBeamArt` / `.beam-stack*` experiments are removed.

`LandingSection` is a plain `<section>`. Anchors use `scroll-mt-*` under the sticky nav. Interior app routes keep the same light marketplace chrome.

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

Smoke checks light theme throughout, control sizing, **non-sticky vertical scroll** (down/up), no page x-overflow, mobile CTA fit, reduced motion, category links — **DOM/computed-style only, no screenshots**.
