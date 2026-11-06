import Link from 'next/link'
import {
  CalendarClock,
  Laptop,
  Leaf,
  Monitor,
  PartyPopper,
  PawPrint,
  ShieldCheck,
  Sofa,
  Sparkles,
  SprayCan,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

const PILLARS = [
  {
    icon: Sparkles,
    title: 'Upfront local pricing',
    body: 'Compare exact dollar offers side by side before you accept—no surprise hourly run-ups.',
    tint: '#DBEAFE',
    fg: '#1D5CE5',
  },
  {
    icon: CalendarClock,
    title: 'Same-day arrival windows',
    body: 'Every offer includes a real arrival window so you know right when help will be at your door.',
    tint: '#FFEDD5',
    fg: '#C2410C',
  },
  {
    icon: ShieldCheck,
    title: 'Verified two-way reviews',
    body: 'Both neighbors review every completed task, building accountable local reputation.',
    tint: '#D1FAE5',
    fg: '#059669',
  },
] as const

const CHIP_LINKS: { label: string; category: string; icon: LucideIcon }[] = [
  { label: 'Couch Moving', category: 'moving', icon: Sofa },
  { label: 'Deep Cleaning', category: 'cleaning', icon: SprayCan },
  { label: 'Furniture Assembly', category: 'handyman', icon: Wrench },
  { label: 'TV Mounting', category: 'handyman', icon: Monitor },
  { label: 'Dog Walking', category: 'petcare', icon: PawPrint },
  { label: 'Yard Cleanup', category: 'handyman', icon: Leaf },
  { label: 'Event Setup', category: 'events', icon: PartyPopper },
  { label: 'Tech & Tutoring', category: 'tutoring', icon: Laptop },
]

const SHOWCASE_PHOTO =
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80'

const LIVE_OFFERS = [
  {
    name: 'Marcus T.',
    rating: '4.9★',
    arrival: 'Today · 2:30 PM',
    price: '$65',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&h=96&q=80',
  },
  {
    name: 'Sofia R.',
    rating: '5.0★',
    arrival: 'Today · 4:00 PM',
    price: '$75',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&h=96&q=80',
  },
] as const

export function LandingWhyBeam() {
  return (
    <section className="bg-white pb-4 pt-16 sm:pt-20" data-testid="why-beam-section">
      <div className="beam-container">
        <div className="grid items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left: editorial hierarchy + trust pillars */}
          <div className="flex flex-col lg:col-span-6" data-testid="why-beam-copy">
            <p className="inline-flex w-fit rounded-full border border-[rgba(7,19,48,0.1)] bg-[#FFF8D6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#071330]">
              03 Why Beam
            </p>
            <h2 className="mt-4 max-w-[14ch] font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330] text-balance">
              Why choose Beam
            </h2>
            <p className="mt-3 max-w-[42ch] text-[16px] leading-[1.55] text-[#64748B]">
              Same-day help from reviewed neighbors—with clear prices before anyone heads over.
            </p>

            <ul className="mt-8 flex-1 divide-y divide-[rgba(7,19,48,0.08)] border-y border-[rgba(7,19,48,0.08)]">
              {PILLARS.map((pillar) => {
                const Icon = pillar.icon
                return (
                  <li key={pillar.title} className="flex items-start gap-3.5 py-5">
                    <span
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: pillar.tint, color: pillar.fg }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-bold text-[#071330]">{pillar.title}</h3>
                      <p className="mt-1 text-[14.5px] leading-[1.5] text-[#475569]">{pillar.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/post"
                className="inline-flex h-12 items-center rounded-full bg-[#1D5CE5] px-6 text-[15px] font-semibold text-white transition hover:bg-[#1649BD]"
              >
                Post a task →
              </Link>
              <Link
                href="/safety"
                className="text-[14.5px] font-semibold text-[#475569] underline-offset-2 transition hover:text-[#1D5CE5] hover:underline"
              >
                Safety & guidelines
              </Link>
            </div>
          </div>

          {/* Right: visual + live-offer showcase */}
          <div className="lg:col-span-6" data-testid="why-beam-showcase">
            <div className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-[rgba(7,19,48,0.08)] bg-[#F4F8FD] sm:min-h-[480px]">
              <div className="relative min-h-[220px] flex-1 sm:min-h-[280px]">
                <img
                  src={SHOWCASE_PHOTO}
                  alt="Friendly helper assisting at home in a bright kitchen"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  width={1200}
                  height={900}
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#F4F8FD] via-transparent to-transparent"
                  aria-hidden
                />
              </div>

              <div className="relative z-10 -mt-16 px-4 pb-5 sm:-mt-20 sm:px-6 sm:pb-6">
                <div
                  className="rounded-xl border border-[rgba(7,19,48,0.08)] bg-white p-4 shadow-[0_20px_45px_-15px_rgba(12,42,102,0.22)] sm:p-5"
                  data-testid="why-beam-live-offers"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-[#071330]">
                        Help carry dresser up 1 flight
                      </p>
                      <p className="mt-0.5 text-[13px] font-medium text-[#1D5CE5]">
                        2 offers in 8 min
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#1D5CE5]">
                      Live
                    </span>
                  </div>

                  <ul className="mt-4 space-y-3">
                    {LIVE_OFFERS.map((offer) => (
                      <li
                        key={offer.name}
                        className="flex items-center gap-3 rounded-xl border border-[rgba(7,19,48,0.06)] bg-[#F8FAFC] px-3 py-2.5"
                      >
                        <img
                          src={offer.avatar}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                          loading="lazy"
                          decoding="async"
                          width={40}
                          height={40}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[14px] font-semibold text-[#071330]">
                              {offer.name}
                            </p>
                            <span className="shrink-0 text-[12px] font-medium text-[#64748B]">
                              {offer.rating}
                            </span>
                          </div>
                          <span className="mt-1 inline-flex rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D5CE5]">
                            {offer.arrival}
                          </span>
                        </div>
                        <p className="shrink-0 text-[16px] font-bold tabular-nums text-[#071330]">
                          {offer.price}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scalloped warm-yellow popular-task band */}
      <div className="scallop-band mt-20 py-10 sm:mt-24 sm:py-12" id="neighborhoods">
        <div className="beam-container">
          <div
            className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
            data-testid="why-beam-task-pills"
          >
            {CHIP_LINKS.map((chip) => {
              const Icon = chip.icon
              return (
                <Link
                  key={chip.label}
                  href={`/browse?category=${chip.category}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(7,19,48,0.08)] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#071330] shadow-sm transition hover:border-[#1D5CE5]/35 hover:text-[#1D5CE5]"
                >
                  <Icon className="h-4 w-4 text-[#1D5CE5]" strokeWidth={2} aria-hidden />
                  {chip.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
