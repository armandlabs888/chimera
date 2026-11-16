# chimera

This repository hosts the **Bunk** MVP (hyper-local same-day help marketplace).

---

# Bunk

**Help nearby. Done today.**

Bunk is a hyper-local, same-day help marketplace. People post practical jobs nearby; neighbors respond with a time and a price.

## Modes

### Live (default when env is set)
Persists profiles, requests, offers, threads, messages, completions, and reviews in Supabase project **chimera** (`lfyqdrjqfpczsfkqjxpq`) with email/password auth and row-level security. Ownership/participant checks prevent forging senders, accepting others’ offers, or reviewing jobs you were not part of.

Required env:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://lfyqdrjqfpczsfkqjxpq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback name for the publishable/anon key. **Never** expose a service-role key to the browser.

Optional server-only email (Resend) for account-deletion confirmation. Missing keys skip sending and never block deletion:

```bash
RESEND_API_KEY=<resend api key>
EMAIL_FROM=Bunk <no-reply@yariapp.com>
```

Live backend errors surface in the UI and **do not** silently fall back to `localStorage`.

### Explicit demo
Set `NEXT_PUBLIC_BEAM_DEMO_MODE=1` (or open with `?demo=1`) for the original Austin seed stored only in the browser. **You → Reset demo** restores that seed and never touches other users’ Supabase data.

## Stack

- Next.js App Router + React 19 + TypeScript
- Supabase Auth + Postgres RLS (`@supabase/ssr`)
- Tailwind CSS v4
- Lucide icons
- Geist Sans (`next/font/google`)

## Database migration

SQL lives in `supabase/migrations/`. Apply with Supabase MCP/CLI against project `lfyqdrjqfpczsfkqjxpq` (core schema already applied in the live project during integration). Advisors: revoke `EXECUTE` on RPCs from `anon`; authenticated may call `accept_offer`, `complete_request`, `ensure_thread`, and `submit_review`.

### Phone confirmation (onboarding)

Migration: `supabase/migrations/20261117090000_phone_verification_onboarding.sql` (do not auto-apply from agents).

Adds `phone_verifications` (one verified E.164 per account, hashed pending codes, RLS select-own) and helper SMS columns `sms_opt_in_pending` / `sms_alert_parents`, plus a trigger that activates pending opt-in when home verification is approved.

Required server env for SMS (missing values skip sends gracefully and show a friendly UI error):

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
# or TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=
```

Twilio console: set the number's inbound messaging webhook to:

`https://www.joinbunk.xyz/api/sms/inbound`

(X-Twilio-Signature is validated with `TWILIO_AUTH_TOKEN`.)

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

## UI system

Presentable light marketplace UI (Airbnb clarity + Linear type discipline). Public landing is a conventional light SaaS page with full-viewport vertical sections and ordinary document scroll. See [`docs/flat-ui.md`](docs/flat-ui.md).

## What you can do

1. Sign up / sign in (live) or use demo mode.
2. Post a request, browse, send offers, accept, message, complete, review.
3. Reload — live data persists in Supabase; demo data persists in `localStorage`.
