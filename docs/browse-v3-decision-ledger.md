# Browse Jobs v3 — decision ledger

**Brief:** Replace the 3-column Browse workspace with the approved single-column mockup (`beam-browse-v3/index.html`). Live marketplace data only.

## Reference lock

| Item | Commitment |
|------|------------|
| Layout | One centered column, max 808px. Page scroll. No nested feed pane and no viewport height lock |
| Header | Floating inset bar reusing `.landing-float-nav`. Offset uses `--landing-float-header-offset` from `landing-v2.css` |
| Chrome | Location override (not profile city), Messages link, auth account menu, no bell |
| Filters | `q`, `category`, `radius`, `when` / `avail`, `sort`, `tab`. Category options are `BROWSE_PARENTS` |
| Rows | Thumbnail from `listingCoverImage` or category image. Click opens `?job=` |
| Drawer | ~500px right panel, navy scrim, focus trap, Escape, full page `/requests/[id]` |
| Offers | Make an offer / Ask a question call `createOffer` / `ensureThread`. Guests go to `/auth?next=` |
| Empty | Filtered empty is the mockup card. A truly empty feed keeps the existing fresh-marketplace empty |
| Footer | Existing navy `LandingFooter` |

## Budget

There is no budget filter in the product URL or matching layer. The mockup Budget pill and the mobile budget min/max fields are omitted. Sort by highest budget (`sort=budget`) stays, because that param already exists.

## Drawer URL

Opening a row sets `job` on the current query (`/browse?...&job={id}`) and leaves the other filters in place. Escape, the scrim, and Close delete only `job`. Open full page goes to `/requests/{id}`. The drawer never renders `exactAddress` and has no map. Copy states that the exact address is shared after an offer is accepted.

## Layout

`/browse` no longer uses a viewport-tall `overflow-hidden` main. `AppShell` renders `BrowseFloatHeader` (guest and signed-in) and lets the document scroll to the shared footer. Messages and the other app routes keep their previous chrome. The incomplete-helper setup banner stays immediately above the float header.

## Deviations vs the mockup

1. **No Budget pill.** No budget query param exists. Noted above.
2. **Category is one parent** (`home`, `auto`, `junk-removal`, `pets`, `other`), not a multi-select of leaf services. The URL has a single `category` value.
3. **Distance values** stay Any / 3 / 5 / 10 / 25 miles. The mockup’s 2-mile chip is not a stored radius.
4. **When values** stay Any timing / ASAP / Today / Tomorrow / This week. No weekend or date-picker control.
5. **Show more** advances 20 rows, not 10.
6. **No Save control.** Jobs are not a saved-item model. Share copies or shares the request URL.
7. **No “Sample listings” badge** and no illustrative names.
8. **Helpers tab** remains for guests and customers (segmented Jobs | Helpers). Helper-role users, including incomplete setup, stay jobs-only via `hidesPeerHelperDiscovery`.
9. **Trending column removed.**
10. **Fresh-marketplace empty** (`BrowseFreshEmpty` + While you wait) stays when there are zero open jobs and no filters. The mockup empty is the filtered state.
11. **Drawer radius is 12px** to stay inside the 8–12px radius rule. The float header keeps the landing 16px pill.
12. **Skeleton rows** are not shipped. The list renders live data or a real empty state.
13. **Body scroll locks only while a dialog is open** (drawer, mobile sheet, mobile filters). The page itself is not a locked viewport.
14. **Guest radius** now applies when `radius` is set. Listings without coordinates still pass, same as before.
15. **Mobile filters sheet is portaled to `document.body`.** The sticky filter bar is `z-index: 30`, which would otherwise trap the sheet under the bottom dock (`z-40`).
16. **Filtered-empty card radius is 12px** (`rounded-xl`), including the icon tile, so it stays inside the radius cap.
17. **Count-line city** always comes from the active browse origin’s `locationLabel` (same source as the float header picker), not a separate profile `city` that can disagree.
18. **Missing listing photos** use a Beam-tint `#F4F8FD` category icon tile (lucide), including legacy categories (`moving`, `events`, etc.) via `getBrowseCategoryIcon` — never a letter monogram.
