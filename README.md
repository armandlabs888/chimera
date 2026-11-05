# chimera

This repository hosts the **Beam** MVP (hyper-local same-day help marketplace demo).

---

# Beam

**Help nearby. Done today.**

Beam is a hyper-local, same-day help marketplace. People post practical jobs nearby; neighbors respond with a time and a price. Structured matching — not a feed, not classifieds, not social chatter.

This MVP is a **client-side-only** React app. All data lives in `localStorage` with a seeded Austin demo (East Austin, Hyde Park, Mueller, Zilker, South Congress, Travis Heights, Clarksville, The Domain).

## Stack

- Vite + React 19 + TypeScript
- React Router
- Tailwind CSS v4
- Lucide icons
- Fraunces + Outfit (Google Fonts)

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL (default [http://127.0.0.1:43123](http://127.0.0.1:43123)).

```bash
npm run build    # production build
npm run preview  # serve the build
```

No backend, auth, or payments. Use **You → Reset demo** to restore the Austin seed.

## What you can do in the demo

1. **Post a request** with category templates (under a minute).
2. **Browse** open requests and people; filter by category.
3. See **ranked nearby matches** on a request (skill + distance + availability).
4. **Send an offer** with price and ETA as a helper.
5. **Accept an offer**, message in-thread (simulated replies after a short delay).
6. **Mark complete** and leave a review.
7. Reload — data persists in the browser.

MVP categories: Moving & lifting, Cleaning, Tutoring, Pet care, Light handyman, Events & photo.

## Next highest-leverage improvements

1. **Matching quality** — Weight recent completion rates, on-time history, and category-specific success — not just skill tags + miles. Better ranking is the product.
2. **Live availability indicators** — “Free in the next 2 hours” with calendar-lite slots so ASAP jobs clear faster without chat ping-pong.
3. **Invite loops** — Let a requester invite 2–3 trusted neighbors first; fill from the open pool only if needed. Trust compounds locally.
4. **Trust & safety** — Lightweight ID checks, optional video intro, incident reporting, and clear out-of-scope bans (licensed trades, care work, driving).
5. **Notifications** — Push/SMS when a ranked helper is nearby or an offer lands — requests stay visible, but speed still wins same-day jobs.
6. **Payments & escrow** — Hold the offered price until mark-complete so naming a price before arrival becomes the default, not a handshake.
