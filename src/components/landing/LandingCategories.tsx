'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { SERVICE_CATEGORIES } from '@/lib/taxonomy'
import { LIFESTYLE } from '@/data/media'

type FilterId = 'all' | 'home' | 'pets' | 'other'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'home', label: 'Home' },
  { id: 'pets', label: 'Pets' },
  { id: 'other', label: 'Other' },
]

/**
 * Popular-services bento — screenshot-locked asymmetric Discover section.
 * Auto Detailing omitted (no detailing asset). Junk linked from subtitle only.
 */
export function LandingCategories() {
  const house = SERVICE_CATEGORIES.find((c) => c.id === 'house-cleaning')!
  const [filter, setFilter] = useState<FilterId>('all')
  const tablistId = useId()

  const showCleaning = filter === 'all' || filter === 'home'
  const showQuote = filter === 'all' || filter === 'home'
  const showPets = filter === 'all' || filter === 'pets'
  const showCustom = filter === 'all' || filter === 'other'

  const isAll = filter === 'all'

  return (
    <section
      id="categories"
      className="relative z-10 -mt-4 bg-white pb-16 pt-10 sm:-mt-8 sm:pb-20 sm:pt-14"
    >
      <div className="beam-container">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1D5CE5]">
              01 Discover
            </p>
            <h2 className="mt-2 font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330]">
              Popular services
            </h2>
            <p className="mt-2 max-w-[46ch] text-[16px] leading-[1.5] text-[#475569]">
              Home,{' '}
              <Link
                href="/browse?category=junk-removal"
                className="font-semibold text-[#071330] underline-offset-2 transition hover:text-[#1D5CE5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35"
              >
                Junk Removal
              </Link>
              , Pets, and everyday help nearby.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter popular services"
            id={tablistId}
            data-testid="categories-filter-tabs"
            className="flex flex-wrap gap-2 sm:justify-end"
          >
            {FILTERS.map((tab) => {
              const selected = filter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-testid={`categories-filter-${tab.id}`}
                  onClick={() => setFilter(tab.id)}
                  className={`inline-flex h-8 items-center rounded-md px-3.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 focus-visible:ring-offset-2 ${
                    selected
                      ? 'bg-[#1D5CE5] text-white'
                      : 'bg-[#F1F5F9] text-[#071330] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div
          data-testid="categories-bento"
          role="tabpanel"
          aria-labelledby={tablistId}
          className={`mt-10 grid gap-4 sm:gap-5 ${
            isAll
              ? 'grid-cols-1 auto-rows-[minmax(220px,auto)] sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[minmax(300px,auto)]'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[minmax(280px,auto)]'
          }`}
        >
          {showCleaning ? (
            <PhotoServiceTile
              href="/browse?category=home"
              image={house.image || LIFESTYLE.cleaning}
              tag="Home"
              title="House Cleaning"
              // Taxonomy typicalRange — estimate label, not a live market quote.
              detail={`Typical range ${house.typicalRange}`}
              alt="Neighbor wiping a sunlit kitchen counter during a home cleaning job"
              objectPosition="object-[50%_28%]"
              className="sm:col-span-2 lg:col-span-2"
              testId="categories-tile-cleaning"
            />
          ) : null}

          {showQuote ? (
            <blockquote
              data-testid="categories-quote"
              className="relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-[10px] border border-dashed border-[#C4B5FD]/70 bg-[#F3F0FF] p-5 sm:min-h-[240px] sm:p-6 lg:min-h-0 lg:p-7"
            >
              <span
                aria-hidden
                className="pointer-events-none select-none font-display text-[3.75rem] leading-none text-[#93C5FD]/80"
              >
                “
              </span>
              <p className="-mt-5 font-display text-[clamp(1rem,1.35vw,1.25rem)] font-semibold italic leading-snug tracking-[-0.015em] text-[#071330]">
                Post Saturday morning house cleaning, then compare priced offers and arrival
                windows before anyone comes over.
              </p>
              <footer className="mt-5 flex items-center gap-3">
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E0E7FF] text-[12px] font-bold text-[#3730A3]"
                >
                  Ex
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-[#071330]">Illustrative example</p>
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#0F766E]">
                    Not a customer review
                  </p>
                </div>
              </footer>
            </blockquote>
          ) : null}

          {showPets ? (
            <PhotoServiceTile
              href="/browse?category=pets"
              image={LIFESTYLE.petcare}
              tag="Pets"
              title="Sitting & Grooming"
              detail=""
              alt="Neighbor walking dogs on a sunny tree-lined sidewalk"
              objectPosition="object-[58%_8%]"
              className={isAll ? '' : 'sm:col-span-2 lg:col-span-1'}
              testId="categories-tile-pets"
            />
          ) : null}

          {showCustom ? (
            <Link
              href="/browse?category=other"
              data-testid="categories-tile-custom"
              aria-label="Custom everyday help — post any task and see who’s nearby"
              className={`group flex h-full min-h-[200px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[10px] border border-[rgba(7,19,48,0.08)] bg-[#F1F5F9] px-6 py-8 text-center transition hover:bg-[#E8EEF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5] sm:min-h-[220px] lg:min-h-0 ${
                isAll ? 'sm:col-span-2 lg:col-span-2' : 'sm:col-span-2 lg:col-span-2'
              }`}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-[#14B8A6] text-[#0F766E]">
                <CircleAlert className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="font-display text-[clamp(1.25rem,2vw,1.6rem)] font-bold tracking-[-0.02em] text-[#071330]">
                Custom everyday help
              </span>
              <span className="max-w-[28ch] text-[14.5px] leading-snug text-[#475569]">
                Post any task and see who’s nearby
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function PhotoServiceTile({
  href,
  image,
  tag,
  title,
  detail,
  alt,
  className = '',
  objectPosition = 'object-center',
  testId,
}: {
  href: string
  image: string
  tag: string
  title: string
  detail: string
  alt: string
  className?: string
  objectPosition?: string
  testId?: string
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      aria-label={detail ? `${tag}: ${title}. ${detail}` : `${tag}: ${title}`}
      className={`group relative block h-full min-h-[220px] w-full overflow-hidden rounded-[10px] bg-[#E8EEF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5] sm:min-h-[240px] lg:min-h-0 ${className}`}
    >
      <Image
        fill
        src={image}
        alt={alt}
        sizes="(min-width:1024px) 720px, 90vw"
        className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${objectPosition}`}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent"
      />
      <span className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-1.5 p-4 sm:p-5">
        <span className="inline-flex rounded-md bg-black/45 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-[2px]">
          {tag}
        </span>
        <span className="font-display text-[clamp(1.2rem,2vw,1.55rem)] font-bold leading-tight tracking-[-0.02em] text-white">
          {title}
        </span>
        {detail ? (
          <span className="text-[13.5px] font-medium leading-snug text-white/90">{detail}</span>
        ) : null}
      </span>
    </Link>
  )
}
