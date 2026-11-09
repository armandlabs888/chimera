# Landing page v2 — decision ledger

**Brief:** Implement approved Landing v2 HTML mockup + PNG locks on `/` from `main` after PR #70.

**Sources:** `uploads/index_8c14.html`, desktop/mobile hero + full PNGs. Refero unavailable.

## Decisions

| Decision | Why |
|----------|-----|
| Floating glass nav (`variant="float"`) on landing only | Match mockup; guest `/browse` keeps flat `LandingNav` light chrome so Browse locked viewport is untouched |
| Atmospheric Beam-blue hero (CSS radials + noise + grid) | Match mockup; no purple/pink |
| Working search retained | Same q/category/neighborhood → `/browse` routing |
| Static Browse preview with SAMPLE labels | Illustrative only; `role="img"`; not live data; no fake ratings/prices |
| Preview photos use unused lifestyle/hero assets | Keep Popular + Available image uniqueness on the page |
| Compact Popular 3-up (no filter chips) | Match v2 mockup; Other stays on custom navy tile |
| How it works → static 3-step tinted band | Match v2; interactive tab demos retired |
| Available 3×2 six-grid, no Other | Unchanged product rule |
| Why Beam split + closing CTA centered | Match mockup |
| Navy footer layout unchanged | Scope |

## Deviations

1. **Beam logo** — keep existing `BeamWordmark` (not generic lowercase text-only).
2. **Preview photos** — different assets than Available grid to preserve uniqueness smoke lock (mockup reused avail-* URLs).
3. **Popular cleaning** — still orange-crew `avail-house-cleaning.jpg` (prior Paper uniqueness lock vs kitchen shot in Available).
4. **Guest browse header** — not floating; floating is landing-route only.
5. **How-it-works interactive demos** — removed; QA updated to static steps.

## Test evidence

See PR body / CI after push.
