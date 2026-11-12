# Remove Available services section — decision ledger

**Ask:** Delete the entire “Explore all six / Available services on Beam” block between How it works and Why Beam, plus the footer Explore link that pointed at it.

## Removed
- `LandingAvailableServices` component and its mount in `LandingPage`
- Footer Explore link `{ href: '/#neighborhoods', label: 'Available services' }`
- Anchors `#neighborhoods` / `#available-services-heading` and `data-testid="available-services"`

## Kept
- Popular services bento, How it works, Why Beam, Popular gigs, hero, closing CTA, navy footer layout
- Footer Services column (Home / Auto / Junk / Pets / Other → Browse)
- Lifestyle image assets still used by Popular services / unused preview file

## Flow
How it works is the previous sibling of Why Beam — no empty wrapper between them. Existing section padding on each component is unchanged.

## Tests
- Smoke + guest-location-copy assert the section and footer link are gone
- `scripts/available-services-qa.mjs` rewritten to assert absence
- `scripts/remove-available-services-qa.mjs` screenshots the approved how→why flow
