# Available services strip — decision ledger

**Ask:** Redesign the standalone yellow scalloped chip strip into an intentionally framed **Available services on Beam** section — interactive, modern, vibrant, brand-aligned. Popular services bento stays distinct/unchanged.

**Research:** Refero MCP unavailable (`NO_SUBSCRIPTION`). Direct build lock = existing Beam brand (`#1D5CE5` / `#071330`) + prior landing craft (PR61/64 aria-pressed groups, contrast floors) + bundled Refero craft (no pale gray copy; focus-visible; text ≥4.5 / UI ≥3).

| Decision | Source | Why |
| --- | --- | --- |
| Frame as “Available services on Beam” + short honest support line | User ask | Types Beam supports — not live helper supply, counts, prices, or guarantees |
| Drop yellow scallops + tiny chip row | User screenshot + ask | Weak hierarchy; replace with Beam blue field `#EEF4FF` and navy type |
| Interactive `role="group"` + `aria-pressed` tiles | PR61/64 a11y pattern | Full keyboard Enter/Space; no incomplete listbox/tabs |
| Detail panel + single Browse `Link` (not nested in tile) | User ask | Meaningful local interaction beyond hover; one interactive target per tile |
| Leaf category query `/browse?category=<service-id>` | Existing browse filter + prior strip | Verified leaf routes; Other → `/browse?category=other` |
| Taxonomy lock: 6 launch services + Other | User ask + `SERVICE_CATEGORIES` | No extra categories; Other is supported discovery |
| Keep `id="neighborhoods"` on the strip | Nav/footer deep links + smoke | Preserve existing `#neighborhoods` anchors without renaming other chrome |
| No photo bento / no second Discover collage | User ask | Distinct from Popular services bento |
| Icons from `CATEGORY_ICONS` (Droplets for carpet, etc.) | Existing icon map | Correct service glyphs; 8px control radius / 10–12px tiles |
| Selected fill `#1D5CE5` on white unselected | Brand + contrast | Clear selected/unselected; focus-visible rings on blue field |
| Compact two-column desktop (grid + detail) | User ask | Substantial but not full-viewport waste; stacks cleanly at 390 |
| `motion-safe` hover lift only; reduced-motion honored | Craft / a11y | Presence without autoplay/marquee |
| Role gating unchanged | User ask | Strip links are category Browse (jobs), not peer-helper discovery — helpers keep jobs feed |
