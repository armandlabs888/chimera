# Shared tall footer across all surfaces

**Supersedes:** compact Browse/Messages app-footer exception from earlier footer work.  
**Visual lock:** PR51 `LandingFooter` (tall brand + 4 columns + legal row).  
**Component:** one shared `LandingFooter` — no parallel compact bars.

## Route ownership (one landmark)

| Surface | Footer owner |
|---|---|
| `/` marketing | `LandingPage` → `LandingFooter` |
| Guest `/safety` | `Safety` public chrome → `LandingFooter` |
| Guest `/browse` (+ other guest public paths except safety) | `AppShell` guest branch → `LandingFooter` |
| Signed-in AppShell (`/browse`, `/messages`, `/post`, `/you`, `/home`, `/safety`, `/people/*`, `/requests/*`, helper onboarding) | `AppShell` → `LandingFooter dockPadding` |
| `/auth` | `AuthExperience` → `LandingFooter` |
| `/onboarding` | `Onboarding` → `LandingFooter` |

Removed: compact `app-footer`, guest browse desktop status strip, messages-hidden footer.

## Role-aware links

- Helpers (`hidesPeerHelperDiscovery`): no Meet helpers / people tab.
- Signed-in: Profile & account, My activity; no Sign in / Create account.
- Guests: Sign in / Create account; Meet helpers allowed.
- Services: always `/browse?category=<id>` (works off-landing).

## Reachability tradeoff

Shell no longer uses `xl:h-dvh + overflow-hidden`. Browse/Messages main is viewport-tall with **internal** panel scroll; document scroll reveals the tall footer below. Composer/filters stay inside the workspace panel. Sticky topnav remains available while scrolling to the footer.
