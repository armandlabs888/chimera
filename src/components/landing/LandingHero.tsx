'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useBeam } from '@/context/BeamContext'
import {
  DescribeSearchForm,
  type DescribeSearchSubmit,
} from '@/components/describe/DescribeSearchForm'
import { readBrowseLocationPin } from '@/lib/browseLocationPreference'
import type { DescribeRoleHint } from '@/lib/describeIntent'
import { normalizeZipInput } from '@/lib/zip/format'
import './landing-v2.css'

function knownClientZip(input: {
  helperZip?: string | null
  pinZip?: string | null
  locationLabel?: string | null
}): string {
  const fromHelper = normalizeZipInput(input.helperZip ?? '')
  if (fromHelper) return fromHelper
  const fromPin = normalizeZipInput(input.pinZip ?? '')
  if (fromPin) return fromPin
  const fromLabel = (input.locationLabel || '').match(/\b(\d{5})\b/)
  return fromLabel ? fromLabel[1] : ''
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return reduced
}

/**
 * Landing hero: full-bleed neighbor video with Thumbtack-style describe search.
 * Guests and signed-in users share one describe + ZIP + Search control.
 */
export function LandingHero() {
  const router = useRouter()
  const { authUser, mode, helperVerification, currentUser } = useBeam()
  const [zipPrefillReady, setZipPrefillReady] = useState(false)
  const [zip, setZip] = useState('')
  const prefersReducedMotion = usePrefersReducedMotion()

  const roleHint: DescribeRoleHint = useMemo(() => {
    if (mode === 'live' && !authUser) return 'guest'
    if (currentUser?.accountRole === 'helper') return 'helper'
    if (currentUser?.accountRole === 'customer') return 'customer'
    return 'guest'
  }, [mode, authUser, currentUser?.accountRole])

  const prefillZip = useMemo(
    () =>
      knownClientZip({
        helperZip: helperVerification?.zip,
        pinZip: zipPrefillReady ? readBrowseLocationPin()?.zip : null,
        locationLabel: currentUser?.locationLabel,
      }),
    [helperVerification?.zip, currentUser?.locationLabel, zipPrefillReady],
  )

  useEffect(() => {
    setZipPrefillReady(true)
  }, [])

  useEffect(() => {
    if (!zipPrefillReady) return
    if (zip) return
    if (prefillZip) setZip(prefillZip)
  }, [zipPrefillReady, prefillZip, zip])

  function onSearch(payload: DescribeSearchSubmit) {
    if (payload.zip) setZip(payload.zip)
    const params = new URLSearchParams()
    if (payload.q) params.set('q', payload.q)
    if (payload.zip) params.set('zip', payload.zip)
    params.set('intent', payload.intent)
    if (payload.categoryId) params.set('category', payload.categoryId)
    router.push(`/match?${params.toString()}`)
  }

  return (
    <section className="landing-hero-photo relative isolate min-h-[100svh] rounded-none pb-0 pt-0 mb-0">
      {/* Clip the media/overlays only; keep content overflow visible for popovers. */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-none"
        aria-hidden="true"
        data-testid="landing-hero-photo"
      >
        {prefersReducedMotion ? (
          <Image
            src="/hero/hero-poster.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={85}
            className="landing-hero-photo-img rounded-none object-cover"
          />
        ) : (
          <video
            className="landing-hero-photo-img landing-hero-video absolute inset-0 h-full w-full rounded-none object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/hero/hero-poster.jpg"
            data-testid="landing-hero-video"
          >
            <source src="/hero/hero-loop.mp4" type="video/mp4" />
          </video>
        )}
        <div className="landing-hero-overlay absolute inset-0" />
        <div className="landing-hero-overlay-mute absolute inset-0" />
      </div>

      <div className="landing-hero-content relative z-20" data-testid="landing-hero">
        <div className="beam-container relative z-10 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8FB2FF]">
            Local services · Real everyday help
          </p>

          <h1 className="mx-auto mt-5 max-w-[17ch] text-[44px] font-extrabold leading-[1.02] tracking-[-0.045em] text-white md:text-[72px]">
            <span className="block">Trusted help,</span>
            <span className="block whitespace-nowrap">
              right <span className="text-[#8FB2FF]">next door.</span>
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-6 text-white/80 md:text-[17px] md:leading-7">
            Describe the job, compare helpers nearby, or find new work in your area.
          </p>

          <div className="mx-auto mt-9 flex w-full justify-center">
            <DescribeSearchForm
              key={zip || 'no-zip'}
              initialZip={zip}
              roleHint={roleHint}
              cityLabel={currentUser?.city || ''}
              variant="hero"
              showChips
              onSubmit={onSearch}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
