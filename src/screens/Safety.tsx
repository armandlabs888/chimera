'use client'

import Link from 'next/link'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { useBeam } from '@/context/BeamContext'

const COMMITMENTS = [
  {
    title: 'Beam never holds your money',
    body: 'You pay helpers directly, in cash or Venmo. The agreed price is written in the offer so expectations stay clear.',
  },
  {
    title: 'Reviews go both ways',
    body: 'Requesters and helpers rate each other after every job. Reputation is mutual, not one-sided.',
  },
  {
    title: 'Everything stays in the thread',
    body: 'Coordinate timing, share details, and report problems in-app so there is a record if something goes wrong.',
  },
  {
    title: 'Scoped, everyday tasks',
    body: 'Six practical categories. Nothing that needs a license, overnight care, or driving for hire.',
  },
]

const PERMITTED = [
  'Moving & lifting',
  'Home cleaning',
  'Handyman & assembly (non-licensed)',
  'Pet care',
  'Tutoring & tech help',
  'Events & photo',
]

const EXCLUDED = [
  'Licensed trades (electrical, plumbing, HVAC)',
  'Childcare / babysitting',
  'Medical or senior/elderly care',
  'Passenger driving / rides',
]

const FAQ = [
  {
    q: 'How does payment work?',
    a: 'Beam never holds your money. After you accept an offer, you and the helper arrange payment peer-to-peer. The agreed price lives in the offer.',
  },
  {
    q: 'How does local matching work?',
    a: 'Beam connects neighbors within dense local areas so same-day help stays close by, practical, and fast.',
  },
  {
    q: 'What if something goes wrong?',
    a: 'Use in-thread reporting, review both ways after completion, and follow these community safety rules. Meet in public when it makes sense.',
  },
  {
    q: 'Do I need an account to browse?',
    a: 'You can browse open requests without signing in. Posting, offering, messaging, and reviewing require an account.',
  },
]

export function Safety() {
  const { mode, authUser } = useBeam()
  const publicChrome = mode === 'live' && !authUser

  const body = (
    <div className={publicChrome ? 'beam-container py-16' : 'py-2 sm:py-4'}>
      <h1 className="font-display text-[clamp(2.5rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[#071330]">
        Safety on Beam
      </h1>
      <p className="mt-4 max-w-[48ch] text-[18px] leading-[1.55] text-[#64748B]">
        Beam is a coordination layer — not escrow and not a staffing agency. Clear rules keep
        same-day help practical.
      </p>

      <dl className="mt-12 max-w-2xl space-y-8">
        {COMMITMENTS.map((c) => (
          <div key={c.title}>
            <dt className="text-[18px] font-bold text-[#071330]">{c.title}</dt>
            <dd className="mt-2 text-[16px] leading-[1.55] text-[#64748B]">{c.body}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        <div className="rounded-[26px] border border-[rgba(7,19,48,0.08)] bg-white p-6">
          <h2 className="text-[15px] font-bold uppercase tracking-[0.08em] text-[#1D5CE5]">
            Permitted
          </h2>
          <ul className="mt-4 space-y-2 text-[15px] text-[#071330]">
            {PERMITTED.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[#059669]">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[26px] border border-[#FDE68A] bg-[#FFF8D6] p-6">
          <h2 className="text-[15px] font-bold uppercase tracking-[0.08em] text-[#92400E]">
            Not on Beam
          </h2>
          <ul className="mt-4 space-y-2 text-[15px] text-[#071330]">
            {EXCLUDED.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[#DC2626]">×</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-16 max-w-2xl space-y-10 border-t border-[rgba(7,19,48,0.08)] pt-12">
        {FAQ.map((item) => (
          <div key={item.q}>
            <h2 className="text-[18px] font-bold text-[#071330]">{item.q}</h2>
            <p className="mt-2 text-[16px] leading-[1.55] text-[#64748B]">{item.a}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-[15px] text-[#64748B]">
        Ready to help or need a hand?{' '}
        <Link href="/browse" className="font-semibold text-[#1D5CE5] hover:text-[#1649BD]">
          Browse open requests →
        </Link>
      </p>
    </div>
  )

  if (publicChrome) {
    return (
      <div className="min-h-dvh bg-white text-[#071330]">
        <LandingNav variant="light" />
        {body}
        <LandingFooter />
      </div>
    )
  }

  return body
}
