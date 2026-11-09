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
      className="bg-white py-16 sm:py-20"
      data-testid="available-services"
    >
      <div className="beam-container">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D5CE5]">
            03 / Explore all six
          </p>
          <h2
            id="available-services-heading"
            className="mt-3 font-sans text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[#071330] text-balance"
          >
            Available services on Beam
          </h2>
          <p className="mt-2 max-w-[52ch] text-[15px] leading-[1.55] text-[#475569]">
            Choose a service to explore. Have something else in mind?{' '}
            <Link
              href="/browse?category=other"
              className="font-semibold text-[#1D5CE5] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
            >
              Post a custom task
            </Link>
            .
          </p>
        </div>

        <div
          role="list"
          aria-labelledby="available-services-heading"
          data-testid="available-services-grid"
          className="mt-8 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 lg:gap-5"
        >
          {SERVICES.map((service) => (
            <Link
              key={service.id}
              role="listitem"
              href={service.href}
              data-service-card
              data-testid={`available-service-${service.id}`}
              aria-label={`${service.label} — browse tasks`}
              className="group relative flex w-full flex-col overflow-hidden rounded-[10px] border border-[#64748B] bg-white transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[#1D5CE5] motion-safe:hover:shadow-[0_16px_36px_-20px_rgba(29,92,229,0.45)] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/55 focus-visible:ring-offset-2"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#DBEAFE]">
                <Image
                  src={service.image}
                  alt={service.alt}
                  fill
                  sizes="(min-width:1024px) 33vw, (min-width:420px) 50vw, 90vw"
                  loading="lazy"
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
      </div>
    </section>
  )
}
