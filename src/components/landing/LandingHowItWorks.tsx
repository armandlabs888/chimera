'use client'

import { useId, useState, type ReactNode } from 'react'
import { CalendarDays, Check, Star } from 'lucide-react'

const SAMPLE_TASKS = [
  {
    id: 'couch',
    label: 'Move a couch to 3rd floor',
    when: 'Today',
    budget: '$60–$90',
  },
  {
    id: 'clean',
    label: 'Kitchen reset after brunch',
    when: 'Tomorrow',
    budget: '$55–$80',
  },
  {
    id: 'walk',
    label: 'Afternoon dog walk (30 min)',
    when: 'Today',
    budget: '$25–$40',
  },
] as const

const SAMPLE_OFFERS = [
  {
    id: 'caleb',
    name: 'Caleb R.',
    meta: '4.9 · Today 4pm',
    price: '$68',
    initials: 'CR',
    tint: '#DBEAFE',
    fg: '#1D5CE5',
  },
  {
    id: 'sofia',
    name: 'Sofia R.',
    meta: '5.0 · Today 2pm',
    price: '$72',
    initials: 'SR',
    tint: '#FFE4E6',
    fg: '#BE123C',
  },
  {
    id: 'hassan',
    name: 'Hassan K.',
    meta: '4.8 · Tomorrow',
    price: '$55',
    initials: 'HK',
    tint: '#D1FAE5',
    fg: '#047857',
  },
] as const

function SampleBadge() {
  return (
    <span className="absolute right-3 top-3 z-10 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#475569] ring-1 ring-[rgba(7,19,48,0.1)]">
      Sample
    </span>
  )
}

function StepCard({
  step,
  title,
  body,
  children,
}: {
  step: string
  title: string
  body: string
  children: ReactNode
}) {
  return (
    <li className="relative flex h-full flex-col overflow-hidden rounded-[10px] border border-[#C7D7F0] bg-white shadow-[0_14px_36px_-18px_rgba(29,92,229,0.28)]">
      <div className="flex items-start gap-3 border-b border-[#E8EEF7] px-5 py-4 sm:px-5 sm:py-4">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1D5CE5] text-[13px] font-bold text-white"
        >
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold leading-snug text-[#071330]">{title}</h3>
          <p className="mt-1 text-[14px] leading-[1.5] text-[#475569]">{body}</p>
        </div>
      </div>
      <div className="relative flex min-h-[248px] flex-1 flex-col bg-[#EEF4FF] p-4 sm:min-h-[260px] sm:p-5">
        <SampleBadge />
        {children}
      </div>
    </li>
  )
}

function DemoPostTask() {
  const [taskId, setTaskId] = useState<(typeof SAMPLE_TASKS)[number]['id']>('couch')
  const task = SAMPLE_TASKS.find((t) => t.id === taskId) ?? SAMPLE_TASKS[0]
  const groupId = useId()

  return (
    <div className="flex h-full flex-col justify-center gap-3 pt-4">
      <p id={groupId} className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1D5CE5]">
        Choose a sample task
      </p>
      <div
        role="group"
        aria-labelledby={groupId}
        className="flex flex-wrap gap-1.5"
        data-testid="how-demo-tasks"
      >
        {SAMPLE_TASKS.map((t) => {
          const pressed = t.id === taskId
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={pressed}
              data-testid={`how-demo-task-${t.id}`}
              onClick={() => setTaskId(t.id)}
              className={`rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF4FF] ${
                pressed
                  ? 'bg-[#1D5CE5] text-white'
                  : 'bg-white text-[#071330] ring-1 ring-[#C7D7F0] hover:bg-[#F8FAFC]'
              }`}
            >
              {t.id === 'couch' ? 'Moving' : t.id === 'clean' ? 'Cleaning' : 'Pets'}
            </button>
          )
        })}
      </div>

      <div
        className="rounded-[10px] border border-[#C7D7F0] bg-white p-3 shadow-[0_8px_20px_-14px_rgba(29,92,229,0.35)]"
        data-testid="how-demo-task-summary"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
          What do you need?
        </p>
        <p className="mt-1.5 text-[13px] font-semibold leading-snug text-[#071330]">{task.label}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-[#F4F8FD] px-2.5 py-2">
            <p className="flex items-center gap-1 text-[10px] font-medium text-[#475569]">
              <CalendarDays className="h-3 w-3" strokeWidth={2} aria-hidden />
              When
            </p>
            <p className="mt-0.5 text-[12px] font-semibold text-[#071330]">{task.when}</p>
          </div>
          <div className="rounded-md bg-[#F4F8FD] px-2.5 py-2">
            <p className="text-[10px] font-medium text-[#475569]">Sample budget</p>
            <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-[#071330]">{task.budget}</p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#EEF4FF] px-2.5 py-1.5 text-[12px] font-semibold text-[#1D5CE5]">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          Sample draft ready
        </p>
      </div>
    </div>
  )
}

