'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'
import type { ServiceCategoryId } from '@/lib/taxonomy'

type ServiceCard = {
  id: ServiceCategoryId
  label: string
  href: string
  image: string
  alt: string
  objectPosition: string
}

/**
 * Horizontal image-led “Available services on Beam” row.
 * Whole card = Browse leaf link. Scroll-snap + prev/next when overflow.
 */
const SERVICES: ServiceCard[] = [
  {
    id: 'house-cleaning',
    label: 'House Cleaning',
    href: '/browse?category=house-cleaning',
    image: '/images/landing/avail-house-cleaning.jpg',
    alt: 'Three neighbors with vacuums and a mop ready for a home cleaning job',
    objectPosition: 'object-[50%_30%]',
  },
  {
    id: 'carpet-cleaning',
    label: 'Carpet Cleaning',
    href: '/browse?category=carpet-cleaning',
    image: '/images/landing/avail-carpet-cleaning.jpg',
    alt: 'Vacuum cleaning a patterned living-room rug',
    objectPosition: 'object-center',
  },
  {
    id: 'auto-detailing',
    label: 'Auto Detailing',
    href: '/browse?category=auto-detailing',
    image: '/images/landing/avail-auto-detailing.jpg',
    alt: 'Neighbor hand-washing a car with sponge and soapy wash buckets',
    objectPosition: 'object-[40%_40%]',
  },
  {
    id: 'junk-removal',
    label: 'Junk Removal',
    href: '/browse?category=junk-removal',
    image: '/images/landing/avail-junk-removal.jpg',
    alt: 'Two neighbors carrying a chair toward a pickup truck for haul-away',
    objectPosition: 'object-[50%_35%]',
  },
  {
    id: 'pet-sitting',
    label: 'Pet Sitting',
    href: '/browse?category=pet-sitting',
    image: '/images/landing/avail-pet-sitting.jpg',
    alt: 'Neighbor walking several dogs together on a sunny path',
    objectPosition: 'object-[50%_45%]',
  },
  {
    id: 'grooming',
    label: 'Grooming',
    href: '/browse?category=grooming',
    image: '/images/landing/avail-grooming.jpg',
    alt: 'Neighbor bathing a golden dog in a home bathtub',
    objectPosition: 'object-[45%_35%]',
  },
  {
    id: 'other',
    label: 'Other',
    href: '/browse?category=other',
    image: '/images/landing/avail-other.jpg',
    alt: 'Neighbors setting an outdoor table for everyday local help',
    objectPosition: 'object-[50%_30%]',
  },
]

export function LandingAvailableServices() {
  const headingId = useId()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateOverflow = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const overflow = max > 4
    setCanPrev(overflow && el.scrollLeft > 4)
    setCanNext(overflow && el.scrollLeft < max - 4)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateOverflow()
    const onScroll = () => updateOverflow()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(() => updateOverflow())
    ro.observe(el)
    window.addEventListener('resize', updateOverflow)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
      window.removeEventListener('resize', updateOverflow)
    }
  }, [updateOverflow])

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-service-card]')
    const delta = (card?.offsetWidth ?? 220) + 16
    el.scrollBy({ left: dir * delta, behavior: 'smooth' })
  }

  return (
    <div
      id="neighborhoods"
      className="mt-16 border-y border-[#C7D7F0] bg-[#EEF4FF] py-12 sm:mt-20 sm:py-14"
      data-testid="available-services"
    >
      <div className="beam-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="inline-flex rounded-md bg-[#1D5CE5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
              On Beam
            </p>
            <h2
              id={headingId}
              className="mt-3 font-display text-[clamp(1.65rem,3vw,2.35rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330] text-balance"
            >
              Available services on Beam
            </h2>
            <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.55] text-[#334155]">
              Everyday help types Beam supports — open a card to browse tasks in that category.
            </p>
          </div>

          <div
            className="flex shrink-0 items-center gap-2"
            data-testid="available-services-controls"
          >
            <button
              type="button"
              aria-label="Show previous services"
              data-testid="available-services-prev"
              disabled={!canPrev}
              onClick={() => scrollByCard(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#64748B] bg-white text-[#071330] transition enabled:hover:border-[#1D5CE5] enabled:hover:text-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF4FF] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Show next services"
              data-testid="available-services-next"
              disabled={!canNext}
              onClick={() => scrollByCard(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#64748B] bg-white text-[#071330] transition enabled:hover:border-[#1D5CE5] enabled:hover:text-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF4FF] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>

        <div className="relative mt-7">
          <div
            ref={scrollerRef}
            role="list"
            aria-labelledby={headingId}
            data-testid="available-services-row"
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
          >
            {SERVICES.map((service) => (
              <Link
                key={service.id}
                role="listitem"
                href={service.href}
                data-service-card
                data-testid={`available-service-${service.id}`}
                aria-label={`${service.label} — browse tasks`}
                className="group relative flex w-[min(72vw,220px)] shrink-0 snap-start flex-col overflow-hidden rounded-[10px] border border-[#64748B] bg-white transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[#1D5CE5] motion-safe:hover:shadow-[0_16px_36px_-20px_rgba(29,92,229,0.55)] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF4FF] sm:w-[200px] lg:w-[220px]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#DBEAFE]">
                  <Image
                    src={service.image}
                    alt={service.alt}
                    fill
                    // Request a >=640px source so smoke naturalWidth>=400 stays honest.
                    sizes="(min-width:1024px) 440px, 70vw"
                    priority
                    className={`object-cover ${service.objectPosition} transition duration-300 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                  <span className="min-w-0 truncate text-[14px] font-bold leading-snug text-[#071330]">
                    {service.label}
                  </span>
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#EEF4FF] text-[#1D5CE5] transition group-hover:bg-[#1D5CE5] group-hover:text-white"
                    aria-hidden
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Visible next-card cue when more content exists to the right */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[#EEF4FF] to-transparent transition-opacity ${
              canNext ? 'opacity-100' : 'opacity-0'
            }`}
            data-testid="available-services-next-cue"
          />
        </div>
      </div>
    </div>
  )
}
