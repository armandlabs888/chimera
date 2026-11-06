import Image from 'next/image'
import Link from 'next/link'
import { CATEGORIES } from '@/data/categories'

/**
 * Flush popular-services bento.
 * Desktop: every row sums to 12 cols; heights come from shared `auto-rows` tracks
 * (no per-tile `lg:aspect-*`), so left/right edges and row bottoms stay aligned.
 * Mobile/tablet: 2-col pairs + full-width quote — 6 tiles = 3 full pairs, zero orphans.
 */
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

        <div
          data-testid="categories-bento"
          className="mt-10 grid grid-cols-2 auto-rows-[220px] gap-3 sm:auto-rows-[240px] sm:gap-4 lg:grid-cols-12 lg:auto-rows-[250px] lg:gap-5"
        >
          {/* Row 1–2 left: Cleaning 3×2 · Row 1: Moving 4 + Quote 5 = 12 */}
          <ServiceTile
            href={`/browse?category=${cleaning.id}`}
            image={cleaning.image}
            label={`${cleaning.shortLabel} · ${cleaning.typicalRange}`}
            objectPosition="object-[50%_28%]"
            className="col-span-1 lg:col-span-3 lg:row-span-2"
          />
          <ServiceTile
            href={`/browse?category=${moving.id}`}
            image={moving.image}
            label={`${moving.shortLabel} · ${moving.typicalRange}`}
            objectPosition="object-center"
            className="col-span-1 lg:col-span-4"
          />
          <blockquote className="col-span-2 flex h-full min-h-0 flex-col justify-center overflow-hidden rounded-[26px] bg-[#F4F8FD] p-5 sm:p-7 lg:col-span-5 lg:p-8">
            <p className="font-display text-[clamp(1.15rem,1.6vw,1.5rem)] font-semibold leading-snug tracking-[-0.02em] text-[#071330]">
              “Had two neighbors help carry a sectional up to my 3rd-floor walkup within 90 minutes.”
            </p>
            <footer className="mt-3 text-[13.5px] font-semibold text-[#1D5CE5] sm:mt-4 sm:text-[14px]">
              — Elena R. · Verified neighbor
            </footer>
          </blockquote>

          {/* Row 2 remainder: Handyman 5 + Pets 4 (+ Cleaning 3) = 12 */}
          <ServiceTile
            href={`/browse?category=${handyman.id}`}
            image={handyman.image}
            label={`${handyman.shortLabel} · ${handyman.typicalRange}`}
            objectPosition="object-center"
            className="col-span-1 lg:col-span-5"
          />
          <ServiceTile
            href={`/browse?category=${petcare.id}`}
            image={petcare.image}
            label={`${petcare.shortLabel} · ${petcare.typicalRange}`}
            objectPosition="object-[50%_40%]"
            className="col-span-1 lg:col-span-4"
          />

          {/* Row 3: Tutoring 5 + Events 7 = 12 */}
          <ServiceTile
            href={`/browse?category=${tutoring.id}`}
            image={tutoring.image}
            label={`${tutoring.shortLabel} · ${tutoring.typicalRange}`}
            objectPosition="object-center"
            className="col-span-1 lg:col-span-5"
          />
          <ServiceTile
            href={`/browse?category=${events.id}`}
            image={events.image}
            label={`${events.shortLabel} · ${events.typicalRange}`}
            objectPosition="object-[50%_45%]"
            className="col-span-1 lg:col-span-7"
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
  objectPosition = 'object-center',
}: {
  href: string
  image: string
  label: string
  className?: string
  objectPosition?: string
}) {
  return (
    <Link
      href={href}
      className={`group relative block h-full min-h-0 w-full overflow-hidden rounded-[26px] bg-[#E8EEF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5] ${className}`}
    >
      <Image
        fill
        src={image}
        alt=""
        sizes="(min-width:1024px) 360px, 50vw"
        className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${objectPosition}`}
      />
      <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#071330] shadow-sm sm:bottom-4 sm:left-4 sm:text-[13px]">
        {label}
      </span>
    </Link>
  )
}
