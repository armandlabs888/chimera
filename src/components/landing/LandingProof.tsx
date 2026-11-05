'use client'

import { useEffect, useRef, useState } from 'react'
import { EXAMPLE_LABEL, EXAMPLE_OFFER, EXAMPLE_REQUEST, EXAMPLE_THREAD } from './examples'

function ExampleBadge() {
  return (
    <span className="inline-flex rounded-full border border-beam-amber/30 bg-beam-amber-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-beam-amber">
      {EXAMPLE_LABEL}
    </span>
  )
}

function RequestPanel() {
  return (
    <article className="landing-glass landing-bento p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="landing-meta text-[11px] uppercase tracking-[0.18em] text-beam-muted">Request</p>
        <ExampleBadge />
      </div>
      <h3 className="font-display text-2xl font-semibold text-beam-cream">{EXAMPLE_REQUEST.title}</h3>
      <p className="mt-2 text-sm text-beam-cream-dim">{EXAMPLE_REQUEST.details}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="landing-meta text-[10px] uppercase tracking-[0.16em] text-beam-muted">Where</dt>
          <dd className="mt-1 text-beam-cream">{EXAMPLE_REQUEST.neighborhood}</dd>
        </div>
        <div>
          <dt className="landing-meta text-[10px] uppercase tracking-[0.16em] text-beam-muted">When</dt>
          <dd className="mt-1 text-beam-cream">{EXAMPLE_REQUEST.when}</dd>
        </div>
        <div>
          <dt className="landing-meta text-[10px] uppercase tracking-[0.16em] text-beam-muted">Budget</dt>
          <dd className="mt-1 font-semibold text-beam-amber">{EXAMPLE_REQUEST.budget}</dd>
        </div>
        <div>
          <dt className="landing-meta text-[10px] uppercase tracking-[0.16em] text-beam-muted">Category</dt>
          <dd className="mt-1 text-beam-cream">{EXAMPLE_REQUEST.category}</dd>
        </div>
      </dl>
    </article>
  )
}

function OfferPanel() {
  return (
    <article className="landing-glass landing-bento p-5 sm:p-6 md:-translate-y-4 md:translate-x-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="landing-meta text-[11px] uppercase tracking-[0.18em] text-beam-muted">Offer</p>
        <ExampleBadge />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-beam-cream">{EXAMPLE_OFFER.helper}</h3>
          <p className="mt-1 text-sm text-beam-muted">{EXAMPLE_OFFER.eta}</p>
        </div>
        <p className="font-display text-3xl font-semibold text-beam-amber">{EXAMPLE_OFFER.price}</p>
      </div>
      <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-beam-cream-dim">
        {EXAMPLE_OFFER.note}
      </p>
    </article>
  )
}

function ThreadPanel() {
  return (
    <article className="landing-glass landing-bento p-5 sm:p-6 md:-translate-x-3 md:translate-y-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="landing-meta text-[11px] uppercase tracking-[0.18em] text-beam-muted">
          Message · complete
        </p>
        <ExampleBadge />
      </div>
      <div className="space-y-3">
        <p className="max-w-[90%] rounded-2xl rounded-bl-md border border-beam-line bg-beam-raised px-4 py-3 text-sm text-beam-cream">
          {EXAMPLE_THREAD.opener}
        </p>
        <p className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-beam-amber px-4 py-3 text-sm font-medium text-beam-base">
          {EXAMPLE_THREAD.reply}
        </p>
      </div>
      <p className="mt-4 text-xs text-beam-muted">
        After the job, mark complete and leave a review — both stay on the request thread.
      </p>
    </article>
  )
}

export function LandingProof() {
  const pinRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)')
    const desktop = window.matchMedia('(min-width: 768px)')

    const frameRef = { id: 0 }
    const onScroll = () => {
      if (!motionOk.matches || !desktop.matches) {
        setPinned(false)
        setProgress(0)
        return
      }
      cancelAnimationFrame(frameRef.id)
      frameRef.id = requestAnimationFrame(() => {
        const el = pinRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const total = el.offsetHeight - window.innerHeight
        if (total <= 0) {
          setPinned(false)
          setProgress(0)
          return
        }
        const raw = Math.min(1, Math.max(0, -rect.top / total))
        setProgress(raw)
        setPinned(rect.top <= 0 && rect.bottom > window.innerHeight)
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    motionOk.addEventListener('change', onScroll)
    desktop.addEventListener('change', onScroll)
    return () => {
      cancelAnimationFrame(frameRef.id)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      motionOk.removeEventListener('change', onScroll)
      desktop.removeEventListener('change', onScroll)
    }
  }, [])

  const stage = progress < 0.33 ? 0 : progress < 0.66 ? 1 : 2

  return (
    <section id="how-it-works" className="relative scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
        <p className="landing-meta text-[11px] font-medium uppercase tracking-[0.22em] text-beam-amber">
          How it works
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-beam-cream sm:text-4xl">
          Request → priced offer → coordinate
        </h2>
        <p className="mt-3 text-base text-beam-cream-dim">
          The same flow you use in Beam. Panels below are fixed examples for illustration — not live
          marketplace data.
        </p>
      </div>

      {/* Always readable stack: mobile + reduced-motion desktop (CSS toggles) */}
      <div className="landing-proof-stack mx-auto grid max-w-3xl gap-4">
        <RequestPanel />
        <OfferPanel />
        <ThreadPanel />
      </div>

      {/* Desktop sticky reveal — hidden for reduced motion / small screens via CSS */}
      <div
        ref={pinRef}
        className="landing-proof-pin relative mx-auto max-w-5xl"
        style={{ height: '220vh' }}
      >
        <div
          className={`sticky top-16 flex h-[min(78vh,720px)] items-center ${pinned ? 'landing-pin-active' : ''}`}
        >
          <div className="grid w-full grid-cols-12 gap-5">
            <div
              className="col-span-7 transition-[transform,opacity] duration-500 ease-out"
              style={{
                transform: `translateY(${stage === 0 ? 0 : 12}px) scale(${stage === 0 ? 1 : 0.98})`,
                opacity: stage === 0 ? 1 : 0.55,
              }}
            >
              <RequestPanel />
            </div>
            <div
              className="col-span-5 self-end transition-[transform,opacity] duration-500 ease-out"
              style={{
                transform: `translateY(${stage >= 1 ? 0 : 40}px)`,
                opacity: stage >= 1 ? (stage === 1 ? 1 : 0.7) : 0.35,
              }}
            >
              <OfferPanel />
            </div>
            <div
              className="col-span-8 col-start-5 -mt-6 transition-[transform,opacity] duration-500 ease-out"
              style={{
                transform: `translateY(${stage >= 2 ? 0 : 48}px)`,
                opacity: stage >= 2 ? 1 : 0.25,
              }}
            >
              <ThreadPanel />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
