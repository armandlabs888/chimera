import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HeroBeamArt } from './HeroBeamArt'

/** Full-viewport navy hero — Beam copy + original SVG light artwork. */
export function LandingHero() {
  return (
    <section
      id="hero"
      className="landing-hero relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[var(--hero-navy)] text-white"
      aria-label="Beam introduction"
    >
      <div className="landing-hero-art pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <HeroBeamArt />
      </div>

      {/* Soft left scrim so lower-left copy stays readable over the beam */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,6,15,0.88)_0%,rgba(2,6,15,0.55)_34%,rgba(2,6,15,0.12)_58%,transparent_72%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[55%] bg-[linear-gradient(180deg,transparent_0%,rgba(2,6,15,0.35)_40%,rgba(2,6,15,0.72)_100%)]"
        aria-hidden
      />

      <div className="landing-hero-content relative mx-auto w-full max-w-[72rem] px-4 pb-10 pt-[calc(var(--beam-nav-offset)+1.5rem)] sm:px-6 sm:pb-14 md:pb-16">
        <div className="max-w-xl">
          <p className="landing-meta type-meta text-white/55">Austin · same-day help nearby</p>

          <h1 className="landing-headline mt-3 text-white">Help nearby. Done today.</h1>

          <p className="landing-hero-copy mt-4 max-w-md text-[15px] leading-[22px] text-white/70 sm:text-[17px] sm:leading-[26px]">
            Post a practical task. Neighbors nearby reply with a price and a time. Pick an offer and
            message to coordinate.
          </p>

          <div className="landing-cta-row mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href="/post"
              className="touch-target inline-flex items-center justify-center gap-2 rounded-[10px] bg-white px-5 text-[15px] font-semibold text-[#0c0c0e] transition hover:bg-white/90"
            >
              Post a request
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/browse"
              className="touch-target inline-flex items-center justify-center gap-2 rounded-[10px] px-3 text-[14px] font-medium text-white/80 transition hover:text-white"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden />
              Browse requests
            </Link>
          </div>

          <p className="mt-4 type-sec text-white/45">Post · priced offers · in-thread messaging</p>

          <a
            href="#how-it-works"
            className="mt-5 inline-flex min-h-11 items-center text-[13px] font-medium text-white/55 underline-offset-4 transition hover:text-white hover:underline"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  )
}
