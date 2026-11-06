import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LandingSection } from '@/components/flat'

export function LandingFinalCta() {
  return (
    <LandingSection band>
      <div className="section-inner">
        <div className="elevated relative overflow-hidden px-6 py-12 text-center sm:px-10 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(480px 280px at 50% 0%, rgba(213,152,72,0.18) 0%, transparent 70%)',
            }}
          />
          <div className="relative">
            <p className="flat-meta">Ready when you are</p>
            <h2 className="mt-3 font-serif text-[clamp(2rem,3.6vw,3rem)] font-normal text-[#FAF8F4]">
              Post today. Get help nearby.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[17px] text-[#A7A39C]">
              Structured requests, priced offers, and in-thread coordination — built for Austin
              neighbors.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/post"
                className="inline-flex h-[50px] items-center justify-center gap-3 rounded-[13px] px-7 text-[15.5px] font-medium text-[#FDFBF7] bg-gradient-to-b from-[#D5A455] via-[#C6944B] to-[#B88842] shadow-[0_8px_28px_rgba(198,148,75,0.26),inset_0_1px_0_rgba(255,235,195,0.36)] hover:brightness-105 transition"
              >
                Post a request
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/browse"
                className="inline-flex h-[50px] items-center justify-center gap-2.5 rounded-[13px] px-6 text-[15.5px] font-medium text-[#ECE8E1] bg-[#131416]/90 border border-white/[0.15] hover:bg-white/[0.06] hover:border-white/[0.24] transition"
              >
                Browse nearby help
              </Link>
            </div>
          </div>
        </div>
      </div>
    </LandingSection>
  )
}
