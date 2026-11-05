# chimera

This repository hosts the **Beam** MVP (hyper-local same-day help marketplace).

---

# Beam

**Help nearby. Done today.**

Beam is a hyper-local, same-day help marketplace. People post practical jobs nearby; neighbors respond with a time and a price.

## Modes

### Live (default when env is set)
Persists profiles, requests, offers, threads, messages, completions, and reviews in Supabase project **chimera** (`lfyqdrjqfpczsfkqjxpq`) with email/password auth and row-level security. Ownership/participant checks prevent forging senders, accepting others’ offers, or reviewing jobs you were not part of.

Required env:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://lfyqdrjqfpczsfkqjxpq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback name for the publishable/anon key. **Never** expose a service-role key to the browser.

Live backend errors surface in the UI and **do not** silently fall back to `localStorage`.

### Explicit demo
Set `NEXT_PUBLIC_BEAM_DEMO_MODE=1` (or open with `?demo=1`) for the original Austin seed stored only in the browser. **You → Reset demo** restores that seed and never touches other users’ Supabase data.

## Stack

- Next.js App Router + React 19 + TypeScript
- Supabase Auth + Postgres RLS (`@supabase/ssr`)
- Tailwind CSS v4
- Lucide icons
- Fraunces + Outfit (`next/font`)

## Database migration

SQL lives in `supabase/migrations/20261105201933_beam_core_schema.sql`. Apply with Supabase MCP/CLI against project `lfyqdrjqfpczsfkqjxpq` (already applied in the live project during integration). Advisors: revoke `EXECUTE` on RPCs from `anon`; authenticated may call `accept_offer`, `complete_request`, `ensure_thread`, and `submit_review`.

## Run locally

```bash
cp .env.example .env.local   # fill publishable key
npm install
npm run dev
```

```bash
npm run build
npm run start
npm run test:smoke          # route smoke (demo-safe)
npm run test:live           # live auth + persistence + negative authz (needs env)
```

## What you can do

1. Sign up / sign in (live) or use demo mode.
2. Post a request, browse, send offers, accept, message, complete, review.
3. Reload — live data persists in Supabase; demo data persists in `localStorage`.
