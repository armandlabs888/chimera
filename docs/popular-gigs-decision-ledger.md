# Popular gigs — decision ledger

**Brief:** Replace the framed Browse preview under the landing hero with a location-aware **Popular gigs near [city]** inventory grid (approved mock). Real open jobs only.

## What changed

1. Removed `[data-testid=landing-browse-preview]` from the hero.
2. Hero bottom padding → **96px desktop / 64px mobile**. Last layer of the hero gradient fades to `#fff` (no empty blue puddle).
3. New `#popular-gigs` section immediately after the hero. Popular services (`#categories`) drops the `-mt-4` tuck and uses **56px** top padding (40px on small screens).

## Ranking

Open requests only. Within **25 miles** of the browse origin when lat/lng exist (same pin/profile origin as Browse). Jobs missing coordinates still pass when an origin is set (matches Browse radius behavior). If there is no origin (`Nearby`), all open jobs are eligible.

Score per job:

- `3 * log1p(offerCount)` — `publicOfferCount` when present, else non-withdrawn offers
- `2 * recency` — soft decay over 14 days
- `+ proximity` — closer jobs within the radius score higher

Sort by score desc, then `createdAt` desc. Cap at **10**. Never pad with samples.

## Location

Uses `useBrowseLocation` / `beam-browse-location-v1` (browse-only pin; does not write profile city). The tinted city chip calls `requestBrowseLocationPicker()` and mounts `BrowseLocationDialogHost` on the marketing page so guests can set a city without signing in. Chip label = origin city (or first segment of the location label), else **Nearby**.

Demo seed defaults to **East Austin** (Alex). Production Armand profiles resolve to **San Jose** when that is the saved/profile city. Subtext is `Everyday jobs neighbors post around {city}.` — not the mock’s fixed “South Bay” line.

## Photos

Same cover rule as Browse v3: `normalizeListingImages` → `listingCoverImage`. Empty cover → `BrowseCategoryThumb` (Beam tint + category icon). Mockup Pexels JPGs are **not** shipped.

## Empty / sparse

- 0 jobs → honest empty state with Post a task + Browse jobs.
- 1–9 jobs → sparse grid (no fillers).
- 10 jobs at 768–1023 → CSS hides the 10th card to avoid a 3-3-3-1 orphan; “See all jobs” covers the rest. Mobile shows all 10 again (2×5).

## Links

- Card → `/browse?job={id}` (Browse v3 drawer).
- See all → `/browse`.
- Mobile navy button → `See all jobs near {city}` → `/browse`.
- Footer row keeps **Need something different? Post a task →**. Omits the mock’s “Design preview — Sample listings…” label.

## Deviations from the mock

| Item | Choice |
|------|--------|
| Sample / design-preview footer | Omitted — live inventory only |
| Fixed San Jose + South Bay copy | Location-aware from browse origin |
| Mock Pexels photos | Not used; real listing covers or category thumbs |
| Hourly `$35/hr` tutoring sample | `budgetType` is `fixed` \| `open` in product; formatter still prints `$N/hr` if live ever stores `hourly` |
| Types outside the six services | Category overline uses `formatCategoryLabel` (`Other` / custom for `other`) |
| Framed Browse preview | Removed |

## Responsive

| Width | Grid |
|-------|------|
| ≥1024 | 5 columns |
| 768–1023 | 3 columns (hide 10th when count=10) |
| &lt;768 | 2 columns; city chip wraps; full-width navy See all |
