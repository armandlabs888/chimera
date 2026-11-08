# Landing Popular services bento — decision ledger

**Brief:** Rebuild `#categories` Popular services to match the user-supplied asymmetric bento screenshot. Direct build (screenshot primary lock). Beam tokens secondary. Refero live unavailable (`NO_SUBSCRIPTION`); craft + current daylight system used.

**Path:** Direct build · section-only · no header/footer/backend changes.

## Reference lock

| Item | Commitment |
|------|------------|
| Primary | User screenshot (`beam-bento-reference.png`) |
| Preserve | `01 DISCOVER` eyebrow, bold navy Popular services, right filter tabs, row1 large House Cleaning + quote, row2 Pets + wide Custom, image-led contrast overlays |
| Adapt | Beam `#071330` / `#475569` readable type (PR60 contrast), `rounded-[10px]` cards / `rounded-md` tags (~8px), existing unique lifestyle photos |
| Reject | Elena R. / Verified neighbor as real testimony; invented $50–$120; dead filter tabs; screenshot as background; duplicating landing photos; bubbling oversized radii |

## Decisions

| Decision | Source | Why |
|----------|--------|-----|
| Tabs All / Home / Pets / Other only | Screenshot + taxonomy | Valid browse parents; Auto/Junk not in curated tabs |
| Junk remains discoverable via subtitle link | Smoke + taxonomy | `/browse?category=junk-removal` without forcing a Junk tile |
| Quote = Illustrative example, no person/verified badge | Truthfulness brief | Screenshot quote is not provenance |
| Omit screenshot price; use taxonomy typical range labeled | `@/lib/taxonomy` house-cleaning `$60–$140` | No invented market prices |
| Custom tile = neutral surface + icon (no photo) | Screenshot | Avoids burning another lifestyle photo; Other still routes |
| House Cleaning photo = `service-cleaning.jpg`; Pets = `service-petcare.jpg` | Existing assets | Unique on landing; job-appropriate |
| Filter hides non-matching tiles; All shows full 3-col asymmetry | Brief | Tabs must filter real content |
| Replace View-all button with filter tabs | Screenshot | Composition lock |
| Price copy: “Typical range $60–$140” | Taxonomy | Estimate language, not guarantee |
| Filters = `aria-pressed` buttons in labeled `role="group"` | A11y review | Content filters, not ARIA tabs (no fake tablist) |
| Cleaning tile ~420px first row + `object-[50%_18%]` | Desktop crop fix | Preserve face + kitchen cleaning context; keep unique `service-cleaning.jpg` |
