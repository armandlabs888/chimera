'use client'

import { useId, useState, type ReactNode } from 'react'
import { CalendarDays, Star } from 'lucide-react'

const STEPS = [
  {
    id: 'post',
    label: '01 Post your task',
    short: 'Post your task',
    title: 'Less back-and-forth. More getting it done.',
    body: 'Describe the job and choose a budget. Then compare the offers you receive before deciding who to work with.',
    detailTitle: 'Start with the details that matter.',
    detailBody: 'What needs doing, when you need it and anything a helper should know.',
    next: 'Next: compare offers →',
    nextId: 'compare' as const,
  },
  {
    id: 'compare',
    label: '02 Compare offers',
    short: 'Compare offers',
    title: 'See priced offers side by side.',
    body: 'Review sample offers with arrival windows before you choose — this demo never posts a real task.',
    detailTitle: 'Compare what matters.',
    detailBody: 'Price, timing, and a clear path to message the helper you pick.',
    next: 'Next: chat, finish & review →',
    nextId: 'chat' as const,
  },
  {
    id: 'chat',
    label: '03 Chat, finish & review',
    short: 'Chat, finish & review',
    title: 'Stay in the loop until it’s done.',
    body: 'Message in-app, confirm details, then leave a review that helps neighbors next time.',
    detailTitle: 'Feedback stays useful.',
    detailBody: 'Two-way reviews keep the marketplace clearer for everyone.',
    next: 'Back to post your task →',
    nextId: 'post' as const,
  },
] as const

type StepId = (typeof STEPS)[number]['id']

const SAMPLE_TASKS = [
  {
    id: 'couch',
    label: 'Help move a couch upstairs',
    when: 'Choose a day',
    budget: 'Set your budget',
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
    meta: 'Sample · Today 4pm',
    price: '$68',
    initials: 'CR',
    tint: '#DBEAFE',
    fg: '#1D5CE5',
  },
  {
    id: 'sofia',
    name: 'Sofia R.',
    meta: 'Sample · Today 2pm',
    price: '$72',
    initials: 'SR',
    tint: '#FFE4E6',
    fg: '#BE123C',
  },
  {
    id: 'hassan',
    name: 'Hassan K.',
    meta: 'Sample · Tomorrow',
    price: '$55',
    initials: 'HK',
    tint: '#D1FAE5',
    fg: '#047857',
  },
] as const

function DemoPostTask() {
  const [taskId, setTaskId] = useState<(typeof SAMPLE_TASKS)[number]['id']>('couch')
  const task = SAMPLE_TASKS.find((t) => t.id === taskId) ?? SAMPLE_TASKS[0]
  const groupId = useId()

  return (
    <div className="flex h-full flex-col gap-3" data-testid="how-demo-panel-post">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D5CE5]">
        Try a sample task
      </p>
      <p className="font-sans text-[17px] font-bold leading-snug text-[#071330]">
        What do you need a hand with?
      </p>

      <p id={groupId} className="sr-only">
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
              className={`min-h-11 rounded-[10px] px-2.5 py-1.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 sm:min-h-9 ${
                pressed
                  ? 'bg-[#1D5CE5] text-white'
                  : 'bg-[#F4F8FD] text-[#071330] ring-1 ring-[#E2E8F0] hover:bg-[#EEF4FF]'
              }`}
            >
              {t.id === 'couch' ? 'Moving' : t.id === 'clean' ? 'Cleaning' : 'Pets'}
            </button>
          )
        })}
      </div>

      <div
        className="rounded-[10px] border border-[#E2E8F0] bg-white px-3.5 py-3"
        data-testid="how-demo-task-summary"
      >
        <p className="text-[13.5px] font-semibold leading-snug text-[#071330]">{task.label}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-[8px] bg-[#F4F8FD] px-2.5 py-2">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              <CalendarDays className="h-3 w-3" strokeWidth={2} aria-hidden />
              When
            </p>
            <p className="mt-0.5 text-[12.5px] font-semibold text-[#071330]">{task.when}</p>
          </div>
          <div className="rounded-[8px] bg-[#F4F8FD] px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              Budget
            </p>
            <p className="mt-0.5 text-[12.5px] font-semibold tabular-nums text-[#071330]">
              {task.budget}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="inline-flex h-11 min-h-11 w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] text-[14px] font-semibold text-white transition hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2"
        data-testid="how-demo-use-example"
        onClick={() => setTaskId('couch')}
      >
        Use this example
      </button>
      <p className="text-center text-[11.5px] leading-snug text-[#64748B]">
        Illustrative example — no task is posted.
      </p>
    </div>
  )
}

