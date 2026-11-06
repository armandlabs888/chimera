'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LandingSection } from '@/components/flat'
import { EXAMPLE_OFFER, EXAMPLE_REQUEST, EXAMPLE_THREAD } from './examples'

const STEPS = [
  {
    id: '01',
    title: 'Post what you need',
    body: 'Say what, where and when, and set a budget. Takes a minute.',
  },
  {
    id: '02',
    title: 'Compare priced offers',
    body: 'Neighbors reply with a price and an arrival window. Pick the one that fits.',
    link: { href: '/browse', label: 'Want to help instead? Browse open requests' },
  },
  {
    id: '03',
    title: 'Get it done, pay directly',
    body: 'Coordinate in the thread, pay them directly, and review each other. Beam never holds your money.',
  },
] as const

export function LandingHowItWorks() {
  const [step, setStep] = useState(1)

  return (
    <LandingSection id="how-it-works">
      <div className="beam-container grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div>
          <h2
            className="font-serif text-[clamp(2.25rem,3.9vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.018em] text-[#F6F3EE]"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            How Beam works
          </h2>
          <ol
            className="mt-12 divide-y divide-white/[0.08] border-y border-white/[0.08]"
            role="tablist"
            aria-label="How Beam works"
          >
            {STEPS.map((s, i) => {
              const active = step === i
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`how-preview-${s.id}`}
                    id={`how-tab-${s.id}`}
                    onClick={() => setStep(i)}
                    className="grid w-full grid-cols-[48px_1fr] gap-3 py-7 text-left transition"
                  >
                    <span
                      className={`font-serif text-[22px] tabular-nums ${
                        active ? 'text-[#D6B06C]' : 'text-[#85817A]'
                      }`}
                      style={{ fontVariationSettings: "'opsz' 36" }}
                    >
                      {s.id}
                    </span>
                    <div>
                      <h3 className="text-[19px] font-medium leading-[1.3] tracking-[0.005em] text-[#F6F3EE]">
                        {s.title}
                      </h3>
                      <p className="mt-2 text-[16px] leading-[1.55] text-[#B7B2AA]">{s.body}</p>
                      {'link' in s && s.link ? (
                        <Link
                          href={s.link.href}
                          className="mt-3 inline-flex items-center gap-1 text-[15px] font-medium text-[#D6B06C] hover:text-[#E2B66A]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {s.link.label} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <div>
          <div
            id={`how-preview-${STEPS[step].id}`}
            role="tabpanel"
            aria-labelledby={`how-tab-${STEPS[step].id}`}
            className="min-h-[340px] rounded-[20px] bg-[#1B1C20] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,.7)] ring-1 ring-white/[0.08]"
          >
            <Preview step={step} />
          </div>
          <p className="mt-3 text-[13px] text-[#85817A]">Illustrative example</p>
        </div>
      </div>
    </LandingSection>
  )
}

function Preview({ step }: { step: number }) {
  return (
    <div className="transition-opacity duration-180 motion-reduce:transition-none">
      <p className="text-[13px] font-medium tracking-[0.01em] text-[#D6B06C]">
        {EXAMPLE_REQUEST.category}
      </p>
      <h4 className="mt-1.5 text-[19px] font-medium text-[#F6F3EE]">{EXAMPLE_REQUEST.title}</h4>

      {step === 0 ? (
        <>
          <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-[#B7B2AA]">
            {EXAMPLE_REQUEST.details}
          </p>
          <p className="mt-4 text-[13px] text-[#85817A]">
            {EXAMPLE_REQUEST.neighborhood} · {EXAMPLE_REQUEST.when} · Budget {EXAMPLE_REQUEST.budget}
          </p>
        </>
      ) : null}

      {step === 1 ? (
        <ul className="mt-5 divide-y divide-white/[0.08]">
          {[
            EXAMPLE_OFFER,
            {
              helper: 'Jordan P.',
              price: '$60',
              eta: 'Today · 4–6pm',
              note: '★ 4.7 · 1.2 mi',
            },
          ].map((o, i) => (
            <li key={o.helper} className="flex items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-3">
                <img
                  src={
                    i === 0
                      ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'
                      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80'
                  }
                  alt=""
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
                />
                <div>
                  <p className="text-[15px] font-medium text-[#F6F3EE]">{o.helper}</p>
                  <p className="text-[13px] text-[#85817A]">
                    {i === 0 ? '★ 4.9 · 0.8 mi' : o.note}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className="font-serif text-[24px] leading-none text-[#F6F3EE] tabular-nums"
                  style={{ fontVariationSettings: "'opsz' 36" }}
                >
                  {o.price}
                </p>
                <p className="mt-1 text-[12px] text-[#85817A]">{o.eta}</p>
                {i === 0 ? (
                  <button
                    type="button"
                    className="mt-2 inline-flex h-10 items-center rounded-[10px] bg-gradient-to-b from-[#DCAB5A] to-[#BD8A41] px-4 text-[13px] font-medium text-[#FFF8EC]"
                  >
                    Accept
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mt-2 inline-flex h-10 items-center rounded-[10px] border border-white/[0.14] px-4 text-[13px] font-medium text-[#F6F3EE]"
                  >
                    Message
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {step === 2 ? (
        <div className="mt-5 space-y-3">
          <div className="max-w-[90%] rounded-[18px] bg-[#141518] px-3.5 py-2.5 text-[14px] text-[#F6F3EE]">
            {EXAMPLE_THREAD.opener}
          </div>
          <div className="ml-auto max-w-[85%] rounded-[18px] bg-[#2A2620] px-3.5 py-2.5 text-[14px] text-[#F6F3EE]">
            {EXAMPLE_THREAD.reply}
          </div>
          <p className="pt-2 text-[13px] text-[#85817A]">Paid directly · Venmo</p>
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-[10px] border border-white/[0.14] px-4 text-[13px] font-medium text-[#F6F3EE]"
          >
            Leave a review
          </button>
        </div>
      ) : null}
    </div>
  )
}
