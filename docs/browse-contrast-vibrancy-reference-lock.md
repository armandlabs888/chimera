# Browse contrast & vibrancy — reference lock (supersedes quiet chrome)

**User correction (post-PR59):** gray fonts on white make Browse look boring and hard to see; not lively enough. This lock **supersedes** the earlier “quiet restrained chrome / personality only in hero” instruction from `browse-vibrant-empty-reference-lock.md`.

## Why the correction is substantial (not a token nudge)
- Before: secondary copy, meta, sidebar labels, filter counts, and placeholders used `#64748B` / `#94A3B8` on white — washed “disabled” look across the **populated** feed, not just empty hero.
- After: navy `#071330` primary; readable secondary `#334155`; tertiary section labels `#475569`; `#94A3B8` **only** for genuine disabled / optional placeholders; stronger blue/teal selected states, icon tiles, tinted card borders/surfaces so energy survives job cards + discovery.

## Direction
Pale blue canvas + crisp white/tint surfaces; **energetic coherent blue→teal** through chrome, filters, cards, and empty hero — still enterprise geometry (cards ~10–12px, controls 8px), no neon confetti or gradients on every card.

## Tokens
| Role | Value | Notes |
|------|-------|-------|
| Ink primary | `#071330` | Body, controls, headings |
| Ink secondary | `#334155` | Descriptions, meta, help |
| Ink tertiary | `#475569` | Section labels, counts |
| Disabled / faint placeholder | `#94A3B8` | Disabled only; avoid for important UI |
| CTA / selected | `#1D5CE5` | Hover `#1649BD` |
| Teal accent | `#0D9488` | Supporting emphasis (tiles, discovery) |
| Surface tint | `#F0F7FF` / border `#C7D7F0` | Supporting cards & chrome |
| Canvas | `#F4F8FD` | Unchanged |

## Preserve
Roles, no map/radar/bell, listing When/photos/categories, empty hero signature artwork, crisp corners.

## Empty hero text a11y
White copy lives on an **intentional opaque navy text panel** (`bg-[#071330]`, `data-testid="browse-empty-text-panel"`). Gradient energy remains around/beside the panel + artwork. Do not claim compliance from translucent scrims or “text stays on blue stop” assumptions. Raw white/`#2DD4BF` remains unsafe. Pixel-sample worst-case under live text at each breakpoint.

## Rejects
All-text equally bold; multicolor noise; neon glow; map motifs; global `* !important` restyles; bogus WCAG `ok:true` from non-composited / assumed backgrounds.

## Measurement
See `scripts/browse-contrast-vibrancy-qa.mjs`: composited ancestor backgrounds for solid surfaces; element PNG worst-luminance pixel samples for hero text across desktop/tablet/mobile.
