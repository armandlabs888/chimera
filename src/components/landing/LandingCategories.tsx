'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Plus } from 'lucide-react'
import { POPULAR_SERVICES } from '@/lib/popularServices'

function PhotoCard({
  service,
  showArrow,
  compact,
}: {
  service: (typeof POPULAR_SERVICES)[number]
  showArrow?: boolean
  compact?: boolean
}) {
  return (
    <Link
      href={service.href}
      data-testid={service.testId}
      aria-label={service.label}
      className={`categories-photo-card group relative isolate overflow-hidden rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5] focus-visible:ring-offset-2 ${
        service.layout === 'photo-large' ? 'categories-tile-moving' : `categories-tile-${service.id}`
      }`}
    >
      <Image
        src={service.src}
        alt={service.alt}
        fill
        className="object-cover transition-transform duration-[450ms] ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        sizes={
          service.layout === 'photo-large'
            ? '(max-width: 767px) 100vw, 50vw'
            : '(max-width: 767px) 100vw, 25vw'
        }
      />
      <span
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,19,48,0.82)] via-[rgba(7,19,48,0.28)] to-transparent"
        aria-hidden="true"
      />
      <span className="absolute inset-x-0 bottom-0 z-[1] flex flex-col gap-1 p-4 sm:p-5">
        <span className="flex items-start justify-between gap-3">
          <span className="text-[17px] font-bold leading-tight tracking-[-0.025em] text-white sm:text-[18px]">
            {service.label}
          </span>
          {showArrow ? (
            <ArrowUpRight
              className="mt-0.5 h-4 w-4 shrink-0 text-white/90 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              strokeWidth={2.2}
              aria-hidden="true"
            />
          ) : null}
        </span>
        <span
          className={`max-w-[34ch] text-[13px] leading-[1.45] text-white/85 sm:text-[14px] ${
            compact ? 'md:hidden' : ''
          }`}
        >
          {service.description}
        </span>
      </span>
    </Link>
  )
}

/**
 * Popular services: 12-col bento with photo tiles, a light junk card,
 * and a custom-task CTA linked to /post.
 */
export function LandingCategories() {
  const moving = POPULAR_SERVICES.find((s) => s.id === 'moving')!
  const cleaning = POPULAR_SERVICES.find((s) => s.id === 'cleaning')!
  const auto = POPULAR_SERVICES.find((s) => s.id === 'auto')!
  const pets = POPULAR_SERVICES.find((s) => s.id === 'pets')!
  const junk = POPULAR_SERVICES.find((s) => s.id === 'junk')!

  return (
    <section
      id="categories"
      className="relative z-10 border-t border-transparent bg-white"
      data-testid="landing-categories"
    >
      <div className="beam-container">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="min-w-0 md:max-w-[34rem]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1D5CE5]">
              Start here
            </p>
            <h2 className="mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-[#071330] md:text-[32px]">
              Popular Neighborhood Services
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-[1.55] text-[#4A5568] md:max-w-[22rem] md:text-right">
            Pick a category to start a request and see what neighbors nearby typically charge.
          </p>
        </div>

        <div
          data-testid="categories-bento"
          aria-label="Popular Neighborhood Services"
          className="categories-bento mt-7"
        >
          <PhotoCard service={moving} showArrow />
          <PhotoCard service={cleaning} compact />
          <PhotoCard service={auto} compact />
          <PhotoCard service={pets} />

          <Link
            href={junk.href}
            data-testid={junk.testId}
            aria-label={junk.label}
            className="categories-light-card categories-tile-junk group relative flex flex-col justify-between overflow-hidden rounded-[12px] border border-[#E3E8EF] bg-[#F7F9FC] p-5 transition-colors duration-300 hover:border-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5] focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <ArrowUpRight
              className="absolute right-4 top-4 h-4 w-4 text-[#071330]/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#1D5CE5] motion-reduce:transition-none"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <div className="pr-8">
              <h3 className="text-[17px] font-bold leading-tight tracking-[-0.025em] text-[#071330] sm:text-[18px]">
                {junk.label}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.5] text-[#4A5568]">{junk.description}</p>
            </div>
          </Link>

          <Link
            href="/post"
            data-testid="categories-tile-custom"
            aria-label="Post a custom task"
            className="categories-custom-card categories-tile-custom group relative flex flex-col justify-between overflow-hidden rounded-[12px] border border-[#D7E0EC] bg-[#EEF2F7] p-5 transition-colors duration-300 hover:border-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5] focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <span
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1D5CE5]/12 text-[#1D5CE5] transition-colors duration-300 group-hover:bg-[#1D5CE5]/18"
              aria-hidden="true"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <div className="pr-10">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#1D5CE5]">
                Need something else? Free to post
              </p>
              <h3 className="mt-2 text-[17px] font-bold leading-tight tracking-[-0.025em] text-[#071330] sm:text-[18px]">
                Post a custom task
              </h3>
              <p className="mt-2 text-[14px] leading-[1.5] text-[#4A5568]">
                TV mounting, furniture assembly, or heavy lifting. Describe it once and compare
                offers from neighbors.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
