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

export function LandingTrustFaq() {
  return (
    <StackSection
      id="trust"
      stick={false}
      zIndex={5}
      tone="base"
      className="scroll-mt-16 border-t border-beam-line px-4 py-12 sm:px-6 sm:py-14"
    >
      <div className="mx-auto grid max-w-[72rem] gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <MetaLabel className="text-beam-amber">Clear expectations</MetaLabel>
          <h2 className="mt-2 type-h2 text-beam-cream">Only what Beam actually does</h2>
          <p className="mt-2 type-sec text-beam-muted">
            Agree on price in the offer, keep scope in the thread, and prefer daytime or public
            meetups for a first job.
          </p>
          <Link
            href="/safety"
            className="btn-compact mt-5 inline-flex items-center justify-center rounded-[8px] border border-beam-line px-4 text-[13px] font-semibold text-beam-cream hover:border-beam-cream/30"
          >
            Safety basics
          </Link>
        </div>

        <div className="divide-y divide-beam-line rounded-[12px] border border-beam-line bg-beam-base px-4">
          {faqs.map((item) => (
            <details key={item.q} className="group py-3.5">
              <summary className="cursor-pointer list-none text-[15px] font-medium text-beam-cream marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-3">
                  {item.q}
                  <span className="text-beam-amber transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 type-sec text-beam-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </StackSection>
  )
}