function DemoCompareOffers() {
  const [offerId, setOfferId] = useState<(typeof SAMPLE_OFFERS)[number]['id']>('sofia')
  const groupId = useId()
  const selected = SAMPLE_OFFERS.find((o) => o.id === offerId) ?? SAMPLE_OFFERS[0]

  return (
    <div className="flex h-full flex-col justify-center gap-2.5 pt-4">
      <p id={groupId} className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1D5CE5]">
        Select a sample offer
      </p>
      <div
        role="group"
        aria-labelledby={groupId}
        className="space-y-2"
        data-testid="how-demo-offers"
      >
        {SAMPLE_OFFERS.map((offer) => {
          const selectedOffer = offer.id === offerId
          return (
            <button
              key={offer.id}
              type="button"
              aria-pressed={selectedOffer}
              data-testid={`how-demo-offer-${offer.id}`}
              onClick={() => setOfferId(offer.id)}
              className={`flex w-full items-center gap-2.5 rounded-[10px] border bg-white px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF4FF] ${
                selectedOffer
                  ? 'border-[#1D5CE5] shadow-[0_0_0_1px_rgba(29,92,229,0.2)]'
                  : 'border-[#C7D7F0] hover:border-[#93C5FD]'
              }`}
            >
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                style={{ background: offer.tint, color: offer.fg }}
                aria-hidden
              >
                {offer.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-[#071330]">
                  {offer.name}
                </span>
                <span className="block truncate text-[11px] text-[#475569]">{offer.meta}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[10px] font-medium uppercase tracking-wide text-[#475569]">
                  Sample
                </span>
                <span className="block text-[13px] font-bold tabular-nums text-[#071330]">
                  {offer.price}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-[12px] font-medium text-[#475569]" data-testid="how-demo-offer-status" aria-live="polite">
        Viewing sample offer from <span className="font-semibold text-[#071330]">{selected.name}</span>
      </p>
    </div>
  )
}

function DemoChatReview() {
  const [rating, setRating] = useState(5)
  const groupId = useId()

  return (
    <div className="flex h-full flex-col justify-center gap-3 pt-4">
      <div className="space-y-2" aria-hidden="true">
        <div className="max-w-[88%] rounded-[10px] rounded-bl-md bg-white px-3 py-2 text-[12px] leading-snug text-[#071330] ring-1 ring-[#C7D7F0]">
          On my way — 10 min out
        </div>
        <div className="ml-auto max-w-[88%] rounded-[10px] rounded-br-md bg-[#1D5CE5] px-3 py-2 text-[12px] leading-snug text-white">
          Perfect, side gate is open!
        </div>
      </div>

      <div className="rounded-[10px] border border-[#C7D7F0] bg-white px-3 py-3">
        <p id={groupId} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
          Sample review · Rate Sofia
        </p>
        <div
          role="group"
          aria-labelledby={groupId}
          className="mt-2 flex items-center gap-1"
          data-testid="how-demo-rating"
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const value = i + 1
            const active = value <= rating
            return (
              <button
                key={value}
                type="button"
                aria-label={`Set sample rating to ${value} star${value === 1 ? '' : 's'}`}
                aria-pressed={rating === value}
                data-testid={`how-demo-star-${value}`}
                data-active={active ? 'true' : 'false'}
                onClick={() => setRating(value)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:hover:scale-105 motion-reduce:transform-none ${
                  active
                    ? 'bg-[#FFF7ED] text-[#B45309] ring-1 ring-[#92400E]/45'
                    : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#071330]'
                }`}
              >
                <Star
                  className={`h-5 w-5 ${active ? 'fill-current' : ''}`}
                  strokeWidth={active ? 1.5 : 2}
                  aria-hidden
                />
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[12px] font-medium text-[#475569]" data-testid="how-demo-rating-status" aria-live="polite">
          Sample rating: <span className="font-semibold text-[#071330]">{rating} / 5</span>
        </p>
      </div>
    </div>
  )
}

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#FFF8EF] py-16 sm:py-20 lg:py-24">
      <div className="beam-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-md bg-[#FFE8D1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#9A3412]">
            3 Simple steps
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330]">
            Book in minutes, not days
          </h2>
          <p className="mt-3 text-[16px] leading-[1.55] text-[#475569]">
            A clear path from task to trusted local help — no phone tag, no surprise fees. Try the
            sample demos below.
          </p>
        </div>

        <ol
          className="relative mt-12 grid items-stretch gap-5 md:grid-cols-3 md:gap-5 lg:gap-6"
          data-testid="how-it-works-steps"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[18%] right-[18%] top-[2.75rem] hidden border-t border-dashed border-[#93C5FD] md:block"
          />

          <StepCard
            step="1"
            title="Post your task"
            body="Describe what you need, pin your neighborhood, and set a fair budget. Posting is always free."
          >
            <DemoPostTask />
          </StepCard>

          <StepCard
            step="2"
            title="Compare fast offers"
            body="Review priced offers with arrival windows side by side with neighbor ratings."
          >
            <DemoCompareOffers />
          </StepCard>

          <StepCard
            step="3"
            title="Chat, finish & review"
            body="Message in-app, arrange payment when the job’s done, and leave a two-way review."
          >
            <DemoChatReview />
          </StepCard>
        </ol>
      </div>
    </section>
  )
}
