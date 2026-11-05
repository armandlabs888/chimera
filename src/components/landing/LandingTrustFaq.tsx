import Link from 'next/link'
import { StackSection, MetaLabel } from '@/components/flat'

const faqs = [
  {
    q: 'Does Beam guarantee someone finishes today?',
    a: 'No. Beam helps you post and collect timed, priced offers from nearby helpers. Completion depends on the people involved.',
  },
  {
    q: 'Does Beam hold payments?',
    a: 'Not yet. Offers name a price so expectations are clear; payment is arranged between neighbors outside Beam for now.',
  },
  {
    q: 'What jobs are in scope?',
    a: 'Practical same-day help: moving & lifting, cleaning, tutoring, pet care, light handyman (no licensed trades), and events/photo.',
  },
  {
    q: 'Is my data live or demo?',
    a: 'With Supabase configured, signed-in accounts persist for real. Explicit demo mode keeps an Austin seed in your browser only.',
  },
]

/** FAQ can expand tall — static (not sticky). */
export function LandingTrustFaq() {
  return (
    <StackSection
      id="trust"
      stick={false}
      zIndex={5}
      tone="base"
      className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <MetaLabel>Clear expectations</MetaLabel>
          <h2 className="mt-3 font-display text-3xl font-semibold text-beam-cream sm:text-4xl">
            Only what Beam actually does
          </h2>
          <p className="mt-3 text-base text-beam-cream-dim">
            Agree on price in the offer, keep scope in the thread, and prefer daytime or public
            meetups when it’s a first job. Read the safety notes for practical habits.
          </p>
          <Link
            href="/safety"
            className="touch-target mt-6 inline-flex items-center justify-center rounded-xl border border-white/12 px-5 py-3 text-sm font-semibold text-beam-cream hover:border-beam-amber/40"
          >
            Safety basics
          </Link>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {faqs.map((item) => (
            <details key={item.q} className="group py-4 open:pb-5">
              <summary className="cursor-pointer list-none font-medium text-beam-cream marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-3">
                  {item.q}
                  <span className="text-beam-amber transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-beam-cream-dim">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </StackSection>
  )
}
