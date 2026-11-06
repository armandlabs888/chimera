import type { ReactNode } from 'react'
import { LandingSection } from '@/components/flat'
import { Avatar, Badge } from '@/components/ui'
import { CATEGORIES } from '@/data/categories'
import { EXAMPLE_LABEL } from './examples'

export function LandingBento() {
  return (
    <LandingSection className="border-b border-black/[0.05] bg-white">
      <div className="section-inner">
        <div className="max-w-2xl">
          <span className="eyebrow-pill">Architecture</span>
          <h2 className="mt-3 type-h1 text-beam-charcoal">Built for practical same-day help</h2>
          <p className="mt-2 type-intro text-beam-cream-dim">
            Matching, offers, threads, and reviews — with clear peer-to-peer payment boundaries.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <BentoTile title="Ranked nearby" caption="Proximity first">
            <ProximityRadar />
          </BentoTile>
          <BentoTile title="Offers with ETA" caption="Price → accept → arrive">
            <OfferStepper />
          </BentoTile>
          <BentoTile title="Six category scopes" caption="Tinted at a glance">
            <CategoryMatrix />
          </BentoTile>
          <BentoTile title="Request threads" caption="Scoped messaging">
            <ChatMini />
          </BentoTile>
          <BentoTile title="Bidirectional reviews" caption="Mutual reputation">
            <DualReviews />
          </BentoTile>
          <BentoTile title="Peer-to-peer pay" caption="Not held by Beam">
            <PaymentDiagram />
          </BentoTile>
        </div>
      </div>
    </LandingSection>
  )
}

function BentoTile({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: ReactNode
}) {
  return (
    <article className="elevated elevated-hover flex flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[16px] font-semibold text-beam-cream">{title}</h3>
          <p className="type-meta text-beam-muted">{caption}</p>
        </div>
        <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </article>
  )
}

function ProximityRadar() {
  return (
    <svg viewBox="0 0 240 140" className="h-auto w-full" aria-hidden>
      <circle cx="120" cy="78" r="54" fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="1" />
      <circle cx="120" cy="78" r="36" fill="none" stroke="rgba(217,119,6,0.25)" strokeWidth="1.5" />
      <circle cx="120" cy="78" r="18" fill="none" stroke="rgba(217,119,6,0.45)" strokeWidth="1.5" />
      <circle cx="120" cy="78" r="5" fill="#D97706" />
      <circle cx="86" cy="52" r="4" fill="#0369A1" />
      <circle cx="152" cy="48" r="4" fill="#047857" />
      <circle cx="160" cy="96" r="4" fill="#BE123C" />
      <text x="70" y="42" fontSize="9" fill="#71717A">
        Mueller
      </text>
      <text x="156" y="40" fontSize="9" fill="#71717A">
        Hyde Park
      </text>
      <text x="164" y="112" fontSize="9" fill="#71717A">
        East Austin
      </text>
      <text x="104" y="128" fontSize="9" fill="#B45309" fontWeight="600">
        You
      </text>
    </svg>
  )
}

function OfferStepper() {
  const steps = [
    { label: 'Offer', value: '$65' },
    { label: 'Accepted', value: '✓' },
    { label: 'Arriving', value: '2:30 PM' },
  ]
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-1 items-center gap-1">
          <div className="elevated flex-1 px-2 py-2 text-center">
            <p className="type-meta text-beam-muted">{s.label}</p>
            <p className="mt-0.5 tabular-nums text-[13px] font-semibold text-beam-cream">{s.value}</p>
          </div>
          {i < steps.length - 1 ? (
            <span className="text-beam-muted" aria-hidden>
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function CategoryMatrix() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {CATEGORIES.map((c) => (
        <div
          key={c.id}
          className="flex aspect-square flex-col items-center justify-center rounded-[12px] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
          style={{ background: c.tintBg, color: c.tintFg }}
        >
          <span className="text-[11px] font-bold">{c.shortLabel}</span>
        </div>
      ))}
    </div>
  )
}

function ChatMini() {
  return (
    <div className="space-y-2 rounded-[12px] bg-beam-canvas p-3">
      <div className="max-w-[90%] rounded-[12px] rounded-bl-md bg-white px-2.5 py-1.5 type-sec text-beam-cream shadow-[0_0_0_1px_rgba(15,23,42,0.06)]">
        I’ll bring a dolly — ETA 45 min.
      </div>
      <div className="ml-auto max-w-[85%] rounded-[12px] rounded-br-md bg-beam-charcoal px-2.5 py-1.5 type-sec text-white">
        Gate code is 4412. Thanks!
      </div>
      <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
    </div>
  )
}

function DualReviews() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {['Requester', 'Helper'].map((role) => (
        <div key={role} className="rounded-[12px] bg-beam-canvas p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="type-meta text-beam-muted">{role}</p>
          <p className="mt-1 text-[13px] font-semibold text-beam-amber">★★★★★</p>
          <p className="mt-0.5 type-meta text-beam-cream-dim">Example</p>
        </div>
      ))}
    </div>
  )
}

function PaymentDiagram() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[12px] bg-beam-canvas p-3">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-1">
          <Avatar name="Alex R." size={32} />
          <span className="type-meta text-beam-muted">Requester</span>
        </div>
        <div className="flex flex-1 flex-col items-center">
          <div className="h-px w-full border-t border-dashed border-beam-amber-deep/50" />
          <span className="mt-1 rounded-full bg-white px-2 py-0.5 type-meta font-semibold text-beam-amber-deep shadow-[0_0_0_1px_rgba(217,119,6,0.2)]">
            $55
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Avatar name="Maya C." size={32} />
          <span className="type-meta text-beam-muted">Helper</span>
        </div>
      </div>
      <p className="text-center type-meta font-semibold text-beam-cream-dim">
        Arranged directly · Not held by Beam
      </p>
    </div>
  )
}
