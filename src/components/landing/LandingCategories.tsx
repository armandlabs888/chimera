'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Plus } from 'lucide-react'
import { LIFESTYLE } from '@/data/media'
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
 * Popular services: 12-col bento with photo tiles and a custom-task CTA linked to /post.
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
          <PhotoCard service={junk} showArrow />

          <Link
            href="/post"
            data-testid="categories-tile-custom"
            aria-label="Post a custom task"
            className="categories-photo-card categories-custom-card categories-tile-custom group relative isolate overflow-hidden rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5] focus-visible:ring-offset-2"
          >
            <Image
              src={LIFESTYLE.handyman}
              alt="Neighbor assembling a bookshelf in a living room"
              fill
              className="object-cover transition-transform duration-[450ms] ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              sizes="(max-width: 767px) 100vw, 33vw"
            />
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,19,48,0.88)] via-[rgba(29,92,229,0.42)] to-[rgba(29,92,229,0.18)]"
              aria-hidden="true"
            />
            <span
              className="absolute right-4 top-4 z-[1] flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/35 transition-colors duration-300 group-hover:bg-white/28"
              aria-hidden="true"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="absolute inset-x-0 bottom-0 z-[1] flex flex-col gap-1 p-4 sm:p-5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#B8D4FF]">
                Need something else? Free to post
              </span>
              <span className="text-[17px] font-bold leading-tight tracking-[-0.025em] text-white sm:text-[18px]">
                Post a custom task
              </span>
              <span className="max-w-[34ch] text-[13px] leading-[1.45] text-white/85 sm:text-[14px]">
                TV mounting, furniture assembly, or heavy lifting. Describe it once and compare
                offers from neighbors.
              </span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
