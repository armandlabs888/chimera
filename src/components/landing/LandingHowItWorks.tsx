import Link from 'next/link'
import { CalendarDays, Star } from 'lucide-react'

const STEPS = [
  {
    id: '1',
    title: 'Post your task',
    body: 'Describe what you need, pin your neighborhood, and set a fair budget. Posting is always free.',
    Preview: PreviewPostTask,
  },
  {
    id: '2',
    title: 'Compare fast offers',
    body: 'Review priced offers with arrival windows side by side with neighbor ratings.',
    Preview: PreviewCompareOffers,
  },
  {
    id: '3',
    title: 'Chat, finish & review',
    body: 'Message in-app, arrange payment when the job’s done, and leave a two-way review.',
    Preview: PreviewChatReview,
  },
] as const

const SAMPLE_OFFERS = [
  { name: 'Caleb R.', meta: '4.9 · Today 4pm', price: '$68', initials: 'CR', tint: '#DBEAFE', fg: '#1D5CE5', best: false },
  { name: 'Sofia R.', meta: '5.0 · Today 2pm', price: '$72', initials: 'SR', tint: '#FFE4E6', fg: '#E11D48', best: true },
  { name: 'Hassan K.', meta: '4.8 · Tomorrow', price: '$55', initials: 'HK', tint: '#D1FAE5', fg: '#059669', best: false },
] as const

function StepMarker({ n, className = '' }: { n: string; className?: string }) {
  return (
    <span
      className={`absolute z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#071330] text-[12px] font-bold text-white shadow-sm ${className}`}
    >
      {n}
    </span>
  )
}

function SampleBadge() {
  return (
    <span className="absolute right-3 top-3 z-10 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] ring-1 ring-[rgba(7,19,48,0.08)]">
      Sample
    </span>
  )
}

function PreviewPostTask() {
  return (
    <div className="relative flex h-full flex-col justify-center p-4 sm:p-5" aria-hidden="true">
      <SampleBadge />
      <div className="relative mt-2 rounded-lg border border-[rgba(7,19,48,0.08)] bg-white p-3 shadow-sm">
        <StepMarker n="1" className="left-2 top-[3.35rem]" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
          What do you need?
        </p>
        <p className="mt-1.5 rounded-md border border-[rgba(7,19,48,0.1)] bg-[#F8FAFC] px-2.5 py-2 text-[12.5px] font-medium text-[#071330]">
          Move a couch to 3rd floor
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-[rgba(7,19,48,0.08)] bg-[#F8FAFC] px-2.5 py-2">
            <p className="flex items-center gap-1 text-[10px] font-medium text-[#94A3B8]">
              <CalendarDays className="h-3 w-3" strokeWidth={2} />
              When
            </p>
            <p className="mt-0.5 text-[12px] font-semibold text-[#071330]">Today</p>
          </div>
          <div className="rounded-md border border-[rgba(7,19,48,0.08)] bg-[#F8FAFC] px-2.5 py-2">
            <p className="text-[10px] font-medium text-[#94A3B8]">Budget</p>
            <p className="mt-0.5 text-[12px] font-semibold text-[#071330]">$60–$90</p>
          </div>
        </div>
        <span className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg bg-[#1D5CE5] text-[12.5px] font-semibold text-white">
          Post task
        </span>
      </div>
    </div>
  )
}

function PreviewCompareOffers() {
  return (
    <div className="relative flex h-full flex-col justify-center p-4 sm:p-5" aria-hidden="true">
      <SampleBadge />
      <div className="space-y-2">
        {SAMPLE_OFFERS.map((offer) => (
          <div
            key={offer.name}
            className={`relative flex items-center gap-2.5 rounded-lg border bg-white px-2.5 py-2 ${
              offer.best
                ? 'border-[#1D5CE5] shadow-[0_0_0_1px_rgba(29,92,229,0.12)]'
                : 'border-[rgba(7,19,48,0.08)]'
            }`}
          >
            {offer.best ? <StepMarker n="2" className="left-1.5 top-1/2 -translate-y-1/2" /> : null}
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${offer.best ? 'ml-6' : ''}`}
              style={{ background: offer.tint, color: offer.fg }}
            >
              {offer.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[12.5px] font-semibold text-[#071330]">{offer.name}</p>
                {offer.best ? (
                  <span className="rounded bg-[#1D5CE5] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    Best
                  </span>
                ) : null}
              </div>
              <p className="truncate text-[11px] text-[#64748B]">{offer.meta}</p>
            </div>
            <p className="shrink-0 text-[13px] font-bold tabular-nums text-[#071330]">{offer.price}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PreviewChatReview() {
  return (
    <div className="relative flex h-full flex-col justify-center gap-3 p-4 sm:p-5" aria-hidden="true">
      <SampleBadge />
      <div className="space-y-2">
        <div className="max-w-[85%] rounded-lg rounded-bl-sm bg-[#E8EEF7] px-3 py-2 text-[12px] leading-snug text-[#071330]">
          On my way — 10 min out
        </div>
        <div className="ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-[#1D5CE5] px-3 py-2 text-[12px] leading-snug text-white">
          Perfect, side gate is open!
        </div>
      </div>
      <div className="relative rounded-lg border border-[rgba(7,19,48,0.08)] bg-white px-3 py-2.5">
        <StepMarker n="3" className="left-2 -top-3" />
        <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
          Rate Sofia
        </p>
        <div className="mt-1.5 flex items-center gap-0.5 text-[#F5B942]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" strokeWidth={0} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#FFFDF7] py-16 sm:py-20 lg:py-24">
      <div className="beam-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-md bg-[#FFE8D1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#9A3412]">
            3 Simple steps
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330]">
            Book in minutes, not days
          </h2>
          <p className="mt-3 text-[16px] leading-[1.55] text-[#64748B]">
            A clear path from task to trusted local help — no phone tag, no surprise fees.
          </p>
        </div>

        <ol className="relative mt-12 grid items-stretch gap-6 md:grid-cols-3 md:gap-5 lg:gap-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[16%] right-[16%] top-[7.5rem] hidden border-t border-dashed border-[#E8C547]/80 md:block"
          />

          {STEPS.map((step) => {
            const Preview = step.Preview
            return (
              <li
                key={step.id}
                className="relative flex h-full flex-col overflow-hidden rounded-lg border border-[rgba(7,19,48,0.08)] bg-white shadow-[0_12px_32px_-16px_rgba(15,41,92,0.14)]"
              >
                <div className="relative h-[232px] border-b border-[rgba(7,19,48,0.06)] bg-[#F8FAFC] sm:h-[236px]">
                  <Preview />
                </div>
                <div className="flex flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
                  <h3 className="text-[17px] font-bold text-[#071330]">{step.title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-[1.55] text-[#64748B]">{step.body}</p>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="mt-10 flex justify-center">
          <Link
            href="/post"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#1D5CE5] px-6 text-[14.5px] font-semibold text-white transition hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 focus-visible:ring-offset-2"
          >
            Post a task
          </Link>
        </div>
      </div>
    </section>
  )
}
