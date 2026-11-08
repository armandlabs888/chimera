# Available services photo row — decision ledger

**Ask (reject PR65 selector UI):** Horizontal row of equal **image-led** service cards under “Available services on Beam” — relevant real photo per service, name below, whole card links to leaf Browse. No selector/detail panel.

**Research:** Refero MCP unavailable (`NO_SUBSCRIPTION`). Direct build lock = user correction + Beam brand (`#1D5CE5` / `#071330`) + prior landing craft (10–12px radii, high-contrast type, unique local assets, smoke uniqueness).

| Decision | Source | Why |
| --- | --- | --- |
| Equal image-dominant cards in one horizontal row | User reject of PR65 | “Card with the relevant image and lined up in a row” |
| Whole card = native `<Link>` to `/browse?category=<leaf>` | User ask | No nested interactive targets; leaf routes already verified |
| Touch-scroll + CSS scroll-snap + prev/next when overflow | User ask | Accessible overflow without autoplay/marquee |
| Wide desktop shows as many full cards as fit (~220px) | User ask | Avoid absurdly tiny 7-up squeeze |
| Card radius `rounded-[10px]` | User 10–12px + smoke ≤10 CTA rule | Crisp corners without failing subtle-radii smoke |
| Keep headline; short factual support; drop supply-disclaimer | User ask | Types Beam supports — not live availability |
| Six launch services + Other | User ask + taxonomy | Other has honest casual-help photo |
| Popular services bento unchanged | User ask | Distinct discovery surface |
| Keep `id="neighborhoods"` | Nav/footer/smoke | Deep-link stability |
| Local-only photos (no Unsplash hotlinks) | Smoke uniqueness | Page must not embed remote Unsplash URLs |
| `motion-safe:scroll-smooth` + `motion-reduce:scroll-auto`; imperative `behavior: instant` when reduced | PR66 a11y review | Smooth scroll must not run under prefers-reduced-motion |
| QA asserts computed `scroll-behavior: auto` + instant jump samples | PR66 a11y review | Navigation alone is insufficient evidence |
| Content-hash + contact sheet for rendered landing `<img>`s | PR66 evidence ask | Catch real pixel duplicates beyond unique paths |

## Image provenance (all local under `/public/images/landing/`)

| Service | File | Source | License / note |
| --- | --- | --- | --- |
| House Cleaning | `avail-house-cleaning.jpg` | Pexels 6195125 | Pexels License; diverse cleaning crew with tools (Black + White workers) |
| Carpet Cleaning | `avail-carpet-cleaning.jpg` | Pexels 4107284 | Pexels License; vacuum head on patterned rug, worker in frame |
| Auto Detailing | `avail-auto-detailing.jpg` | Unsplash `photo-1607860108855-64acf2078ed9` | Unsplash License; hand-wash/detail with sponge + soap on driveway |
| Junk Removal | `avail-junk-removal.jpg` | Copy of unused `service-moving.jpg` | Existing Beam asset; sofa + truck haul context; Black + Latino helpers |
| Pet Sitting | `avail-pet-sitting.jpg` | Pexels 7210754 | Pexels License; multi-dog walk with handler (distinct from bento sidewalk walk) |
| Grooming | `avail-grooming.jpg` | Unsplash `photo-1516734212186-a967f81ad0d7` | Unsplash License; at-home dog bath in tub |
| Other | `avail-other.jpg` | Copy of unused `service-events.jpg` | Existing Beam asset; Black + Asian neighbors setting outdoor table |

**Uniqueness:** New `avail-*` paths are distinct from every other landing `<img>` path (hero fan, Discover bento `service-cleaning` / `service-petcare`, helpers, Why Beam dresser/offers). Junk/Other files are copies with new filenames so DOM paths stay unique even though pixels match unused prior assets that were not rendered on `/`.
