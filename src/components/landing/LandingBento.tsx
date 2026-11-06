import type { ReactNode } from 'react'
import { LandingSection } from '@/components/flat'
import { Avatar, Badge } from '@/components/ui'
import { CATEGORIES } from '@/data/categories'
import { EXAMPLE_LABEL } from './examples'

export function LandingBento() {
  return (
    <LandingSection>
      <div className="section-inner">
        <div className="max-w-2xl">
          <p className="flat-meta">Architecture</p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,3.6vw,3rem)] font-normal text-[#FAF8F4]">
            Built for practical same-day help
          </h2>
          <p className="mt-2 text-[17px] text-[#A7A39C]">
            Matching, offers, threads, and reviews — with clear peer-to-peer payment boundaries.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tile title="Ranked nearby" caption="Proximity first">
            <ProximityRadar />
          </Tile>
          <Tile title="Offers with ETA" caption="Price → accept → arrive">
            <OfferStepper />
          </Tile>
          <Tile title="Six category scopes" caption="Tinted at a glance">
            <CategoryMatrix />
          </Tile>
          <Tile title="Request threads" caption="Scoped messaging">
            <ChatMini />
          </Tile>
          <Tile title="Bidirectional reviews" caption="Mutual reputation">
            <DualReviews />
          </Tile>
          <Tile title="Peer-to-peer pay" caption="Not held by Beam">
            <PaymentDiagram />
          </Tile>
        </div>
      </div>
    </LandingSection>
  )
}

function Tile({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <article className="elevated elevated-hover flex flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-[18px] text-[#FAF8F4]">{title}</h3>
          <p className="type-meta text-[#7E7A73]">{caption}</p>
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
      <circle cx="120" cy="78" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <circle cx="120" cy="78" r="36" fill="none" stroke="rgba(221,163,82,0.35)" strokeWidth="1.5" />
      <circle cx="120" cy="78" r="18" fill="none" stroke="rgba(221,163,82,0.55)" strokeWidth="1.5" />
      <circle cx="120" cy="78" r="5" fill="#DDA352" />
      <circle cx="86" cy="52" r="4" fill="#7DD3FC" />
      <circle cx="152" cy="48" r="4" fill="#86EFAC" />
      <circle cx="160" cy="96" r="4" fill="#FDA4AF" />
      <text x="70" y="42" fontSize="9" fill="#A7A39C">
        Mueller
      </text>
      <text x="156" y="40" fontSize="9" fill="#A7A39C">
        Hyde Park
      </text>
      <text x="164" y="112" fontSize="9" fill="#A7A39C">
        East Austin
      </text>
      <text x="104" y="128" fontSize="9" fill="#DDA352" fontWeight="600">
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
          <div className="flex-1 rounded-[10px] border border-white/[0.08] bg-[#121317] px-2 py-2 text-center">
            <p className="type-meta text-[#7E7A73]">{s.label}</p>
            <p className="mt-0.5 tabular-nums text-[13px] font-semibold text-[#F7F4EE]">{s.value}</p>
          </div>
          {i < steps.length - 1 ? <span className="text-[#7E7A73]">→</span> : null}
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
          className="flex aspect-square flex-col items-center justify-center rounded-[12px] text-center border border-white/[0.06]"
          style={{ background: `${c.tintBg}22`, color: c.tintFg }}
        >
          <span className="text-[11px] font-bold" style={{ color: '#E7B567' }}>
            {c.shortLabel}
          </span>
        </div>
      ))}
    </div>
  )
}

function ChatMini() {
  return (
    <div className="space-y-2 rounded-[12px] bg-[#121317] p-3">
      <div className="max-w-[90%] rounded-[12px] rounded-bl-md border border-white/[0.08] bg-[#1D2026] px-2.5 py-1.5 type-sec text-[#F7F4EE]">
        I’ll bring a dolly — ETA 45 min.
      </div>
      <div className="ml-auto max-w-[85%] rounded-[12px] rounded-br-md bg-gradient-to-b from-[#D5A455] to-[#B88842] px-2.5 py-1.5 type-sec text-[#0E0F12]">
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
        <div key={role} className="rounded-[12px] border border-white/[0.08] bg-[#121317] p-2.5">
          <p className="type-meta text-[#7E7A73]">{role}</p>
          <p className="mt-1 text-[13px] font-semibold text-[#DDA352]">★★★★★</p>
          <p className="mt-0.5 type-meta text-[#A7A39C]">Example</p>
        </div>
      ))}
    </div>
  )
}

function PaymentDiagram() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[12px] bg-[#121317] p-3">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-1">
          <Avatar name="Alex R." size={32} />
          <span className="type-meta text-[#7E7A73]">Requester</span>
        </div>
        <div className="flex flex-1 flex-col items-center">
          <div className="h-px w-full border-t border-dashed border-[#DDA352]/40" />
          <span className="price-pill mt-1">$55</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Avatar name="Maya C." size={32} />
          <span className="type-meta text-[#7E7A73]">Helper</span>
        </div>
      </div>
      <p className="text-center type-meta font-semibold text-[#A7A39C]">
        Arranged directly · Not held by Beam
      </p>
    </div>
  )
}
