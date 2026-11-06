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

const FAQ = [
  {
    q: 'How does payment work?',
    a: 'Beam never holds your money. After you accept an offer, you and the helper arrange payment peer-to-peer. The agreed price lives in the offer.',
  },
  {
    q: 'Is Beam available outside Austin?',
    a: 'Not yet. Beam launches in eight central Austin neighborhoods so same-day help stays dense and useful.',
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
    <div className={publicChrome ? 'beam-container py-16' : 'px-4 py-8 sm:py-10'}>
      <h1
        className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.02em] text-[#F6F3EE]"
        style={{ fontVariationSettings: "'opsz' 72" }}
      >
        Safety on Beam
      </h1>
      <p className="mt-4 max-w-[48ch] text-[18px] leading-[1.55] text-[#B7B2AA]">
        Beam is a coordination layer — not escrow and not a staffing agency. Clear rules keep
        same-day help practical.
      </p>

      <dl className="mt-12 max-w-2xl space-y-8">
        {COMMITMENTS.map((c) => (
          <div key={c.title}>
            <dt className="text-[18px] font-medium text-[#F6F3EE]">{c.title}</dt>
            <dd className="mt-2 text-[16px] leading-[1.55] text-[#B7B2AA]">{c.body}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-16 max-w-2xl space-y-10 border-t border-white/[0.08] pt-12">
        {FAQ.map((item) => (
          <div key={item.q}>
            <h2 className="text-[18px] font-medium text-[#F6F3EE]">{item.q}</h2>
            <p className="mt-2 text-[16px] leading-[1.55] text-[#B7B2AA]">{item.a}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-[15px] text-[#B7B2AA]">
        Ready to help or need a hand?{' '}
        <Link href="/browse" className="font-medium text-[#D6B06C] hover:text-[#E2B66A]">
          Browse open requests →
        </Link>
      </p>
    </div>
  )

  if (publicChrome) {
    return (
      <div className="min-h-dvh bg-[#0C0C0E] text-[#F6F3EE]">
        <LandingNav />
        {body}
        <LandingFooter />
      </div>
    )
  }

  return body
}
