'use client'

import { useState } from 'react'
import { LandingSection } from '@/components/flat'
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
    <LandingSection id="how-it-works" band>
      <div className="section-inner">
        <div className="max-w-2xl">
          <p className="flat-meta">How it works</p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,3.6vw,3rem)] font-normal text-[#FAF8F4]">
            From request to done
          </h2>
          <p className="mt-2 text-[17px] text-[#A7A39C]">
            Post, compare priced offers with arrival windows, coordinate in-thread, then complete
            and review.
          </p>
        </div>

        <div
          className="mt-4 rounded-[12px] border border-[#DDA352]/25 bg-[rgba(221,163,82,0.1)] px-3.5 py-2.5 text-[13px] text-[#E7B567]"
          role="note"
        >
          Example — illustrative workflow, not live marketplace data.
        </div>

        <div className="elevated-md mt-6 overflow-hidden">
          <div className="flex min-h-[300px] flex-col lg:flex-row">
            <aside
              className="flex gap-1 overflow-x-auto border-b border-white/[0.07] bg-[#121317] p-2 lg:w-52 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r"
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
                    className={`btn-compact shrink-0 rounded-[10px] px-3 text-left text-[13px] font-medium transition ${
                      selected
                        ? 'bg-[#1D2026] text-[#FAF8F4] shadow-[inset_0_0_0_1px_rgba(221,163,82,0.35)]'
                        : 'text-[#A7A39C] hover:bg-white/[0.04] hover:text-[#F7F4EE]'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </aside>

            <div className="min-w-0 flex-1 bg-[#16181D] p-4 sm:p-5" role="tabpanel">
              {tab === 'post' ? (
                <Panel>
                  <h3 className="font-serif text-[22px] text-[#FAF8F4]">Structured request</h3>
                  <div className="elevated mt-4 p-4">
                    <p className="type-meta text-[#DDA352]">{EXAMPLE_REQUEST.category}</p>
                    <p className="mt-1 text-[16px] font-medium text-[#F7F4EE]">{EXAMPLE_REQUEST.title}</p>
                    <p className="mt-2 type-sec text-[#A7A39C]">{EXAMPLE_REQUEST.details}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 px-2.5 py-1 type-meta text-[#D4D0C8]">
                        {EXAMPLE_REQUEST.neighborhood}
                      </span>
                      <span className="price-pill">{EXAMPLE_REQUEST.budget}</span>
                    </div>
                  </div>
                </Panel>
              ) : null}
              {tab === 'offers' ? (
                <Panel>
                  <h3 className="font-serif text-[22px] text-[#FAF8F4]">Compare priced offers</h3>
                  <ul className="mt-4 space-y-2">
                    {[EXAMPLE_OFFER, { helper: 'Jordan P.', price: '$60', eta: 'Today · 4–6pm', note: 'After work.' }].map(
                      (o) => (
                        <li key={o.helper} className="elevated flex items-center justify-between gap-3 p-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={o.helper} size={36} />
                            <div>
                              <p className="text-[14px] font-medium text-[#F7F4EE]">{o.helper}</p>
                              <p className="type-sec text-[#A7A39C]">{o.note ?? o.eta}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="price-pill">{o.price}</span>
                            <p className="mt-1 type-meta text-[#7E7A73]">{o.eta}</p>
                          </div>
                        </li>
                      ),
                    )}
                  </ul>
                </Panel>
              ) : null}
              {tab === 'message' ? (
                <Panel>
                  <h3 className="font-serif text-[22px] text-[#FAF8F4]">Coordinate in-thread</h3>
                  <div className="mt-4 space-y-2 rounded-[14px] bg-[#121317] p-4">
                    <div className="max-w-[85%] rounded-[14px] rounded-bl-md border border-white/[0.08] bg-[#1D2026] px-3 py-2 type-sec text-[#F7F4EE]">
                      {EXAMPLE_THREAD.opener}
                    </div>
                    <div className="ml-auto max-w-[85%] rounded-[14px] rounded-br-md bg-gradient-to-b from-[#D5A455] to-[#B88842] px-3 py-2 type-sec text-[#0E0F12]">
                      {EXAMPLE_THREAD.reply}
                    </div>
                  </div>
                </Panel>
              ) : null}
              {tab === 'complete' ? (
                <Panel>
                  <h3 className="font-serif text-[22px] text-[#FAF8F4]">Complete &amp; review</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {['Requester → helper', 'Helper → requester'].map((label) => (
                      <div key={label} className="elevated p-4">
                        <p className="type-meta text-[#7E7A73]">{label}</p>
                        <p className="mt-2 text-[14px] font-medium text-[#DDA352]">★★★★★</p>
                        <p className="mt-1 type-sec text-[#A7A39C]">Example review</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </LandingSection>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
      </div>
      {children}
    </div>
  )
}
