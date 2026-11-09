# Paper landing redesign — decision ledger

**Locked source:** Paper `01M6YRPQ1QJ6CXVFAYAYGWSV7Y` / `p-1-0` (desktop 1440×3919, mobile 390×6052) + attached screenshots + `state_ca59.json`.

| Decision | Choice | Why |
|---|---|---|
| Hero media | Image-free | Paper-locked; search is the visual target |
| Hero search | Preserve guest All categories + signed-in neighborhood picker + `/browse` query wiring | Production semantics over mock |
| Nav primary CTA | Keep Sign up (not mock “Post a task”) | Existing auth funnel; Post a task remains secondary in hero/closing |
| Nav “Find work” | Maps to helper onboarding / signup | Paper label; same route as former Become a helper |
| Popular bento | Cleaning / Pet care / navy Custom (filters retained) | Paper composition; Other stays out of six-grid |
| Popular cleaning photo | Orange-crew `LIFESTYLE.cleaningCrew` → `/images/landing/avail-house-cleaning.jpg` (Pexels 6195125) | Paper `desktop-popular.png` lock; not kitchen lifestyle |
| Six-grid House Cleaning photo | Kitchen lifestyle `/images/landing/service-cleaning.jpg` | Uniqueness: Paper showed orange-crew in both Popular + Available; dual use forbidden |
| How it works | Tabbed interactive sample demos | Paper tabs + prior local interaction work |
| Sample claims | Explicitly illustrative; no live offers/counts | Brief constraint |
| Available services | Independent section, 3×2/2/1, six leaves only | Paper + prior PR67 |
| Why Beam | Three factual pillars; no nested Available; no live proof | Brief constraint |
| Closing CTA | Pre-footer Post a task | Paper |
| Footer | `#071330` navy + existing functional groups | Paper color/layout, preserve links |
| Type | Inter (`font-sans` / body stack) on landing headlines | Paper |
| Radius | 10–12px (implemented at 10px) | Paper + smoke subtle-radius gate |
| Design research | Paper approved; no alternate Figma/Refero direction | User instruction |

## Popular cleaning photo fidelity (PR68 follow-up)

| Candidate | Path | Subject | Decision |
|---|---|---|---|
| Kitchen lifestyle | `/images/landing/service-cleaning.jpg` | Sage-shirt wipe of marble counter | Was incorrectly used in Popular head |
| Orange-crew | `/images/landing/avail-house-cleaning.jpg` | Three cleaners in orange overalls (Pexels 6195125) | **Paper Popular lock** — used in Popular bento |
| No second crew asset | — | Zip/`beam-landing-photos_bc23` has no alternate crew | Cannot satisfy Paper dual-crew + uniqueness |

**Conflict:** Paper Popular and Paper Available House Cleaning both show the orange-crew shot. Prior landing uniqueness (no duplicate/lookalike rendered photos) forbids using that file in both sections. Narrow resolution: Popular takes the lock crew shot; six-grid House Cleaning uses the distinct kitchen lifestyle asset. Direction otherwise unchanged.

## Limitations
- Privacy/Terms routes not invented (footer Trust → Safety).
- Mock “Help” link not present; Safety covers trust path.
- Refero/Mobbin were previously blocked; visual lock is Paper screenshots.
- Six-grid House Cleaning intentionally diverges from Paper’s orange-crew tile to preserve uniqueness after Popular takes that lock.
