# Landing three-step booking section — decision ledger

**Brief:** Upgrade existing `#how-it-works` on Beam landing to a UI-preview three-step booking section matching the user-supplied screenshot. Direct build (no visual alternatives). Screenshot owns composition/copy hierarchy; Beam tokens own radius/a11y; product truth owns claims.

**Research:** User screenshot is the locked dominant source (Refero direct-build). No broad Refero/Mobbin exploration per brief. Existing Beam daylight system + prior landing section rhythm constrain tokens.

## Reference lock

| Item | Commitment |
|------|------------|
| Primary | User screenshot (`beam-three-step-reference.png`) |
| Preserve | Centered eyebrow + heading + subtitle; three equal cards; miniature product UI above step title/body; numbered markers; subtle yellow connecting cue; warm pale section wash |
| Adapt | Beam crisp `rounded-lg` (~8–12px), not oversized bubbly cards; Beam `#1D5CE5` / `#071330` / restrained gold accents |
| Reject | Purple dotted editor selection border; second redundant how-it-works; fabricated live stats; unsupported “verified helper” / instant-availability claims; fake interactive mini controls |
| Media | UI-preview supersedes photo-per-card **only** in this section; other landing photos unchanged |

## Decisions

| Decision | Source | Role | Why |
|----------|--------|------|-----|
| Upgrade `LandingHowItWorks` in place (`id="how-it-works"`) | Brief + nav/footer anchors | Structure | Avoid duplicate how-it-works; keep `/#how-it-works` |
| Heading “Book in minutes, not days” + “3 SIMPLE STEPS” | Screenshot | Dominant copy | Locked source |
| Soften offer/chat bodies vs screenshot | Product honesty constraint | Claims | No unsupported verified/instant/payment-escrow promises; samples labeled |
| Decorative previews `aria-hidden`, non-focusable | A11y craft | Interaction | Real CTA is `/post` link below grid |
| Initial circles instead of avatar photos in mini UI | Smoke image inventory + mini-UI clarity | Media | Avoid new `<img>` and keep approved photos elsewhere |
| Pale warm `#FFFDF7` section bg | Screenshot + existing yellow rhythm | Surface | Closer to reference cream than saturated `#FFF8D6` |
| Equal-height cards via CSS grid + shared preview min-height | Screenshot | Layout | Desktop parity; vertical stack on mobile |
| Compact shared footer / Browse cleanup untouched | Brief | Scope | PR53/54 stay as-is |
