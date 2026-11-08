# Landing How it works — interactive redesign decision ledger

**Brief:** Redesign `#how-it-works` to feel more vibrant and interactive. User rejected floating numbered markers, redundant Post CTAs, and flat static demos. Direct build; current Beam brand + user screenshot as primary sources. Refero live unavailable (`NO_SUBSCRIPTION`); craft color/a11y consulted.

## Reference lock

| Item | Commitment |
|------|------------|
| Preserve | Three-step structure, SAMPLE labeling, sample (not live) data, Beam `#1D5CE5` / `#071330` |
| Change | Numbers into card headers; remove bottom Post CTA + in-demo Post task button; remove BEST badge; interactive local demos |
| Reject | Live API/chat/transactions; unverified “best” recommendations; map imagery; pill/bubbly wrappers; faded secondary text |

## Decisions

| Decision | Source | Why |
|----------|--------|-----|
| Number chip beside step title in card header | User | Fix awkward left-edge floats |
| No Post buttons in this section | User | Real posting stays in hero/nav/elsewhere |
| Card 1: choose among sample tasks | User interactivity | Visible state; replaces posting CTA with “Sample draft ready” status |
| Card 2: select sample offer (no BEST) | User + truthfulness | Compare examples without ranking claim |
| Card 3: star rating control | User interactivity | Local-only review demo |
| Blue-tinted demo canvases `#EEF4FF` | Brand craft | Vibrancy without purple/glow AI defaults |
| `rounded-[10px]` cards / `rounded-md` controls | Beam radius lock | Crisp 10–12 / 8px |
| Body text `#475569` on warm wash | PR60 contrast craft | ≥4.5:1; not faint gray |
| `prefers-reduced-motion` skips hover scale | A11y | Motion optional |
| Money strings prefixed “Sample” in UI chrome | Truthfulness | No live pricing implication |
| Offer picker = `role="group"` + `aria-pressed` buttons | PR64 a11y review | Avoid incomplete listbox; match PR61 filter pattern |
| Rating stars `#B45309` / `#475569` on white (+ ring) | PR64 a11y review | UI control contrast ≥3:1; clear selected fill+ring |
