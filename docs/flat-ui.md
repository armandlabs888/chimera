# Beam flat UI & sticky section stacking

Concise migration guide for the cinematic flat dark system (post-landing PR #4).

## Design tokens (`app/globals.css`)

| Token / class | Role |
| --- | --- |
| `--color-beam-base` `#0c0c0e` | Canvas |
| `--color-beam-ink` `#101014` | Opaque section / list surface (occludes under-stack content) |
| `--color-beam-raised` / `--color-beam-panel` | Subtle elevation steps via tone, not card chrome |
| `--color-beam-amber` `#e8a54b` | CTA, focus, selected |
| `--beam-nav-offset` | Sticky section top clearance under landing nav |
| `--beam-section-depth` | Soft **section** shadow only (not card elevation) |
| `.beam-ambient` | Decorative radial glows |
| `.flat-meta` / `MetaLabel` | Tracked uppercase sans metadata |
| `.flat-surface` / `FlatSurface` | Borderless panel |
| `.flat-bento` / `FlatBento` | Soft inset highlight, no elevation |
| `.flat-row` / `FlatRow` | Interactive row — hover tint + arrow, no lift |
| `.beam-stack` | Sticky ancestor (must not use `overflow: hidden` / sticky-breaking transforms) |
| `.beam-stack-section` + `--stick` | Native `position: sticky` stack layer |

Fonts remain **Fraunces** (display) + **Outfit** (UI).

## Primitives

Module: [`src/components/flat/`](../src/components/flat/)

- `MetaLabel`, `FlatSurface`, `FlatRow`, `FlatBento`
- `StackSection` — marketing sticky layers
- `SegmentedControl`, `FilterChip`, `FlatDivider` — selection chrome with **kept** boundaries

Import:

```ts
import { StackSection, FlatRow, MetaLabel, SegmentedControl } from '@/components/flat'
```

Shared form/actions stay in [`src/components/ui.tsx`](../src/components/ui.tsx) (`Button`, `Field`, `TextInput`, …). Inputs, focus rings, selected chips, and segmented controls **keep** discernible edges.

## Compose landing stacks

```tsx
<main className="beam-stack">
  <StackSection stick zIndex={1} tone="base">…hero…</StackSection>
  <StackSection stick zIndex={2} tone="ink">…proof…</StackSection>
  <StackSection stick={false} zIndex={3}>…tall grid…</StackSection>
</main>
```

Later sections use higher `zIndex` and opaque `tone` so they **occlude** earlier layers while scrolling.

## Intentional sticky exceptions

| Surface | Sticky? | Why |
| --- | --- | --- |
| Landing hero, how-it-works, paths, final CTA | Yes (desktop, motion-ok) | Viewport-safe marketing layers |
| Landing categories, trust/FAQ, footer | No | Tall / expandable — sticky would trap or clip |
| Mobile (`<768px`) | No | Viewport-safe fallback is static flow |
| `prefers-reduced-motion` | No | Static readable stack |
| Browse / Post / You / messages / forms / long lists | No | Transactional ordinary scroll |

Do **not** pin every card. App chrome sticky nav/header is separate and stays above content (`z-30`/`z-40`).

**Gotcha:** do not put Tailwind `relative` on the same node as `StackSection` with `stick` — utility `position` can override sticky. Put positioning wrappers inside the section.

## Migrate a heavy card

1. Drop `border-beam-line` + `shadow-*` + gray boxed chrome.
2. Prefer `FlatRow` / divide-y lists or `FlatBento` for media tiles.
3. Use typography + spacing for hierarchy; amber only for CTA/active/focus.
4. Keep borders on **inputs**, **selected** states, **dialogs**, and **segmented** controls.

## Accessibility

- Preserve `:focus-visible` amber rings (global + `.flat-row`).
- Touch targets ≥ 44px (`.touch-target`).
- Contrast over ambient glows: opaque `ink`/`base` section fills.
- Reduced motion disables sticky + landing blur animations.

## Test commands

```bash
npm run lint
npm run build
npm run start   # then:
npm run test:smoke
npm run test:live   # when Supabase env + seeded users available
```

Smoke asserts landing sticky computed styles (desktop), static mobile/reduced-motion, CTA/category links, and no horizontal overflow — **no screenshots**.
