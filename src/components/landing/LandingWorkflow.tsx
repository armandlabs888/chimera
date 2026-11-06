'use client'

import { useState } from 'react'
import { AppWindow, LandingSection } from '@/components/flat'
import { Avatar, Badge } from '@/components/ui'
import { EXAMPLE_LABEL, EXAMPLE_OFFER, EXAMPLE_REQUEST, EXAMPLE_THREAD } from './examples'

const TABS = [
  { id: 'post', label: '1. Post' },
  { id: 'offers', label: '2. Offers' },
  { id: 'message', label: '3. Message' },
  { id: 'complete', label: '4. Complete' },
] as const

type TabId = (typeof TABS)[number]['id']

export function LandingWorkflow() {
  const [tab, setTab] = useState<TabId>('post')

  return (
    <LandingSection id="product" band className="border-b border-black/[0.05]">
      <div className="section-inner">
        <div className="max-w-2xl">
          <span className="eyebrow-pill">Product</span>
          <h2 className="mt-3 type-h1 text-beam-charcoal">How a Beam request moves</h2>
          <p className="mt-2 type-intro text-beam-cream-dim">
            Walk the core loop inside a real workspace window — post, compare offers, message,
            complete.
          </p>
        </div>

        <div
          className="mt-4 rounded-[12px] bg-beam-warning-soft px-3.5 py-2.5 type-sec text-beam-warning shadow-[0_0_0_1px_rgba(180,83,9,0.15)]"
          role="note"
        >
          Example — illustrative workflow, not live marketplace data.
        </div>

        <AppWindow url="yariapp.com/workspace · Example" className="mt-6">
          <div className="flex min-h-[320px] flex-col lg:flex-row">
            <aside
              className="flex gap-1 overflow-x-auto border-b border-black/[0.06] bg-beam-canvas p-2 lg:w-52 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r"
              role="tablist"
              aria-label="Workflow stages"
            >
              {TABS.map((t) => {
                const selected = t.id === tab
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setTab(t.id)}
                    className={`btn-compact shrink-0 rounded-[10px] px-3 text-left text-[13px] font-semibold transition ${
                      selected
                        ? 'bg-white text-beam-cream shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                        : 'text-beam-muted hover:bg-white/70 hover:text-beam-cream'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </aside>

            <div className="min-w-0 flex-1 bg-white p-4 sm:p-5" role="tabpanel">
              {tab === 'post' ? <PanelPost /> : null}
              {tab === 'offers' ? <PanelOffers /> : null}
              {tab === 'message' ? <PanelMessage /> : null}
              {tab === 'complete' ? <PanelComplete /> : null}
            </div>
          </div>
        </AppWindow>
      </div>
    </LandingSection>
  )
}

function PanelPost() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="type-h3 text-beam-cream">Structured request</h3>
        <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
      </div>
      <div className="elevated p-4">
        <p className="type-meta text-beam-muted">{EXAMPLE_REQUEST.category}</p>
        <p className="mt-1 text-[16px] font-semibold text-beam-cream">{EXAMPLE_REQUEST.title}</p>
        <p className="mt-2 type-sec text-beam-cream-dim">{EXAMPLE_REQUEST.details}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-beam-surface-2 px-2.5 py-1 type-meta">{EXAMPLE_REQUEST.neighborhood}</span>
          <span className="rounded-full bg-beam-surface-2 px-2.5 py-1 type-meta">{EXAMPLE_REQUEST.when}</span>
          <span className="price-pill">{EXAMPLE_REQUEST.budget}</span>
        </div>
      </div>
    </div>
  )
}

function PanelOffers() {
  const offers = [
    EXAMPLE_OFFER,
    { helper: 'Jordan P.', price: '$60', eta: 'Today · 4–6pm', note: 'After work.' },
  ]
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="type-h3 text-beam-cream">Compare priced offers</h3>
        <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
      </div>
      <ul className="space-y-2">
        {offers.map((offer) => (
          <li key={offer.helper} className="elevated flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={offer.helper} size={36} />
              <div>
                <p className="text-[14px] font-semibold text-beam-cream">{offer.helper}</p>
                <p className="type-sec text-beam-muted">{offer.note ?? offer.eta}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="price-pill text-[14px]">{offer.price}</p>
              <p className="mt-1 type-meta text-beam-muted">{offer.eta}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PanelMessage() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="type-h3 text-beam-cream">Coordinate in-thread</h3>
        <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
      </div>
      <div className="space-y-2 rounded-[14px] bg-beam-canvas p-4 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="max-w-[85%] rounded-[14px] rounded-bl-md bg-white px-3 py-2 type-sec text-beam-cream shadow-[0_0_0_1px_rgba(15,23,42,0.06)]">
          {EXAMPLE_THREAD.opener}
        </div>
        <div className="ml-auto max-w-[85%] rounded-[14px] rounded-br-md bg-beam-charcoal px-3 py-2 type-sec text-white shadow-sm">
          {EXAMPLE_THREAD.reply}
        </div>
        <p className="type-meta text-beam-muted">Thread · Active · Example</p>
      </div>
    </div>
  )
}

function PanelComplete() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="type-h3 text-beam-cream">Complete &amp; review</h3>
        <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="elevated p-4">
          <p className="type-meta text-beam-muted">Requester → helper</p>
          <p className="mt-2 text-[14px] font-semibold text-beam-amber">★★★★★</p>
          <p className="mt-1 type-sec text-beam-cream-dim">On time, careful on stairs</p>
        </div>
        <div className="elevated p-4">
          <p className="type-meta text-beam-muted">Helper → requester</p>
          <p className="mt-2 text-[14px] font-semibold text-beam-amber">★★★★★</p>
          <p className="mt-1 type-sec text-beam-cream-dim">Clear access notes</p>
        </div>
      </div>
    </div>
  )
}
