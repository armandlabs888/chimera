# Browse Jobs Paper redesign — decision ledger

**Brief:** Align `/browse` to approved Paper artboards (`p-2-0`) while keeping live marketplace behavior. Screenshot composition owns chrome; Beam tokens + real data own facts.

**Sources:** Paper file `01M6YRPQ1QJ6CXVFAYAYGWSV7Y` / page `p-2-0`; locked mockups (desktop guest empty/populated, helper jobs-only, mobile populated, mobile filters sheet); `state_7e1c.json`. Refero unavailable (NO_SUBSCRIPTION). Paper MCP unavailable this run — mockups + handoff used as lock.

## Reference lock

| Item | Commitment |
|------|------------|
| Primary | Paper artboards + attached mockups |
| Palette | Inter, navy `#071330`, blue `#1D5CE5`, tint `#F4F8FD`, white cards ~12px |
| Layout | Desktop 3-col: FILTERS / FEED / Trending (guest+customer); helper 2-col jobs-only |
| Scroll | Viewport-tall workspace; outer rails stationary; middle feed scrolls |
| Data | Live jobs/helpers only — never seed illustrative mockup names/jobs/notes |
| Logo | Keep existing Beam identity/logo (do not swap for generic lowercase wordmark) |

## Decisions

| Decision | Source | Role | Why |
|----------|--------|------|-----|
| Desktop 3-col discovery / 2-col helper | Paper + `roles.ts` | Layout lock | Match artboards; preserve helper jobs-only |
| Mobile Filters bottom sheet (dialog, trap, Escape, Apply/Reset) | Paper mobile sheet | Interaction | Replace inline expand with accessible sheet |
| Filtered empty: selected category copy + Reset + Post | Paper guest empty | Empty UX | Clear Auto-selected zero-match path without fabricated claims |
| Keep job card photos/budget/offers | Product necessity vs sparse mockups | Content | Mockups are illustrative; real listing detail retained |
| Keep signed-in miles radius in Filters | Existing product | Filters | Sparse Paper guest frames omit radius; signed-in geo filter retained |
| Keep “All categories” label | Smoke / casual-categories QA | Copy | Paper shows “All”; production + tests keep full label |
| Search placeholder “Search jobs” | Paper | Copy | Update smoke to accept new placeholder |
| Timing navy active chips; FILTERS/CATEGORY/TIMING chrome | Paper | Visual | Compact workspace chrome |
| Mode tabs as separate pills with · counts | Paper | Visual | Guest/customer discovery intact |
| Helper subtitle jobs-only | Paper helper board | Role UX | No Local helpers / Trending for helpers incl. incomplete setup |
| No maps/radar/bell; no category chip row; no city eyebrow | Prior browse locks + Paper | Scope | Already removed; keep asserted absent |
| Do not edit Paper file or landing | User | Scope | Browse-only PR |

## Deviations vs Paper (intentional)

1. **Real listing cards** show photos, budgets, offers, ratings — mockup cards were illustrative stubs.
2. **Trending helpers** use live people (name, skills, rate) — never “Maya R. / Illustrative”.
3. **Signed-in radius** control remains in Filters + command bar (guests still use Timing).
4. **“All categories”** wording retained for accessibility/regression locks.
5. **Existing Beam logo** in topnav retained.
6. **Fresh-marketplace empty** (`BrowseFreshEmpty` + While you wait) retained when marketplace is truly empty with no filters — Paper’s Auto-selected empty is the filtered path.
