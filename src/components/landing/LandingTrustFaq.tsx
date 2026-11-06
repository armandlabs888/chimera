'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { LandingSection } from '@/components/flat'

const FAQS = [
  {
    q: 'What kinds of help are in scope?',
    a: 'Moving & lifting, cleaning, tutoring, pet care, light handyman (not licensed trades), and events & photo. Beam does not cover childcare, senior care, delivery/driving, or licensed electrical/plumbing/HVAC.',
  },
  {
    q: 'Does Beam hold payments or offer escrow?',
    a: 'No. Helpers and requesters arrange payment peer-to-peer after agreeing in-thread. Beam does not process cards or guarantee funds today.',
  },
  {
    q: 'Is same-day help guaranteed?',
    a: 'No. Beam surfaces nearby open requests and priced offers with arrival windows, but availability depends on neighbors who choose to respond.',
  },
  {
    q: 'How does ranking work?',
    a: 'Browse prefers closer Austin neighborhoods first using approximate distances, then recency. It is not live GPS tracking.',
  },
  {
    q: 'What safety practices should I follow?',
    a: 'Meet in public when practical, share plans with someone you trust, keep coordination in the request thread, and use Beam’s Safety checklist.',
  },
]

export function LandingTrustFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <LandingSection id="trust" className="border-b border-black/[0.05] bg-white">
      <div className="section-inner grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <span className="eyebrow-pill">Trust &amp; scope</span>
          <h2 className="mt-3 type-h1 text-beam-charcoal">Honest boundaries</h2>
          <p className="mt-2 type-intro text-beam-cream-dim">
            Beam coordinates practical neighborhood help — not a guarantee, not escrow, not licensed
            trades.
          </p>
          <Link
            href="/safety"
            className="mt-5 inline-flex touch-target items-center rounded-[12px] bg-white px-4 text-[14px] font-semibold text-beam-cream shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-beam-surface-2"
          >
            Read Safety practices
          </Link>
        </div>

        <div className="elevated divide-y divide-black/[0.06] overflow-hidden">
          {FAQS.map((item, index) => {
            const isOpen = open === index
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold text-beam-cream hover:bg-beam-canvas"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : index)}
                  >
                    {item.q}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-beam-muted transition ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                </h3>
                {isOpen ? <p className="px-4 pb-4 type-sec text-beam-cream-dim">{item.a}</p> : null}
              </div>
            )
          })}
        </div>
      </div>
    </LandingSection>
  )
}
