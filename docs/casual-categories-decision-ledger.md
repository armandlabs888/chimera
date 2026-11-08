# Casual launch categories — decision ledger

**Mode:** Small direct-build (existing Beam system as visual source). Live Refero unavailable (`NO_SUBSCRIPTION`); craft + current product tokens used as fallback.

| Decision | Choice | Why |
| --- | --- | --- |
| Taxonomy shape | Parents Home / Auto / Junk Removal / Pets / Other; leaf services only under Home, Auto, Pets | Exact launch brief; Junk + Other standalone |
| “All categories” | Browse filter only | Not a task category; keeps marketing nav = parents |
| Other storage | `help_requests.category_custom`, `profiles.other_skill_label` | Additive; no remap of free-text `category` / `skills` |
| Legacy IDs | Display via `LEGACY_CATEGORY_LABELS`; not selectable | Preserve readable history; no delete/reclassify |
| Parent→child UI | Shared `CategorySelect` + Browse parent filters | Avoid flat jumble; one source of truth in `@/lib/taxonomy` |
| Visual system | Keep `#F4F8FD` / white / navy / blue, 8px controls, rounded-lg | Design lock; no new photos or pill/chip restoration |
| Safety | Other still under existing exclusions | No policy widening |

**Rejected:** Remapping old jobs into new leaves; inventing extra services; restoring category chip rows / location eyebrow; implementing positioning-audit features.
