# Job details drawer redesign — decision ledger

**Ask:** Replace the floating inset Browse job panel with the approved attached drawer.

## Desktop
- Flush top/right/bottom, 500px, 1px left seam `#E3E8EF`, no radius, no shadow, no scrim
- Browse list + float header reflow with `padding-right: 500px` / `right: 500px`
- Full-bleed photo ~210px; hairline Budget / When / Distance rows; unboxed location row
- Sticky header + footer; buttons `rounded-lg` (8px)

## Mobile
- Full-screen sheet flush to all edges; no handle / top gap
- Photo ~148px; footer = price line then two equal-width CTAs

## Preserved
Open/close, focus trap, Escape, share, open-full-page, ask/offer flows, guest auth, owner states, testids
