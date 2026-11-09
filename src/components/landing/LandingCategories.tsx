'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useState } from 'react'
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
 * Popular services — Paper bento (large cleaning, pet care, navy custom).
 * Filters are aria-pressed toggles (not ARIA tabs). Other lives here, not in six-grid.
 */
export function LandingCategories() {
  const house = SERVICE_CATEGORIES.find((c) => c.id === 'house-cleaning')!
  const [filter, setFilter] = useState<FilterId>('all')
  const filterLabelId = useId()

  const showCleaning = filter === 'all' || filter === 'home'
  const showPets = filter === 'all' || filter === 'pets'
  const showCustom = filter === 'all' || filter === 'other'
  const isAll = filter === 'all'
  const activeFilterLabel = FILTERS.find((f) => f.id === filter)?.label ?? 'All'

  return (
    <section
      id="categories"
      className="relative z-10 bg-white pb-16 pt-12 sm:pb-20 sm:pt-16"
      data-testid="landing-categories"
    >
      <div className="beam-container">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D5CE5]">
              01 / A little inspiration
            </p>
            <h2 className="mt-3 font-sans text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[#071330]">
              Popular services
            </h2>
            <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.5] text-[#475569]">
              A few good places to start. Find help for your kind of day.
            </p>
          </div>

          <div
            role="group"
            aria-labelledby={filterLabelId}
            data-testid="categories-filter-tabs"
            className="flex flex-wrap gap-2 sm:justify-end"
          >
            <span id={filterLabelId} className="sr-only">
              Filter popular services
            </span>
            {FILTERS.map((tab) => {
              const pressed = filter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={pressed}
                  data-testid={`categories-filter-${tab.id}`}
                  onClick={() => setFilter(tab.id)}
                  className={`inline-flex h-9 min-h-11 items-center rounded-[10px] px-3.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 focus-visible:ring-offset-2 sm:min-h-9 ${
                    pressed
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
          aria-live="polite"
          data-active-filter={filter}
          aria-label={`Popular services — ${activeFilterLabel}`}
          className={`mt-10 grid gap-4 sm:gap-5 ${
            isAll
              ? 'grid-cols-1 lg:grid-cols-2 lg:grid-rows-[minmax(220px,auto)_minmax(220px,auto)]'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
          }`}
        >
          {showCleaning ? (
            <Link
              href="/browse?category=home"
              data-testid="categories-tile-cleaning"
              aria-label="House cleaning — explore house cleaning"
              className={`group flex h-full min-h-[300px] flex-col overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 ${
                isAll ? 'lg:row-span-2 lg:min-h-0' : 'sm:col-span-2 lg:col-span-1'
              }`}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#DBEAFE] lg:aspect-auto lg:min-h-[240px] lg:flex-1">
                <Image
                  src={house.image || LIFESTYLE.cleaning}
                  alt="Neighbors with cleaning gear ready for a home cleaning job"
                  fill
                  sizes="(min-width:1024px) 50vw, 90vw"
                  priority
                  className="object-cover object-[50%_22%] transition duration-500 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none"
                />
              </div>
              <div className="flex flex-col gap-1.5 px-5 py-5 sm:px-6 sm:py-6">
                <p className="font-sans text-[clamp(1.15rem,2vw,1.35rem)] font-bold leading-snug tracking-[-0.02em] text-[#071330]">
                  Make space for the weekend.
                </p>
                <p className="text-[14.5px] leading-snug text-[#475569]">
                  House cleaning for the rooms you live in.
                </p>
                <span className="mt-2 text-[14px] font-semibold text-[#1D5CE5]">
                  Explore house cleaning →
                </span>
              </div>
            </Link>
          ) : null}

          {showPets ? (
            <Link
              href="/browse?category=pets"
              data-testid="categories-tile-pets"
              aria-label="Pet care — explore pet care"
              className={`group flex h-full min-h-[200px] overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 ${
                isAll ? '' : 'sm:col-span-2 lg:col-span-1'
              }`}
            >
              <div className="relative w-[42%] min-w-[7.5rem] shrink-0 overflow-hidden bg-[#DBEAFE] sm:w-[46%]">
                <Image
                  src={LIFESTYLE.petcare}
                  alt="Neighbor walking dogs on a sunny path"
                  fill
                  sizes="(min-width:1024px) 28vw, 50vw"
                  className="object-cover object-[58%_20%] transition duration-500 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-5 sm:px-5">
                <p className="font-sans text-[clamp(1.05rem,1.8vw,1.25rem)] font-bold leading-snug tracking-[-0.02em] text-[#071330]">
                  Good days for good dogs.
                </p>
                <span className="text-[14px] font-semibold text-[#1D5CE5]">Explore pet care →</span>
              </div>
            </Link>
          ) : null}

          {showCustom ? (
            <Link
              href="/browse?category=other"
              data-testid="categories-tile-custom"
              aria-label="Custom task — post a custom task"
              className={`group flex h-full min-h-[200px] flex-col justify-center gap-2 overflow-hidden rounded-[10px] bg-[#071330] px-5 py-6 text-white transition hover:bg-[#0B1C42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/55 focus-visible:ring-offset-2 sm:px-6 ${
                isAll ? '' : 'sm:col-span-2 lg:col-span-1'
              }`}
            >
              <p className="font-sans text-[clamp(1.15rem,2vw,1.35rem)] font-bold leading-snug tracking-[-0.02em] text-white">
                A task all your own.
              </p>
              <p className="max-w-[32ch] text-[14.5px] leading-snug text-[#CBD5E1]">
                Describe what you need — even if it doesn’t fit a category.
              </p>
              <span className="mt-1 text-[14px] font-semibold text-white">
                Post a custom task →
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}
