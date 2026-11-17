'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Plus } from 'lucide-react'
import { LIFESTYLE } from '@/data/media'
import { POPULAR_SERVICES } from '@/lib/popularServices'
import { LandingReveal } from './LandingReveal'

function PhotoCard({
  service,
  showArrow,
}: {
  service: (typeof POPULAR_SERVICES)[number]
  showArrow?: boolean
}) {
  const narrow = service.id === 'cleaning' || service.id === 'auto'

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
        className="object-cover"
        sizes={
          service.layout === 'photo-large'
            ? '(max-width: 767px) 100vw, 50vw'
            : '(max-width: 767px) 100vw, 25vw'
        }
      />
      <span
        className={`pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent ${
          narrow
            ? 'from-[rgba(7,19,48,0.9)] via-[rgba(7,19,48,0.45)] via-40%'
            : 'from-[rgba(7,19,48,0.82)] via-[rgba(7,19,48,0.28)]'
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute inset-x-0 bottom-0 z-[1] flex flex-col gap-1 ${
          narrow ? 'p-3.5 sm:p-4 lg:p-5' : 'p-4 sm:p-5'
        }`}
      >
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
          className={`text-[13px] leading-[1.45] text-white/85 ${
            narrow ? 'max-w-none lg:text-[13px] xl:text-[14px]' : 'max-w-[34ch] sm:text-[14px]'
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
      className="landing-section relative z-10 border-t border-transparent bg-white"
      data-testid="landing-categories"
    >
      <div className="beam-container">
        <LandingReveal className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="min-w-0 md:max-w-[34rem]">
            <p className="landing-section-eyebrow">Start here</p>
            <h2 className="landing-section-title">Popular Neighborhood Services</h2>
          </div>
          <p className="max-w-md text-[15px] leading-[1.55] text-[#4A5568] md:max-w-[22rem] md:text-right md:text-pretty">
            Pick a category to start a request and see what neighbors nearby typically charge.
          </p>
        </LandingReveal>

        <LandingReveal
          data-testid="categories-bento"
          aria-label="Popular Neighborhood Services"
          className="categories-bento mt-7"
        >
          <PhotoCard service={moving} showArrow />
          <PhotoCard service={cleaning} />
          <PhotoCard service={auto} />
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
              className="object-cover"
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
        </LandingReveal>
      </div>
    </section>
  )
}
