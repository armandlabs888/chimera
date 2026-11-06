import Link from 'next/link'

const HELPERS = [
  {
    name: 'Marcus T.',
    trackRecord: '38 tasks completed',
    specialty: 'Moving & Assembly',
    rating: '4.9',
    src: '/images/landing/helper-marcus.jpg',
  },
  {
    name: 'Sofia R.',
    trackRecord: '54 tasks completed',
    specialty: 'Home Cleaning',
    rating: '5.0',
    src: '/images/landing/helper-sofia.jpg',
  },
  {
    name: 'Jordan P.',
    trackRecord: '42 tasks completed',
    specialty: 'Handyman',
    rating: '4.8',
    src: '/images/landing/helper-jordan.jpg',
  },
  {
    name: 'Aisha K.',
    trackRecord: '29 tasks completed',
    specialty: 'Tutoring & Tech',
    rating: '4.9',
    src: '/images/landing/helper-aisha.jpg',
  },
  {
    name: 'Noah L.',
    trackRecord: '31 tasks completed',
    specialty: 'Pet Care',
    rating: '4.9',
    src: '/images/landing/helper-noah.jpg',
  },
  {
    name: 'Priya M.',
    trackRecord: '26 tasks completed',
    specialty: 'Events & Photo',
    rating: '5.0',
    src: '/images/landing/helper-priya.jpg',
  },
]

export function LandingHelpers() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="beam-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-md bg-[#FFEDD5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#C2410C]">
            04 People First
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330]">
            Meet local helpers
          </h2>
          <p className="mt-3 text-[16px] text-[#64748B]">
            Friendly, reviewed local neighbors ready to lend a hand today.
          </p>
        </div>

        <ul className="mt-12 flex flex-wrap items-start justify-center gap-x-6 gap-y-8 sm:gap-x-8">
          {HELPERS.map((h) => (
            <li key={h.name} className="flex w-[140px] flex-col items-center text-center sm:w-[152px]">
              <div className="rounded-full bg-gradient-to-br from-[#8BD5FC] via-[#FFF8D6] to-[#1D5CE5] p-[3px]">
                <img
                  src={h.src}
                  alt={h.name}
                  className="h-[104px] w-[104px] rounded-full object-cover ring-2 ring-white sm:h-[112px] sm:w-[112px]"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <p className="mt-3 text-[15px] font-bold text-[#071330]">{h.name}</p>
              <p className="mt-0.5 text-[12.5px] text-[#64748B]">
                {h.trackRecord}
              </p>
              <p className="mt-1 text-[12.5px] font-medium text-[#1D5CE5]">
                {h.specialty} · {h.rating}★
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center">
          <Link
            href="/browse?tab=people"
            className="inline-flex h-11 items-center rounded-lg border border-[#1D5CE5]/30 px-5 text-[14.5px] font-semibold text-[#1D5CE5] transition hover:bg-[#F4F8FD]"
          >
            Browse helpers nearby →
          </Link>
        </div>
      </div>
    </section>
  )
}
