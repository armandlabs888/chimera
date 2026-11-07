# Browse Jobs redesign — decision ledger

**Brief:** Redesign `/browse` to match the user-supplied target screenshot. Direct build (no visual alternatives). Screenshot owns composition; Beam tokens own a11y/radius; app data owns facts.

**Research:** Refero MCP and Mobbin MCP unavailable (subscription). Bundled Refero craft + screenshot + existing Beam daylight system used. Screenshot is primary lock.

## Reference lock

| Item | Commitment |
|------|------------|
| Primary | User screenshot (`beam-browse-target.png`) |
| Preserve | `#F4F8FD` canvas, white panels, `#071330` type, `#1D5CE5` CTAs, thin cool borders, restrained shadow, left filters + scrolling main, empty panel + radar + While you wait + navy safety strip |
| Borrow | Beam `--beam-radius-md` 8px / `--beam-radius-sm` 6px; existing top nav; PR42 helper jobs-only behavior |
| Reject | Bubbly pills, fabricated social proof, fake live scanning, peer discovery for helpers, indigo/violet AI defaults |
| Media | Helper empty state may keep decorative radar. Customer/guest empty state is copy-only — no map/radar geographic viz (follow-up after PR45). |

## Decisions

| Decision | Source | Role | Why |
|----------|--------|------|-----|
| Composition, density, empty hierarchy | Screenshot | Dominant visual | Authoritative target |
| Palette + corner tokens | Screenshot + Beam PR41 | Surfaces/CTAs/radius | Match target without breaking design system |
| Helper: jobs only, 2-col, no trending | PR42 / `roles.ts` | Functional lock | Preserve exactly |
| Customer/guest discovery tabs + trending | PR42 | Functional lock | Role-aware retention |
| List/Map toggle removed | Explicit product follow-up | Interaction | Helpers + customers use list/grid only; `?view=map` strips to list |
| Customer empty: no radar | Explicit product follow-up | Customer UX | Remove map-like radar from customer Browse empty; helper radar retained |
| Job alerts preference | Honest alternative | localStorage flag | No push infra; status reflects stored preference only |
| Widen area CTA | Existing `radius` query | Real action | Sets browse radius to 25 mi |
| Profile progress | `Person` fields | Derived fact | No invented 60% |
| Safety strip copy | Safety page commitments | Trust | No unverifiable moderation guarantee |
| Compact category chips | Screenshot | Density | `rounded-md` (6–8px), not pill buttons |
| Nav unchanged | User constraint | Scope | No “My tasks” invent |
| Reduced motion | A11y craft | Motion | Radar pulse respects `prefers-reduced-motion` |
