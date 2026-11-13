'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LIFESTYLE } from '@/data/media'

const SERVICES = [
  {
    id: 'cleaning',
    label: 'House cleaning',
    href: '/browse?category=home',
    src: LIFESTYLE.cleaningCrew,
    alt: 'Cleaning crew with equipment in a living room',
    testId: 'categories-tile-cleaning',
  },
  {
    id: 'auto',
    label: 'Auto detailing',
    href: '/browse?category=auto',
    src: '/images/landing/avail-auto-detailing.jpg',
    alt: 'Person washing a car with soap suds',
    testId: 'categories-tile-auto',
  },
  {
    id: 'junk',
    label: 'Junk removal',
    href: '/browse?category=junk-removal',
    src: '/images/landing/avail-junk-removal.jpg',
    alt: 'Neighbors carrying a sofa outdoors',
    testId: 'categories-tile-junk',
  },
  {
    id: 'pets',
    label: 'Pet care',
    href: '/browse?category=pets',
    src: '/images/landing/avail-pet-sitting.jpg',
    alt: 'Person walking dogs on a path',
    testId: 'categories-tile-pets',
  },
] as const

/**
 * Popular services: four equal photo tiles (House cleaning, Auto detailing,
 * Junk removal, Pet care) plus a quiet custom-task link.
 */
export function LandingCategories() {
  return (
    <section
      id="categories"
      className="relative z-10 border-t border-transparent bg-white"
      data-testid="landing-categories"
    >
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1D5CE5]">
            Start here
          </p>
          <h2 className="mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-[#071330] md:text-[30px]">
            Popular services
          </h2>
          <p className="mt-2 max-w-xl text-[14px] leading-5 text-[#475569]">
            House cleaning, auto detailing, junk removal, and pet care. Or post something custom.
          </p>
        </div>

        <div
          data-testid="categories-bento"
          aria-label="Popular services"
          className="mt-7 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5"
        >
          {SERVICES.map((service) => (
            <Link
              key={service.id}
              href={service.href}
              data-testid={service.testId}
              aria-label={service.label}
              className="group relative isolate aspect-[3/4] overflow-hidden rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45"
            >
              <Image
                src={service.src}
                alt={service.alt}
                fill
                className="object-cover transition-transform duration-[450ms] ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,19,48,0.78)] via-[rgba(7,19,48,0.18)] to-transparent"
                aria-hidden="true"
              />
              <span className="absolute bottom-[18px] left-5 right-4 z-[1] text-[17px] font-bold leading-tight tracking-[-0.025em] text-white md:text-[20px]">
                {service.label}
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-[22px] text-[14px] text-[#475569]">
          Need something else?{' '}
          <Link
            href="/post"
            data-testid="categories-custom-link"
            className="font-semibold text-[#1D5CE5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
          >
            Post a custom task →
          </Link>
        </p>
      </div>
    </section>
  )
}
