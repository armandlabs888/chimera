import Image from 'next/image'
import Link from 'next/link'
import { AppWindow, LandingSection } from '@/components/flat'
import { Avatar, Badge } from '@/components/ui'
import { CATEGORIES } from '@/data/categories'
import { EXAMPLE_LABEL, EXAMPLE_OFFER, EXAMPLE_REQUEST } from './examples'

const HERO_CATEGORIES = CATEGORIES.filter((c) =>
  ['moving', 'cleaning', 'handyman', 'tutoring'].includes(c.id),
)

export function LandingHero() {
  return (
    <LandingSection
      tone="canvas"
      className="canvas-dotfield border-b border-black/[0.05] !pt-6 !pb-12 md:!pt-10 md:!pb-16"
    >
      <div className="section-inner grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="max-w-xl animate-fade-up">
          <span className="eyebrow-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Austin · same-day help nearby
          </span>
          <h1 className="landing-headline mt-5 text-beam-charcoal">Help nearby. Done today.</h1>
          <p className="mt-4 max-w-md type-intro text-beam-cream-dim">
            Post a practical task. Neighbors reply with a price and arrival window — then coordinate
            in-thread.
          </p>

          <div className="landing-cta-row mt-7 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
            <Link
              href="/post"
              className="touch-target inline-flex items-center justify-center rounded-[12px] bg-beam-amber px-5 text-[15px] font-semibold text-beam-charcoal shadow-[0_1px_2px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.4)] transition hover:bg-beam-amber-deep hover:text-white"
            >
              Post a request
            </Link>
            <Link
              href="/browse"
              className="touch-target inline-flex items-center justify-center rounded-[12px] bg-white px-5 text-[15px] font-semibold text-beam-cream shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-beam-surface-2"
            >
              Browse requests
            </Link>
            <Link
              href="/auth?mode=signup"
              className="touch-target inline-flex items-center justify-center px-2 text-[14px] font-semibold text-beam-cream-dim underline-offset-4 hover:text-beam-cream hover:underline sm:px-3"
            >
              Create account
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-2" aria-label="Popular categories">
            {HERO_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/browse?category=${cat.id}`}
                className="btn-compact inline-flex items-center gap-2 rounded-full bg-white px-3 text-[13px] font-semibold shadow-[0_0_0_1px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: cat.tintFg }}
                  aria-hidden
                />
                <span style={{ color: cat.tintFg }}>{cat.shortLabel}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="relative animate-fade-up-delay">
          <AppWindow url="yariapp.com/browse" className="relative z-0">
            <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="landing-hero-media relative min-h-[220px] border-b border-black/[0.06] lg:border-b-0 lg:border-r">
                <Image
                  src="/images/beam-hero-gig-work.jpg"
                  alt="Neighbors assembling a bookshelf and unpacking a boxed armchair in a sunlit living room"
                  width={900}
                  height={680}
                  priority
                  sizes="(max-width: 1024px) 100vw, 28rem"
                  className="h-full max-h-[280px] w-full object-cover lg:max-h-none"
                />
              </div>
              <div className="space-y-3 bg-beam-canvas p-3.5">
                <div className="elevated p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="type-meta text-beam-muted">{EXAMPLE_REQUEST.category}</p>
                      <p className="mt-0.5 text-[14px] font-semibold text-beam-cream">
                        {EXAMPLE_REQUEST.title}
                      </p>
                      <p className="mt-1 type-sec text-beam-muted">
                        {EXAMPLE_REQUEST.neighborhood} · {EXAMPLE_REQUEST.when}
                      </p>
                    </div>
                    <span className="price-pill">{EXAMPLE_REQUEST.budget}</span>
                  </div>
                </div>
                <div className="elevated p-3">
                  <div className="flex items-center justify-between">
                    <p className="type-meta text-beam-muted">Open offers</p>
                    <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={EXAMPLE_OFFER.helper} size={28} />
                      <div>
                        <p className="text-[13px] font-semibold text-beam-cream">{EXAMPLE_OFFER.helper}</p>
                        <p className="type-meta text-beam-muted">{EXAMPLE_OFFER.eta}</p>
                      </div>
                    </div>
                    <span className="price-pill">{EXAMPLE_OFFER.price}</span>
                  </div>
                </div>
              </div>
            </div>
          </AppWindow>

          {/* Floating offer toast */}
          <aside
            className="absolute -bottom-4 right-3 z-10 w-[min(100%,17rem)] elevated-md p-3 sm:right-6"
            aria-label="Example offer preview"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Badge tone="outline">{EXAMPLE_LABEL}</Badge>
              <Badge tone="live">Arriving</Badge>
            </div>
            <div className="flex items-center gap-2.5">
              <Avatar name={EXAMPLE_OFFER.helper} size={36} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-beam-cream">
                  {EXAMPLE_OFFER.helper}
                </p>
                <p className="type-meta text-beam-muted">Offer accepted</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-end justify-between">
              <p className="tabular-nums text-[20px] font-semibold tracking-tight text-beam-charcoal">
                {EXAMPLE_OFFER.price}
              </p>
              <p className="type-sec font-medium text-beam-amber-deep">Arrives in 45 min</p>
            </div>
          </aside>
        </div>
      </div>
    </LandingSection>
  )
}
