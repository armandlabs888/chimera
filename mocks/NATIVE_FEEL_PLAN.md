# Native-feel plan (desktop unchanged)

Goal: signed-in phone UX feels like a light, flat native Bunk app. Desktop layout stays as today (floating Messages panel, marketplace header, etc.).

Suggested phone tabs (from real routes): **Browse** (`/browse`), **Post** (`/post`), **Messages** (`/messages` full-screen on phone), **Profile** (`/you` or `/settings` hub). Home/activity can live under Profile → My activity (or a fifth tab later if needed).

## Batch 1 — App shell (medium)

- Phone-only compact top app bar: wordmark or screen title; remove hamburger and redundant “Post a task” from signed-in header.
- Keep / strengthen bottom tab bar; 44px+ targets; safe-area padding; hide marketing footer on signed-in phone routes.
- Press states (`:active` scale/opacity); reduce hover-only cues on touch.
- Disable accidental pull-to-refresh / bounce where safe (`overscroll-behavior`).

## Batch 2 — Browse + job details (medium-large)

- Collapse filters into a bottom sheet; keep location + one chip row on the list.
- Job details: bottom sheet from Browse list OR push screen with back button; sticky primary actions above safe area / above dock.
- Skeleton loaders for list and detail.

## Batch 3 — Post + offers (medium)

- Sticky Continue / Publish above safe area (and above tabs if tabs remain visible).
- 16px inputs; hide browser textarea chrome; 44px chips.
- Offers / activity as list screens under Profile or Home without marketing footer.

## Batch 4 — Messages phone full-screen (medium)

- Phone: Messages tab opens full-screen list; conversation is a pushed full-screen thread with back.
- Desktop: keep existing floating panel.
- Hide bottom tabs only while a conversation is open (optional) or keep tabs on list only.

## Batch 5 — Profile / settings / verify / help (small-medium)

- Profile as tab hub with large rows to activity, verify, settings, help.
- Detail screens use compact top bar + back.
- Align Settings and Verify with same shell rules.

## Batch 6 — PWA polish (small)

- Ensure `apple-mobile-web-app-capable`, apple-touch-icon, theme-color, standalone manifest (mostly present; close iOS gaps).
- Optional install hint on Profile for supported browsers.
- Confirm start_url for signed-in deep entry if product wants Browse first.

## Batch 7 — Motion (small)

- Slide/push transitions between list → detail → chat on phones only.
- Sheet enter/exit for filters and job peek.

Rough sizes: Batches 1–2 are the highest leverage. 3–5 are localized. 6–7 are polish.

Static HTML previews live in `mocks/native-feel/` (this branch). Do not treat them as production UI.
