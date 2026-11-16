# Shared slim footer across all surfaces

**Supersedes:** tall grouped navy footer (Explore / Services / Get started / Trust + disclaimer).  
**Visual lock:** white surface, top hairline `#E3E8EF`, logo + © Bunk left, one link row right (`#4A5568`).  
**Component:** one shared `LandingFooter` — no parallel compact bars or column lists.

## Route ownership (one landmark)

| Surface | Footer owner |
|---|---|
| `/` marketing | `LandingPage` → `LandingFooter` |
| Guest branded 404 / error | `GuestSiteChrome` → `LandingFooter` |
| Guest `/browse` (+ other guest public paths) | `AppShell` guest branch → `LandingFooter` |
| Signed-in AppShell (`/browse`, `/messages`, `/post`, `/you`, `/home`, `/safety`, `/people/*`, `/requests/*`, helper onboarding) | `AppShell` → `LandingFooter dockPadding` |
| `/auth` | inert `LandingPage` under auth modal (includes `LandingFooter`) |
| `/onboarding` | `Onboarding` → `LandingFooter` |

Removed: column lists, tagline, payments/disclaimer legal row, role-aware Meet helpers / Become a helper / auth links in the footer.

## Fixed links

Browse jobs (`/browse`), Post a task (`/post`), How it works (`/#how-it-works`), Safety (`/safety`), Terms (`/terms`), Privacy (`/privacy`).

## Layout notes

- Same `beam-container` width as the header.
- Mobile: links wrap onto a second line; compact vertical padding.
- Signed-in mobile keeps `dockPadding` so the bar clears BottomNav.
