import Link from 'next/link'

const HELPERS = [
  {
    name: 'Marcus T.',
    neighborhood: 'East Austin',
    specialty: 'Moving & Assembly',
    rating: '4.9',
    src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80',
  },
  {
    name: 'Sofia R.',
    neighborhood: 'South Congress',
    specialty: 'Home Cleaning',
    rating: '5.0',
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=320&q=80',
  },
  {
    name: 'Jordan P.',
    neighborhood: 'Mueller',
    specialty: 'Handyman',
    rating: '4.8',
    src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=320&q=80',
  },
  {
    name: 'Aisha K.',
    neighborhood: 'Hyde Park',
    specialty: 'Tutoring & Tech',
    rating: '4.9',
    src: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=320&q=80',
  },
  {
    name: 'Noah L.',
    neighborhood: 'Zilker',
    specialty: 'Pet Care',
    rating: '4.9',
    src: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=320&q=80',
  },
  {
    name: 'Priya M.',
    neighborhood: 'Clarksville',
    specialty: 'Events & Photo',
    rating: '5.0',
    src: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=320&q=80',
  },
]

export function LandingHelpers() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="beam-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-full bg-[#FFEDD5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#C2410C]">
            04 People First
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[#071330]">
            Meet local helpers
          </h2>
          <p className="mt-3 text-[16px] text-[#64748B]">
            Friendly, reviewed Austin neighbors ready to lend a hand today.
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
                {h.neighborhood}
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
            className="inline-flex h-11 items-center rounded-full border border-[#1D5CE5]/30 px-5 text-[14.5px] font-semibold text-[#1D5CE5] transition hover:bg-[#F4F8FD]"
          >
            Browse helpers nearby →
          </Link>
        </div>
      </div>
    </section>
  )
}
