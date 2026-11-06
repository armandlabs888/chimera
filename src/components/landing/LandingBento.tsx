import {
  MapPin,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Wallet,
} from 'lucide-react'
import { LandingSection } from '@/components/flat'
import { Badge } from '@/components/ui'
import { EXAMPLE_LABEL } from './examples'

const TILES = [
  {
    title: 'Ranked nearby matching',
    body: 'Open requests and helpers surface by neighborhood proximity first — then recency.',
    icon: MapPin,
    chrome: (
      <div className="mt-4 space-y-1.5">
        {['East Austin · 0.0 mi', 'Mueller · 2.1 mi', 'Hyde Park · 2.8 mi'].map((row, i) => (
          <div
            key={row}
            className="flex items-center justify-between rounded-[8px] border border-beam-line bg-beam-base px-2.5 py-1.5 type-sec"
          >
            <span className="text-beam-cream">{row}</span>
            <span className="tabular-nums text-beam-muted">#{i + 1}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Priced offers with arrival window',
    body: 'Helpers commit a price and when they can arrive — before you open a long chat.',
    icon: Timer,
    chrome: (
      <div className="mt-4 rounded-[8px] border border-beam-line bg-beam-base px-3 py-2.5">
        <div className="flex items-end justify-between">
          <span className="tabular-nums text-[18px] font-semibold text-beam-charcoal">$55</span>
          <Badge tone="brand">Within 1 hour</Badge>
        </div>
      </div>
    ),
  },
  {
    title: 'Scoped 6-category guardrails',
    body: 'Moving, cleaning, tutoring, pet care, light handyman (no licensed trades), events & photo.',
    icon: Sparkles,
    chrome: (
      <div className="mt-4 flex flex-wrap gap-1.5">
        {['Moving', 'Cleaning', 'Tutoring', 'Pets', 'Handyman', 'Events'].map((c) => (
          <span key={c} className="rounded-full border border-beam-line px-2.5 py-1 type-meta text-beam-cream-dim">
            {c}
          </span>
        ))}
      </div>
    ),
  },
  {
    title: 'Dedicated request threads',
    body: 'Messaging stays attached to the accepted request — timing, access, and handoff in one place.',
    icon: MessagesSquare,
    chrome: (
      <div className="mt-4 rounded-[8px] border border-beam-line bg-beam-base px-3 py-2 type-sec text-beam-cream-dim">
        Thread · Active · Example
      </div>
    ),
  },
  {
    title: 'Bidirectional reviews',
    body: 'Requester and helper both leave short ratings after completion — reputation stays mutual.',
    icon: Star,
    chrome: (
      <div className="mt-4 type-sec font-medium text-beam-cream">★★★★★ · Example review pair</div>
    ),
  },
  {
    title: 'Peer-to-peer payment clarity',
    body: 'Agree on payment in-thread. Beam does not hold escrow or process cards today.',
    icon: Wallet,
    chrome: (
      <div className="mt-4 flex items-center gap-2 type-sec text-beam-muted">
        <ShieldCheck className="h-4 w-4 text-beam-amber-deep" />
        Honest scope · no payment guarantee claimed
      </div>
    ),
  },
]

export function LandingBento() {
  return (
    <LandingSection className="border-b border-beam-line">
      <div className="section-inner">
        <div className="max-w-2xl">
          <p className="flat-meta text-beam-amber-deep">Architecture</p>
          <h2 className="mt-2 type-h1 text-beam-charcoal">Built for practical same-day help</h2>
          <p className="mt-2 type-intro text-beam-cream-dim">
            Product surfaces neighbors actually use — matching, offers, threads, reviews — with clear
            scope boundaries.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((tile) => {
            const Icon = tile.icon
            return (
              <article key={tile.title} className="flat-bento flex flex-col p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-beam-amber-soft text-beam-amber-deep">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
                </div>
                <h3 className="mt-3 type-h3 text-beam-cream">{tile.title}</h3>
                <p className="mt-1.5 type-sec text-beam-muted">{tile.body}</p>
                {tile.chrome}
              </article>
            )
          })}
        </div>
      </div>
    </LandingSection>
  )
}
