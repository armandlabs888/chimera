'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LIFESTYLE } from '@/data/media'

/**
 * Popular services — Landing v2 compact 3-up (House cleaning, Pet care, custom navy).
 * Other remains here (not in Available six-grid). Filters removed to match Paper v2.
 */
export function LandingCategories() {
  return (
    <section
      id="categories"
      className="relative z-10 -mt-4 border-t border-transparent bg-white pt-6 md:pt-8"
      data-testid="landing-categories"
    >
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1D5CE5]">
              Start here
            </p>
            <h2 className="mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-[#071330] md:text-[30px]">
              Popular services
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-5 text-[#475569]">
            A few good places to begin — or post something custom.
          </p>
        </div>

        <div
          data-testid="categories-bento"
          aria-label="Popular services"
          className="mt-6 grid gap-3 sm:grid-cols-3"
        >
          <Link
            href="/browse?category=home"
            data-testid="categories-tile-cleaning"
            aria-label="House cleaning — explore house cleaning"
            className="group overflow-hidden rounded-[12px] border border-[#D7E0EC] bg-white transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45"
          >
            <Image
              src={LIFESTYLE.cleaningCrew}
              alt="Person wiping a kitchen counter"
              width={400}
              height={128}
              className="h-32 w-full object-cover"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="p-3">
              <h3 className="text-[15px] font-semibold text-[#071330]">House cleaning</h3>
              <p className="mt-0.5 text-[13px] text-[#475569]">Make space for the weekend.</p>
              <p className="mt-2 text-[13px] font-semibold text-[#1D5CE5] group-hover:underline">
                Explore →
              </p>
            </div>
          </Link>

          <Link
            href="/browse?category=pets"
            data-testid="categories-tile-pets"
            aria-label="Pet care — explore pet help"
            className="group overflow-hidden rounded-[12px] border border-[#D7E0EC] bg-white transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45"
          >
            <Image
              src={LIFESTYLE.petcare}
              alt="Person walking dogs outdoors"
              width={400}
              height={128}
              className="h-32 w-full object-cover object-[center_20%]"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="p-3">
              <h3 className="text-[15px] font-semibold text-[#071330]">Pet care</h3>
              <p className="mt-0.5 text-[13px] text-[#475569]">Walks, sitting, and grooming.</p>
              <p className="mt-2 text-[13px] font-semibold text-[#1D5CE5] group-hover:underline">
                Explore →
              </p>
            </div>
          </Link>

          <Link
            href="/browse?category=other"
            data-testid="categories-tile-custom"
            aria-label="Something else — post a custom task"
            className="flex min-h-[180px] flex-col justify-between rounded-[12px] bg-gradient-to-br from-[#071330] to-[#0C2148] p-4 text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45"
          >
            <div>
              <h3 className="text-[15px] font-semibold">Something else?</h3>
              <p className="mt-2 text-[13px] leading-5 text-[#D7E0EC]">
                Describe a custom task — even if it doesn’t fit a category.
              </p>
            </div>
            <p className="mt-4 text-[13px] font-semibold">Post a custom task →</p>
          </Link>
        </div>
      </div>
    </section>
  )
}
