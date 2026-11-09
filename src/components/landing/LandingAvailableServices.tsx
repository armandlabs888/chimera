import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
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
 * Available services on Beam — fixed image-led card grid (desktop 3×2 / tablet 2 / mobile 1).
 * Whole card = Browse leaf link. Other stays elsewhere (bento/footer/forms).
 */
const SERVICES: ServiceCard[] = [
  {
    id: 'house-cleaning',
    label: 'House Cleaning',
    href: '/browse?category=house-cleaning',
    // Kitchen lifestyle — distinct from Popular bento orange-crew (Paper lock).
    // Paper also showed crew here; uniqueness forbids dual use of the same shot.
    image: '/images/landing/service-cleaning.jpg',
    alt: 'Neighbor wiping a sunlit kitchen counter during a home cleaning job',
    objectPosition: 'object-[50%_22%]',
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
]

export function LandingAvailableServices() {
  return (
    <section
      id="neighborhoods"
      className="bg-white py-11 md:py-14"
      data-testid="available-services"
    >
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1D5CE5]">
          Explore all six
        </p>
        <h2
          id="available-services-heading"
          className="mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-[#071330] md:text-[30px]"
        >
          Available services on Beam
        </h2>
        <p className="mt-1.5 max-w-xl text-[14px] leading-5 text-[#475569]">
          Choose a service to explore. Need something else?{' '}
          <Link
            href="/browse?category=other"
            className="font-semibold text-[#1D5CE5] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
          >
            Post a custom task
          </Link>
          .
        </p>

        <div
          role="list"
          aria-labelledby="available-services-heading"
          data-testid="available-services-grid"
          className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SERVICES.map((service) => (
            <Link
              key={service.id}
              role="listitem"
              href={service.href}
              data-service-card
              data-testid={`available-service-${service.id}`}
              aria-label={`${service.label} — browse tasks`}
              className="group overflow-hidden rounded-[12px] border border-[#64748B] bg-white transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/55 focus-visible:ring-offset-2"
            >
              <div className="relative h-28 w-full overflow-hidden bg-[#DBEAFE] sm:h-36 lg:h-40">
                <Image
                  src={service.image}
                  alt={service.alt}
                  fill
                  sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 90vw"
                  loading="lazy"
                  className={`object-cover ${service.objectPosition}`}
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 text-[14px] font-semibold text-[#071330]">
                <span className="min-w-0 truncate">{service.label}</span>
                <span className="text-[#1D5CE5]" aria-hidden>
                  <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
