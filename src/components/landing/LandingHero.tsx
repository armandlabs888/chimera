import Image from 'next/image'
import Link from 'next/link'
import { LandingSection } from '@/components/flat'
import { CATEGORIES } from '@/data/categories'

const HERO_CATEGORIES = CATEGORIES.filter((c) =>
  ['moving', 'cleaning', 'handyman', 'tutoring'].includes(c.id),
)

/** Full-viewport light hero with gig-work photography + two-column layout. */
export function LandingHero() {
  return (
    <LandingSection
      tone="base"
      fullPage
      className="border-b border-beam-line px-4 sm:px-6"
    >
      <div className="mx-auto grid w-full max-w-[72rem] items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="max-w-xl">
          <p className="landing-meta type-meta text-beam-amber">Austin · same-day help nearby</p>

          <h1 className="landing-headline mt-3 text-beam-charcoal">Help nearby. Done today.</h1>

          <p className="landing-hero-copy mt-4 max-w-md type-intro text-beam-cream-dim">
            Post a practical task. Neighbors nearby reply with a price and a time. Pick an offer and
            message to coordinate.
          </p>

          <div className="landing-cta-row mt-7 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
            <Link
              href="/post"
              className="touch-target inline-flex items-center justify-center rounded-[10px] bg-beam-amber px-5 text-[15px] font-semibold text-beam-charcoal transition hover:bg-beam-amber-deep"
            >
              Post a request
            </Link>
            <Link
              href="/browse"
              className="touch-target inline-flex items-center justify-center rounded-[10px] border border-beam-line bg-beam-base px-5 text-[15px] font-medium text-beam-cream transition hover:border-beam-cream/30"
            >
              Browse requests
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-2" aria-label="Popular categories">
            {HERO_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/browse?category=${cat.id}`}
                className="btn-compact inline-flex items-center rounded-full border border-beam-line bg-white px-3.5 text-[13px] font-medium text-beam-cream-dim transition hover:border-beam-cream/35 hover:text-beam-cream"
              >
                {cat.shortLabel}
              </Link>
            ))}
          </div>

          <p className="mt-4 type-sec text-beam-muted">Post · priced offers · in-thread messaging</p>
        </div>

        <figure className="landing-hero-media relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
          <div className="overflow-hidden rounded-[14px] border border-beam-line bg-beam-ink shadow-sm">
            <Image
              src="/images/beam-hero-gig-work.jpg"
              alt="Neighbors assembling a bookshelf and unpacking a boxed armchair in a sunlit living room"
              width={1152}
              height={864}
              priority
              sizes="(max-width: 1024px) 100vw, 36rem"
              className="h-auto w-full object-cover"
            />
          </div>
          <figcaption className="mt-2 type-meta text-beam-muted">
            Example — moving &amp; light handyman help nearby
          </figcaption>
        </figure>
      </div>
    </LandingSection>
  )
}
