# Browse vibrant empty — reference lock

Primary lock: user screenshot (`beam-browse-reference` / attached analysis). Secondary: current Beam Browse geometry & roles.

## Direction
Quiet pale gray-blue canvas + white compact chrome surrounding **one** vivid blue→turquoise gradient empty-state hero. Personality in the hero only; sidebar/nav stay restrained.

## Tokens
- Canvas: `#F4F8FD`
- Ink: `#071330` / muted `#64748B`
- CTA blue: `#1D5CE5`
- Hero gradient: deep blue `#0B3CC7` → turquoise `#22D3EE` (diagonal)
- Radius: cards/wrappers ~10–12px (`rounded-[10px]`/`rounded-xl`); controls 8px (`rounded-lg`)
- Shadow: soft restrained `0 8px 24px -12px rgba(7,19,48,0.18)` on hero; light card shadows

## Media
- Artwork: `/images/browse/empty-helper.png` — dimensional helper with cleaning kit (no map/radar/magnifier)
- Role: right-side hero illustration, decorative (`alt=""`)
- Mobile: **reduced**, always visible (~88×112px beside copy) — never silently remove signature artwork
- Desktop/tablet: larger art column; compact command bar stays single-row on mobile

## Decisions
1. Rich gradient hero **only** for genuine zero-results (`showFreshMarketplace`); filter no-match keeps plain EmptyState + reset
2. Populated feed: job cards first — no promo hero
3. ASAP filter chip keeps lightning; listing When form untouched (asap|scheduled)
4. Alerts copy = save preference / return behavior only (no Instant/push claims)
5. Profile card uses derived `%` only; hide when complete
6. Other category stays in sidebar (screenshot omitted it; product requires it)
7. No map/radar; no horizontal category strip; location stays topnav picker

## Rejects
Pill/bubbly wrappers; italic decorative “yet”; screenshot-as-background; fake 3× jobs / push alerts; map artwork