function DemoCompareOffers() {
  const [offerId, setOfferId] = useState<(typeof SAMPLE_OFFERS)[number]['id']>('sofia')
  const groupId = useId()
  const selected = SAMPLE_OFFERS.find((o) => o.id === offerId) ?? SAMPLE_OFFERS[0]

  return (
    <div className="flex h-full flex-col gap-2.5" data-testid="how-demo-panel-compare">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D5CE5]">
        Try a sample offer list
      </p>
      <p id={groupId} className="font-sans text-[17px] font-bold leading-snug text-[#071330]">
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
              className={`flex min-h-11 w-full items-center gap-2.5 rounded-[10px] border bg-white px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 ${
                selectedOffer
                  ? 'border-[#1D5CE5] shadow-[0_0_0_1px_rgba(29,92,229,0.2)]'
                  : 'border-[#E2E8F0] hover:border-[#93C5FD]'
              }`}
            >
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-bold"
                style={{ background: offer.tint, color: offer.fg }}
                aria-hidden
              >
                {offer.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-[#071330]">
                  {offer.name}
                </span>
                <span className="block truncate text-[11px] text-[#64748B]">{offer.meta}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[10px] font-medium uppercase tracking-wide text-[#64748B]">
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
      <p
        className="text-[12px] font-medium text-[#64748B]"
        data-testid="how-demo-offer-status"
        aria-live="polite"
      >
        Viewing sample offer from{' '}
        <span className="font-semibold text-[#071330]">{selected.name}</span>
      </p>
    </div>
  )
}

function DemoChatReview() {
  const [rating, setRating] = useState(5)
  const groupId = useId()

  return (
    <div className="flex h-full flex-col gap-3" data-testid="how-demo-panel-chat">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1D5CE5]">
        Try a sample review
      </p>
      <div className="space-y-2" aria-hidden="true">
        <div className="max-w-[88%] rounded-[10px] rounded-bl-md bg-[#F4F8FD] px-3 py-2 text-[12px] leading-snug text-[#071330] ring-1 ring-[#E2E8F0]">
          On my way — 10 min out
        </div>
        <div className="ml-auto max-w-[88%] rounded-[10px] rounded-br-md bg-[#1D5CE5] px-3 py-2 text-[12px] leading-snug text-white">
          Perfect, side gate is open!
        </div>
      </div>

      <div className="rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-3">
        <p id={groupId} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
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
                className={`inline-flex h-11 w-11 items-center justify-center rounded-[8px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:hover:scale-105 motion-reduce:transform-none ${
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
        <p
          className="mt-2 text-[12px] font-medium text-[#64748B]"
          data-testid="how-demo-rating-status"
          aria-live="polite"
        >
          Sample rating: <span className="font-semibold text-[#071330]">{rating} / 5</span>
        </p>
      </div>
    </div>
  )
}

function PanelShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-5 shadow-[0_16px_40px_-20px_rgba(7,19,48,0.22)] sm:p-6">
      {children}
    </div>
  )
}

/** Interactive How it works — Paper tabs + local sample demos (illustrative only). */
export function LandingHowItWorks() {
  const [stepId, setStepId] = useState<StepId>('post')
  const step = STEPS.find((s) => s.id === stepId) ?? STEPS[0]
  const tablistId = useId()

  return (
    <section
      id="how-it-works"
      className="bg-[#F4F8FD] py-16 sm:py-20"
      data-testid="how-it-works-section"
    >
      <div className="beam-container">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D5CE5]">
          02 / How it works
        </p>
        <h2 className="mt-3 max-w-[16ch] font-sans text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[#071330]">
          From to-do to done.
        </h2>
        <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.5] text-[#475569]">
          Explore the steps before posting your own task.
        </p>

        <div
          role="tablist"
          aria-labelledby={tablistId}
          data-testid="how-it-works-steps"
          className="mt-8 grid gap-2 sm:grid-cols-3 sm:gap-3"
        >
          <span id={tablistId} className="sr-only">
            How it works steps
          </span>
          {STEPS.map((s) => {
            const selected = s.id === stepId
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                id={`how-tab-${s.id}`}
                aria-selected={selected}
                aria-controls={`how-panel-${s.id}`}
                data-testid={`how-tab-${s.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setStepId(s.id)}
                className={`inline-flex min-h-11 items-center justify-center rounded-[10px] px-3 py-3 text-left text-[13.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F8FD] sm:justify-start sm:px-4 ${
                  selected
                    ? 'bg-[#1D5CE5] text-white'
                    : 'border border-[#E2E8F0] bg-white text-[#071330] hover:bg-[#EEF4FF]'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        {STEPS.map((s) => {
          const selected = s.id === stepId
          return (
            <div
              key={s.id}
              role="tabpanel"
              id={`how-panel-${s.id}`}
              aria-labelledby={`how-tab-${s.id}`}
              hidden={!selected}
              data-testid={`how-panel-${s.id}`}
              className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10"
            >
              {selected ? (
                <>
                  <PanelShell>
                    {s.id === 'post' ? <DemoPostTask /> : null}
                    {s.id === 'compare' ? <DemoCompareOffers /> : null}
                    {s.id === 'chat' ? <DemoChatReview /> : null}
                  </PanelShell>
                  <div className="min-w-0 lg:pt-2">
                    <h3 className="font-sans text-[clamp(1.25rem,2.2vw,1.6rem)] font-bold leading-snug tracking-[-0.02em] text-[#071330]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-[1.55] text-[#475569]">{step.body}</p>
                    <h4 className="mt-6 text-[15px] font-bold text-[#071330]">{step.detailTitle}</h4>
                    <p className="mt-1.5 text-[14.5px] leading-[1.55] text-[#475569]">
                      {step.detailBody}
                    </p>
                    <button
                      type="button"
                      className="mt-6 inline-flex min-h-11 items-center text-[14.5px] font-semibold text-[#1D5CE5] underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
                      data-testid={`how-next-${s.id}`}
                      onClick={() => setStepId(s.nextId)}
                    >
                      {s.next}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
