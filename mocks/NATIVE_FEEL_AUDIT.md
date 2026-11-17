# Bunk mobile native-feel audit (390x844)

Audit only. No production app code changes in this branch. Captured against local demo (`NEXT_PUBLIC_BEAM_DEMO_MODE=1`) for signed-in flows and `https://www.joinbunk.xyz` for signed-out landing and `/auth`. No production auth users created.

## Prioritized findings (what still feels like a website)

### P0

1. **Hybrid chrome on signed-in phone** — Bottom tab bar exists (`BottomNav`), but the website header still shows **Bunk + Post a task + Messages + hamburger**. Native apps keep one primary nav. Post is duplicated (header CTA and Post tab).
2. **Small tap targets** — Filters, category chips, helper-setup banner CTA (~24px), header icon cluster, and several secondary links measure under 44px on Browse, Post, Offers, Settings, Help.
3. **Input / control density** — Browse stacks location, distance, categories, search, and When/Pay/Sort before the list. Feels like a desktop marketplace toolbar compressed onto a phone.
4. **Messages as dismissible panel** — Opening Messages uses an overlay with **X close**, hides the tab bar, and reads as a floating web panel rather than a first-class tab destination (desktop floating panel pattern leaking onto phones).
5. **Marketing footer inside app chrome** — Dark multi-link footer (Browse, Post, How it works, Safety, Help, Terms, Privacy) appears under Offers / activity and other app pages. Classic website footer, not app IA.
6. **Third-party floating widget** — Dark circular “N” control overlaps the Home tab on phone screenshots.

### P1

7. **Hamburger remains on signed-in screens** — Website menu pattern alongside tabs.
8. **Job details still website-framed** — Full top marketplace header + text “Back to browse” instead of a compact app bar with a 44px back control. Sticky CTAs exist, which is good, but chrome above still feels web.
9. **Hover-heavy affordances** — Many `hover:` utilities; press/active feedback is weaker than needed for touch.
10. **Modals / drawers not consistently bottom sheets** — Filters and some dialogs should anchor to the bottom edge on phones.
11. **Safe-area gaps** — `viewport-fit=cover` and some `env(safe-area-inset-*)` exist, but home-indicator clearance under the dock and sticky CTAs still feels tight; landing/auth top chrome sits flush.
12. **No intentional route transitions** — Hard cuts between Browse → detail → Post; no push/slide motion.
13. **Browser form chrome** — Textarea resize handle visible on Post; inputs sometimes risk iOS zoom when font-size &lt; 16px on secondary fields.
14. **Signed-out landing** — Full marketing hero + hamburger is expected for acquisition, but Sign up / menu still read as a site, not an installable app shell.

### P2

15. **PWA partial** — `manifest.webmanifest` exists with `display: standalone`, theme `#1D5CE5`, icons 192/512 and apple-touch. Missing `apple-mobile-web-app-capable` meta (apple title is present via Next metadata). Add-to-home-screen story is incomplete on iOS.
16. **Overscroll / pull-to-refresh** — `overscroll-behavior` remains `auto` on body; browser bounce and accidental refresh still likely.
17. **Spinners vs skeletons** — Some routes use skeletons; others still feel like web loading rather than native placeholders.
18. **Auth** — Mobile auth is already closer to full-screen native (good). Remaining issues are small links/tap targets and lack of standalone install cues.

## What already helps native feel

- Bottom dock for signed-in users (`md:hidden`)
- Theme color + web manifest + icons
- Sticky mobile CTAs on job detail / post (`mobile-sticky-above-dock`)
- Messages already intended full-screen on mobile in `MessagesDrawerHost` comments (execution still panel-like)
- Auth shell uses safe-area padding on phones

## Artifact screenshots (current)

See `/opt/cursor/artifacts/current_*_390x844.png` and mock counterparts `mock_*_390x844.png`.
