import Image from 'next/image'
import Link from 'next/link'
import { CATEGORIES } from '@/data/categories'

/** Masonry-style popular services grid with inline testimonial. */
export function LandingCategories() {
  const [moving, cleaning, handyman, petcare, tutoring, events] = CATEGORIES

  return (
    <section id="categories" className="relative z-10 -mt-4 bg-white pb-16 pt-10 sm:-mt-8 sm:pb-20 sm:pt-14">
      <div className="beam-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1D5CE5]">
              01 Discover
            </p>
            <h2 className="mt-2 font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[#071330]">
              Popular services
            </h2>
            <p className="mt-2 max-w-[42ch] text-[16px] text-[#64748B]">
              Everything your apartment, home, or weekend project needs—done today.
            </p>
          </div>
          <Link
            href="/browse"
            className="inline-flex h-11 items-center rounded-full border border-[#1D5CE5]/30 px-5 text-[14.5px] font-semibold text-[#1D5CE5] transition hover:bg-[#F4F8FD]"
          >
            View all requests →
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12 lg:gap-5">
          <ServiceTile
            href={`/browse?category=${cleaning.id}`}
            image={cleaning.image}
            label={`${cleaning.shortLabel} · ${cleaning.typicalRange}`}
            className="col-span-1 aspect-[3/4] lg:col-span-3 lg:row-span-2 lg:aspect-auto lg:min-h-[420px]"
          />
          <ServiceTile
            href={`/browse?category=${moving.id}`}
            image={moving.image}
            label={`${moving.shortLabel} · ${moving.typicalRange}`}
            className="col-span-1 aspect-[4/5] lg:col-span-4 lg:aspect-[5/4]"
          />
          <blockquote className="col-span-2 flex flex-col justify-center rounded-[26px] bg-[#F4F8FD] p-6 sm:p-8 lg:col-span-5 lg:min-h-[200px]">
            <p className="font-display text-[1.35rem] font-semibold leading-snug tracking-[-0.02em] text-[#071330] sm:text-[1.55rem]">
              “Had two neighbors help carry a sectional up to my 3rd-floor walkup in South Congress
              within 90 minutes.”
            </p>
            <footer className="mt-4 text-[14px] font-semibold text-[#1D5CE5]">
              — Elena R. · South Congress
            </footer>
          </blockquote>
          <ServiceTile
            href={`/browse?category=${handyman.id}`}
            image={handyman.image}
            label={`${handyman.shortLabel} · ${handyman.typicalRange}`}
            className="col-span-1 aspect-[4/5] lg:col-span-4 lg:aspect-[5/4]"
          />
          <ServiceTile
            href={`/browse?category=${petcare.id}`}
            image={petcare.image}
            label={`${petcare.shortLabel} · ${petcare.typicalRange}`}
            className="col-span-1 aspect-[3/4] lg:col-span-3 lg:aspect-[4/5]"
          />
          <ServiceTile
            href={`/browse?category=${tutoring.id}`}
            image={tutoring.image}
            label={`${tutoring.shortLabel} · ${tutoring.typicalRange}`}
            className="col-span-1 aspect-[4/5] lg:col-span-4 lg:aspect-[5/4]"
          />
          <ServiceTile
            href={`/browse?category=${events.id}`}
            image={events.image}
            label={`${events.shortLabel} · ${events.typicalRange}`}
            className="col-span-1 aspect-[4/5] lg:col-span-5 lg:aspect-[16/10]"
          />
        </div>
      </div>
    </section>
  )
}

function ServiceTile({
  href,
  image,
  label,
  className = '',
}: {
  href: string
  image: string
  label: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-[26px] bg-[#E8EEF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5] ${className}`}
    >
      <Image
        fill
        src={image}
        alt=""
        sizes="(min-width:1024px) 360px, 50vw"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#071330] shadow-sm sm:bottom-4 sm:left-4 sm:text-[13px]">
        {label}
      </span>
    </Link>
  )
}
