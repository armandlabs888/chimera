'use client'

import { useState } from 'react'
import { LandingSection } from '@/components/flat'
import { Badge } from '@/components/ui'
import { EXAMPLE_LABEL, EXAMPLE_OFFER, EXAMPLE_REQUEST, EXAMPLE_THREAD } from './examples'

const TABS = [
  { id: 'post', label: '1. Post a request' },
  { id: 'offers', label: '2. Compare priced offers' },
  { id: 'message', label: '3. Coordinate in-thread' },
  { id: 'complete', label: '4. Complete & review' },
] as const

type TabId = (typeof TABS)[number]['id']

export function LandingWorkflow() {
  const [tab, setTab] = useState<TabId>('post')

  return (
    <LandingSection id="product" band className="border-b border-beam-line">
      <div className="section-inner">
        <div className="max-w-2xl">
          <p className="flat-meta text-beam-amber-deep">Product</p>
          <h2 className="mt-2 type-h1 text-beam-charcoal">How a Beam request moves</h2>
          <p className="mt-2 type-intro text-beam-cream-dim">
            Interactive walkthrough of the core loop — post, compare offers with arrival windows,
            message, complete, and review.
          </p>
        </div>

        <div
          className="mt-4 rounded-[10px] border border-amber-200 bg-beam-warning-soft px-3.5 py-2.5 type-sec text-beam-warning"
          role="note"
        >
          Example — illustrative workflow, not live marketplace data.
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:gap-6">
          <div
            className="flex shrink-0 gap-1 overflow-x-auto lg:w-56 lg:flex-col lg:overflow-visible"
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
                  className={`btn-compact shrink-0 rounded-[10px] px-3.5 text-left text-[13px] font-medium transition ${
                    selected
                      ? 'bg-beam-charcoal text-white'
                      : 'border border-beam-line bg-beam-base text-beam-cream-dim hover:bg-beam-surface-3'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="product-frame min-w-0 flex-1 p-4 sm:p-5" role="tabpanel">
            {tab === 'post' ? <PanelPost /> : null}
            {tab === 'offers' ? <PanelOffers /> : null}
            {tab === 'message' ? <PanelMessage /> : null}
            {tab === 'complete' ? <PanelComplete /> : null}
          </div>
        </div>
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
      <p className="type-sec text-beam-muted">
        Category, neighborhood, when, budget, and clear details — so helpers know scope before they
        offer.
      </p>
      <div className="mt-4 rounded-[10px] border border-beam-line bg-beam-surface-2 p-4">
        <p className="type-meta text-beam-muted">{EXAMPLE_REQUEST.category}</p>
        <p className="mt-1 text-[16px] font-semibold text-beam-cream">{EXAMPLE_REQUEST.title}</p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="type-meta text-beam-muted">Where</dt>
            <dd className="type-sec text-beam-cream">{EXAMPLE_REQUEST.neighborhood}</dd>
          </div>
          <div>
            <dt className="type-meta text-beam-muted">When</dt>
            <dd className="type-sec text-beam-cream">{EXAMPLE_REQUEST.when}</dd>
          </div>
          <div>
            <dt className="type-meta text-beam-muted">Budget</dt>
            <dd className="tabular-nums type-sec font-semibold text-beam-cream">
              {EXAMPLE_REQUEST.budget}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function PanelOffers() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="type-h3 text-beam-cream">Compare priced offers</h3>
        <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
      </div>
      <p className="type-sec text-beam-muted">
        Each offer includes a price and arrival window — not an open chat thread first.
      </p>
      <ul className="mt-4 space-y-2">
        {[EXAMPLE_OFFER, { helper: 'Jordan P.', price: '$60', eta: 'Today · 4–6pm', note: 'Can help after work.' }].map(
          (offer) => (
            <li
              key={offer.helper}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-beam-line bg-beam-base px-3.5 py-3"
            >
              <div>
                <p className="text-[14px] font-semibold text-beam-cream">{offer.helper}</p>
                <p className="type-sec text-beam-muted">{offer.note}</p>
              </div>
              <div className="text-right">
                <p className="tabular-nums text-[16px] font-semibold text-beam-charcoal">{offer.price}</p>
                <p className="type-meta text-beam-muted">{offer.eta}</p>
              </div>
            </li>
          ),
        )}
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
      <p className="type-sec text-beam-muted">
        After you accept, messaging stays scoped to that request — timing, access, and handoff.
      </p>
      <div className="mt-4 space-y-2 rounded-[10px] border border-beam-line bg-beam-surface-2 p-4">
        <div className="max-w-[85%] rounded-[10px] bg-beam-base px-3 py-2 type-sec text-beam-cream border border-beam-line">
          {EXAMPLE_THREAD.opener}
        </div>
        <div className="ml-auto max-w-[85%] rounded-[10px] bg-beam-charcoal px-3 py-2 type-sec text-white">
          {EXAMPLE_THREAD.reply}
        </div>
        <p className="type-meta text-beam-muted">Thread status · Active · Example</p>
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
      <p className="type-sec text-beam-muted">
        Mark the job done, then leave a short bidirectional review. Payments stay peer-to-peer —
        Beam does not hold funds.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[10px] border border-beam-line bg-beam-base p-4">
          <p className="type-meta text-beam-muted">Requester → helper</p>
          <p className="mt-2 text-[14px] font-semibold text-beam-cream">★★★★★ On time, careful on stairs</p>
        </div>
        <div className="rounded-[10px] border border-beam-line bg-beam-base p-4">
          <p className="type-meta text-beam-muted">Helper → requester</p>
          <p className="mt-2 text-[14px] font-semibold text-beam-cream">★★★★★ Clear access notes</p>
        </div>
      </div>
    </div>
  )
}
