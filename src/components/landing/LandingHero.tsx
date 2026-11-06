import Image from 'next/image'
import Link from 'next/link'
import { LandingSection } from '@/components/flat'
import { Badge } from '@/components/ui'
import { CATEGORIES } from '@/data/categories'
import { EXAMPLE_LABEL, EXAMPLE_OFFER, EXAMPLE_REQUEST } from './examples'

const HERO_CATEGORIES = CATEGORIES.filter((c) =>
  ['moving', 'cleaning', 'handyman', 'tutoring'].includes(c.id),
)

export function LandingHero() {
  return (
    <LandingSection tone="base" className="border-b border-beam-line !pt-8 !pb-10 md:!pt-12 md:!pb-14">
      <div className="section-inner grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="max-w-xl">
          <p className="landing-meta type-meta text-beam-amber-deep">Austin · same-day help nearby</p>
          <h1 className="landing-headline mt-3 text-beam-charcoal">Help nearby. Done today.</h1>
          <p className="mt-4 max-w-md type-intro text-beam-cream-dim">
            Post a practical task. Neighbors nearby reply with a price and arrival window. Accept an
            offer, coordinate in-thread, then complete and review — peer-to-peer.
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
              className="touch-target inline-flex items-center justify-center rounded-[10px] border border-beam-line bg-beam-base px-5 text-[15px] font-medium text-beam-cream transition hover:bg-beam-surface-2"
            >
              Browse requests
            </Link>
            <Link
              href="/auth?mode=signup"
              className="touch-target inline-flex items-center justify-center px-2 text-[14px] font-medium text-beam-cream-dim underline-offset-4 hover:text-beam-cream hover:underline sm:px-3"
            >
              Create account
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-2" aria-label="Popular categories">
            {HERO_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/browse?category=${cat.id}`}
                className="btn-compact inline-flex items-center rounded-full border border-beam-line bg-white px-3.5 text-[13px] font-medium text-beam-cream-dim transition hover:border-beam-line-strong hover:text-beam-cream"
              >
                {cat.shortLabel}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <figure className="landing-hero-media relative w-full">
            <div className="overflow-hidden rounded-[14px] border border-beam-line bg-beam-surface-2 shadow-[var(--beam-shadow-xs)]">
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
              Gig-work context — moving &amp; light handyman help nearby
            </figcaption>
          </figure>

          <aside className="product-frame p-4" aria-label="Example workflow preview">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="type-meta text-beam-muted">Example workflow preview</p>
              <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
            </div>
            <div className="rounded-[10px] border border-beam-line bg-beam-surface-2 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-beam-cream">{EXAMPLE_REQUEST.title}</p>
                  <p className="mt-1 type-sec text-beam-muted">
                    {EXAMPLE_REQUEST.neighborhood} · {EXAMPLE_REQUEST.when}
                  </p>
                </div>
                <p className="tabular-nums text-[15px] font-semibold text-beam-cream">
                  {EXAMPLE_REQUEST.budget}
                </p>
              </div>
              <p className="mt-2 type-sec text-beam-cream-dim">{EXAMPLE_REQUEST.details}</p>
            </div>
            <div className="mt-3 rounded-[10px] border border-beam-line bg-beam-base p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="type-meta text-beam-muted">Priced offer · {EXAMPLE_OFFER.helper}</p>
                <Badge tone="brand">Open</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="tabular-nums text-[20px] font-semibold tracking-tight text-beam-charcoal">
                    {EXAMPLE_OFFER.price}
                  </p>
                  <p className="type-sec text-beam-muted">Arrival {EXAMPLE_OFFER.eta}</p>
                </div>
                <span className="rounded-[8px] bg-beam-charcoal px-3 py-1.5 text-[12px] font-semibold text-white">
                  Accept · Example
                </span>
              </div>
              <p className="mt-2 type-sec text-beam-cream-dim">{EXAMPLE_OFFER.note}</p>
            </div>
          </aside>
        </div>
      </div>
    </LandingSection>
  )
}
