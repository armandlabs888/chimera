import Image from 'next/image'
import Link from 'next/link'
import { SERVICE_CATEGORIES, getBrowseParent } from '@/lib/taxonomy'
import { LIFESTYLE } from '@/data/media'

/**
 * Flush popular-services bento for casual-launch taxonomy.
 * Keeps fitting lifestyle assets; does not invent new photos or relabel mismatches.
 * Layout: Home (tall) + Auto + quote; Junk + Pets; House Cleaning + Other.
 */
export function LandingCategories() {
  const house = SERVICE_CATEGORIES.find((c) => c.id === 'house-cleaning')!
  const auto = SERVICE_CATEGORIES.find((c) => c.id === 'auto-detailing')!
  const junk = SERVICE_CATEGORIES.find((c) => c.id === 'junk-removal')!
  const pets = getBrowseParent('pets')
  const other = SERVICE_CATEGORIES.find((c) => c.id === 'other')!

  return (
    <section id="categories" className="relative z-10 -mt-4 bg-white pb-16 pt-10 sm:-mt-8 sm:pb-20 sm:pt-14">
      <div className="beam-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1D5CE5]">
              01 Discover
            </p>
            <h2 className="mt-2 font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330]">
              Popular services
            </h2>
            <p className="mt-2 max-w-[42ch] text-[16px] text-[#64748B]">
              Home, Auto, Junk Removal, Pets, and everyday Other help nearby.
            </p>
          </div>
          <Link
            href="/browse"
            className="inline-flex h-11 items-center rounded-lg border border-[#1D5CE5]/30 px-5 text-[14.5px] font-semibold text-[#1D5CE5] transition hover:bg-[#F4F8FD]"
          >
            View all requests →
          </Link>
        </div>

        <div
          data-testid="categories-bento"
          className="mt-10 grid grid-cols-2 auto-rows-[220px] gap-3 sm:auto-rows-[240px] sm:gap-4 lg:grid-cols-12 lg:auto-rows-[250px] lg:gap-5"
        >
          <ServiceTile
            href={`/browse?category=home`}
            image={house.image}
            label={`Home · House & carpet`}
            alt="Neighbor wiping a sunlit kitchen counter during a home cleaning job"
            objectPosition="object-[50%_22%]"
            className="col-span-1 lg:col-span-3 lg:row-span-2"
          />
          <ServiceTile
            href={`/browse?category=auto`}
            image={auto.image}
            label={`${auto.shortLabel} · ${auto.typicalRange}`}
            alt="Neighbor detailing a car exterior in a driveway"
            objectPosition="object-[50%_35%]"
            className="col-span-1 lg:col-span-4"
          />
          <blockquote className="col-span-2 flex h-full min-h-0 flex-col justify-center overflow-hidden rounded-lg bg-[#F4F8FD] p-5 sm:p-7 lg:col-span-5 lg:p-8">
            <p className="font-display text-[clamp(1.15rem,1.6vw,1.5rem)] font-semibold leading-snug tracking-[-0.02em] text-[#071330]">
              “Booked house cleaning for Saturday morning and had two solid offers within the hour.”
            </p>
            <p className="mt-3 text-[13.5px] font-semibold text-[#1D5CE5] sm:mt-4 sm:text-[14px]">
              — Elena R. · Verified neighbor
            </p>
          </blockquote>

          <ServiceTile
            href={`/browse?category=junk-removal`}
            image={junk.image}
            label={`${junk.shortLabel} · ${junk.typicalRange}`}
            alt="Neighbors loading household items into a truck for haul-away"
            objectPosition="object-[50%_40%]"
            className="col-span-1 lg:col-span-5"
          />
          <ServiceTile
            href={`/browse?category=pets`}
            image={LIFESTYLE.petcare}
            label={`${pets.label} · Sitting & grooming`}
            alt="Neighbor walking two dogs on a sunny tree-lined sidewalk"
            objectPosition="object-[58%_8%]"
            className="col-span-1 lg:col-span-4"
          />

          <ServiceTile
            href={`/browse?category=other`}
            image={other.image}
            label={`${other.shortLabel} · Custom everyday help`}
            alt="Neighbors arranging items for a casual local task"
            objectPosition="object-[50%_40%]"
            className="col-span-2 lg:col-span-12"
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
  alt,
  className = '',
  objectPosition = 'object-center',
}: {
  href: string
  image: string
  label: string
  alt: string
  className?: string
  objectPosition?: string
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative block h-full min-h-0 w-full overflow-hidden rounded-lg bg-[#E8EEF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5] ${className}`}
    >
      <Image
        fill
        src={image}
        alt={alt}
        sizes="(min-width:1024px) 640px, 90vw"
        className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${objectPosition}`}
      />
      <span className="absolute bottom-3 left-3 rounded-md bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#071330] shadow-sm sm:bottom-4 sm:left-4 sm:text-[13px]">
        {label}
      </span>
    </Link>
  )
}
