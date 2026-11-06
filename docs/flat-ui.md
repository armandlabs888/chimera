# Beam UI system

Enterprise light marketplace UI — Attio-style precision, Stripe-like product density, Airbnb card hierarchy. Geist Sans only. Light theme only.

## Tokens

| Role | Token / class | Value |
|------|---------------|-------|
| Canvas | `beam-base` | `#FFFFFF` |
| Soft band | `beam-surface-2` / `beam-ink` (alias) | `#F7F7F8` |
| Text | `beam-cream` (legacy name) | `#171717` |
| Secondary | `beam-cream-dim` | `#52525B` |
| Muted | `beam-muted` | `#71717A` |
| Border | `beam-line` | `#E4E4E7` |
| Primary CTA | `beam-charcoal` | `#0C0C0E` |
| Marketplace accent | `beam-amber` | `#E08A2C` |

Amber is marketplace signal only (open status, focus, Post CTA). Charcoal is primary filled action on marketing. No indigo/violet. No dark-mode sections.

## Primitives

`src/components/ui/` — Button (`primary` charcoal · `brand` amber · secondary · ghost · danger), Field, TextInput, TextArea, Select, Badge, Card, Skeleton, EmptyState, InlineBanner, Avatar, Money (`tabular-nums`).

## Marketing rhythm

Use `.section` / `.section-band` density — **not** sparse `100svh` slabs. Interactive Example-labeled workflow tabs, bento architecture, category explorer, Austin neighborhood matrix, honest FAQ. All illustrative UI carries `Example`.

## App IA

| Route | Role |
|-------|------|
| `/` | Marketing |
| `/home` | App dashboard |
| `/browse` | Directory + search/filters |
| `/post` | Request form + live preview |
| `/messages` | Inbox split-pane |
| `/you?tab=` | URL-synced account tabs |
| `/auth` | Google + email signup |

## Constraints

- Light only · native vertical scroll · no fabricated stats/escrow/YC · no screenshots in QA
- Peer-to-peer payment clarity — Beam does not hold funds
- Categories: Moving, Cleaning, Tutoring, Pet care, Light handyman (excludes licensed trades), Events & photo
