import Image from 'next/image'
import { Check, Clock, MessageSquare } from 'lucide-react'
import { LIFESTYLE } from '@/data/media'

const STEPS = [
  {
    id: '01',
    title: 'Post your task',
    body: 'Describe what you need, pick your neighborhood, and set a fair budget.',
    image:
      LIFESTYLE.stepPost,
    badgeBg: '#DBEAFE',
    badgeFg: '#1D5CE5',
    icon: MessageSquare,
    overlay: (
      <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#071330] shadow-md">
        Moving · $85 offer
      </span>
    ),
  },
  {
    id: '02',
    title: 'Compare fast offers',
    body: 'Review priced offers with arrival times and neighbor ratings in minutes.',
    image:
      LIFESTYLE.stepOffers,
    badgeBg: '#FFE4E6',
    badgeFg: '#E11D48',
    icon: Clock,
    overlay: (
      <div className="absolute inset-x-3 bottom-4 flex flex-wrap justify-center gap-1.5 sm:inset-x-4">
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#64748B] shadow-sm sm:text-[12px]">
          4:00 PM
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#1D5CE5] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm sm:text-[12px]">
          <Check className="h-3 w-3" strokeWidth={3} />
          Today · 2:30 PM
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#64748B] shadow-sm sm:text-[12px]">
          5:30 PM
        </span>
      </div>
    ),
  },
  {
    id: '03',
    title: 'Chat, finish & review',
    body: 'Message in one thread, mark complete when done, and leave a two-way review.',
    image:
      LIFESTYLE.stepDone,
    badgeBg: '#D1FAE5',
    badgeFg: '#059669',
    icon: Check,
    overlay: null,
  },
] as const

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#FFF8D6] py-16 sm:py-20 lg:py-24">
      <div className="beam-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-full border border-[rgba(7,19,48,0.1)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#071330]">
            02 Simple steps
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330]">
            Book in 3 steps
          </h2>
          <p className="mt-3 text-[16px] text-[#64748B]">
            A clear path from task to trusted local help.
          </p>
        </div>

        <ol className="mt-12 grid gap-7 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <li key={step.id} className="flex flex-col">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-white shadow-[0_16px_40px_-12px_rgba(15,41,92,0.1)]">
                  <Image
                    src={step.image}
                    alt=""
                    fill
                    sizes="(min-width:768px) 33vw, 100vw"
                    className="object-cover"
                  />
                  <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[13px] font-bold text-[#071330] shadow-sm">
                    {step.id}
                  </span>
                  {step.overlay}
                </div>
                <div className="mt-5 flex items-start gap-3">
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: step.badgeBg, color: step.badgeFg }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="text-[17px] font-bold text-[#071330]">{step.title}</h3>
                    <p className="mt-1 text-[14.5px] leading-[1.5] text-[#64748B]">{step.body}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
