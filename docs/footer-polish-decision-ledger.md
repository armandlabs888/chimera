# Footer polish — reference lock & decision ledger

**Path:** Direct build against current Beam design system (user authorized; no option matrix).  
**Scope:** Marketing/`LandingFooter` + restrained shared-app footer consistency. Do not change Browse/Messages full-height chrome, listing radius, location modal, or landing photos.

## Research status

- Refero MCP `refero_search_styles` / `refero_search_screens`: **unavailable** (`NO_SUBSCRIPTION`).
- Primary lock: **existing Beam daylight brand** (`#071330` / `#1D5CE5` / white / `#F4F8FD`, 8px controls, hairline borders).
- Secondary craft references (bundled Refero skill):
  - `references/typography.md` — hierarchy via weight/spacing; ALL CAPS needs tracking; avoid flattened bold.
  - `references/color.md` — spacing creates breathing room, not washed-out gray; keep text hierarchy readable.
  - `references/craft-details.md` — `:focus-visible` rings; semantic landmarks.
  - `references/anti-ai-slop.md` — no card soup, no pill clusters, no decorative panels; edit copy down.
  - `references/example-workflow.md` — synthesize editorial hierarchy + productivity spacing without averaging into generic calm editorial.

## Cause / issues found (current footer)

1. **Flat link soup:** one wrap row mixes product, trust, and account actions with equal weight — weak scan hierarchy.
2. **Brand block too essay-like:** exclusion list lives in the primary blurb; better as a restrained secondary note near legal.
3. **Legal row soft:** copyright/payment note lacks a clear separator from navigation.
4. **Focus a11y gap:** `LandingFooter` links lack `:focus-visible` rings (app footer already has them).
5. **Mobile:** wrap-row links collide visually; no labeled groups for thumb scanning.
6. **Semantic misuse nearby:** category card attribution uses a `<footer>` element, which muddies landmark discovery (fix while polishing).

## Concept lock (updated after user correction)

**“Substantial marketing site map, not a compact status bar.”**  
Quiet `#F4F8FD` surface, expanded brand presence (larger wordmark + two real product sentences + Browse/Post CTAs), spacious labeled columns of real routes (Explore / Services / Get started / Trust), and a distinct taller legal row. Height comes from content + generous padding — not empty `min-height` filler, socials, newsletter, or fabricated URLs.

## Decision ledger

| Decision | Choice | Source | Rejected |
|---|---|---|---|
| Surface | `#F4F8FD` + top hairline `rgba(7,19,48,0.08)` | Beam tokens | Dark footer, carded panels |
| Brand block | Wordmark + ≤1 short sentence | Beam brand test + anti-slop copy cut | Long exclusion essay in brand column |
| Link structure | 3 groups: Explore / Get started / Trust | Craft hierarchy; real routes only | Single wrap row; invented columns |
| Explore links | `/browse`, `/#categories`, `/#how-it-works` (Available services / `#neighborhoods` removed) | Existing nav/routes | Fake blog/help center |
| Get started | `/post`, `/onboarding/helper` (or auth gate), `/auth?mode=signin` | Existing flows | Newsletter, app store badges |
| Trust | `/safety` only (+ keep payment note in legal) | Real Safety page | Fabricated insurance/trust seals |
| Legal row | Top hairline; © + payment arrangement note | Existing truthful copy | Fake privacy/terms URLs |
| Radius | No new cards; links are text; 8px only if control | Beam radius system | Bubbly panels / pill chips |
| App/Browse footer | Keep compact docked bar on xl `/browse` & messages; do not inject marketing mega-footer | Layout workspace invariant | Giant footer in locked workspaces |
| Category attribution | Change mistaken `<footer>` → `<p>` | Landmark a11y | Leave false footer landmarks |

## Implementation target

- Rewrite `LandingFooter.tsx` with brand + grouped nav + legal.
- Tiny landmark fix in `LandingCategories.tsx`.
- Leave `Layout.tsx` compact browse/messages footers structurally intact (optional focus/contrast parity only if needed without layout growth).

## Height correction (follow-up)

User rejected the compact interpretation. Correction targets:
- Desktop footer height roughly **1.6–2×** the PR50 ~312px baseline via padding + brand + Services column (real category routes) + legal row — without dead empty space.
- Mobile remains a well-spaced stacked/2-col layout, not cramped.
- Browse/Messages compact workspace footers stay unchanged.
