import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LandingSection } from '@/components/flat'
import { NEIGHBORHOODS } from '@/data/neighborhoods'

const COMMITMENTS = [
  {
    title: 'Beam never holds your money',
    body: 'You pay helpers directly, in cash or Venmo. The agreed price is written in the offer.',
  },
  {
    title: 'Reviews go both ways',
    body: 'Requesters and helpers rate each other after every job.',
  },
  {
    title: 'Everything stays in the thread',
    body: 'Coordinate and report problems in-app, so there is a record.',
  },
  {
    title: 'Scoped, everyday tasks',
    body: 'Six practical categories. Nothing that needs a license.',
  },
]

export function LandingCoverageSafety() {
  return (
    <LandingSection id="coverage">
      <div className="beam-container grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <h2
            className="font-serif text-[clamp(2.25rem,3.9vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.018em] text-[#F6F3EE]"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            Starting in central Austin
          </h2>
          <p className="mt-4 max-w-[40ch] text-[19px] leading-[1.5] text-[#B7B2AA]">
            Eight walkable neighborhoods around Lady Bird Lake, where same-day help actually works.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-x-10 border-t border-white/[0.08]">
            {NEIGHBORHOODS.map((n) => (
              <li key={n.id} className="border-b border-white/[0.08]">
                <Link
                  href={`/browse?neighborhood=${n.id}`}
                  className="group flex items-baseline justify-between py-4"
                >
                  <span
                    className="font-serif text-[22px] text-[#F6F3EE] transition group-hover:text-white"
                    style={{ fontVariationSettings: "'opsz' 36" }}
                  >
                    {n.name}
                  </span>
                  <span className="text-[13px] text-[#85817A] transition group-hover:text-[#D6B06C]">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13px] text-[#85817A]">More of Austin soon.</p>
        </div>

        <div id="safety">
          <h2
            className="font-serif text-[clamp(2.25rem,3.9vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.018em] text-[#F6F3EE]"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            Safety, plainly
          </h2>
          <dl className="mt-10 space-y-7">
            {COMMITMENTS.map((c) => (
              <div key={c.title}>
                <dt className="text-[17px] font-medium text-[#F6F3EE]">{c.title}</dt>
                <dd className="mt-1.5 text-[16px] leading-[1.55] text-[#B7B2AA]">{c.body}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/safety"
            className="mt-8 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#D6B06C] transition hover:text-[#E2B66A]"
          >
            Read the full safety guidelines <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </LandingSection>
  )
}
