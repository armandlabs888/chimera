'use client'

import { useState } from 'react'
import { ChevronDown, ShieldCheck } from 'lucide-react'
import { LandingSection } from '@/components/flat'

const FAQS = [
  {
    q: 'How does payment work?',
    a: 'Beam never holds your money. After you accept an offer, you and the helper arrange payment peer-to-peer (Venmo, cash, etc.). The agreed price lives in the offer so expectations stay clear.',
  },
  {
    q: 'Is Beam available outside Austin?',
    a: 'Not yet. Beam launches in eight central Austin neighborhoods so same-day help stays dense and useful. We’ll expand carefully.',
  },
  {
    q: 'What if something goes wrong?',
    a: 'Use in-thread reporting, review both ways after completion, and follow community safety rules on the Safety page. Beam is peer-to-peer — use judgment and meet in public when it makes sense.',
  },
  {
    q: 'Do I need an account to browse?',
    a: 'You can browse open requests without signing in. Posting, offering, messaging, and reviewing require an account so reputation stays accountable.',
  },
]

export function LandingTrustFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <LandingSection id="trust">
      <div className="section-inner grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="flat-meta">Trust &amp; safety</p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,3.6vw,3rem)] font-normal text-[#FAF8F4]">
            Clear rules. Honest scope.
          </h2>
          <p className="mt-2 text-[17px] text-[#A7A39C]">
            Beam is a coordination layer — not escrow, not a staffing agency. Safety starts with scoped
            categories, reviews, and community norms.
          </p>
          <a
            href="/safety"
            className="mt-5 inline-flex items-center gap-2 text-[14px] font-medium text-[#DDA352] hover:text-[#E7B567] transition"
          >
            <ShieldCheck className="h-4 w-4" />
            Read safety guidelines
          </a>
        </div>

        <div className="space-y-2">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className="elevated overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="text-[15px] font-medium text-[#F7F4EE]">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#A7A39C] transition ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen ? (
                  <p className="border-t border-white/[0.07] px-4 py-3.5 text-[14.5px] leading-relaxed text-[#A7A39C]">
                    {item.a}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </LandingSection>
  )
}
