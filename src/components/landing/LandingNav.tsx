'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { BrowseLocationTrigger } from '@/components/browse/BrowseLocationDialog'
import { useBeam } from '@/context/BeamContext'

export function LandingNav({
  variant = 'hero',
  browseLocationLabel,
}: {
  /** `float` = Landing v2 glass pill (landing route only). `light`/`hero` = guest browse shell. */
  variant?: 'hero' | 'light' | 'float'
  /** Guest Browse: reuse topnav location control without a page eyebrow. */
  browseLocationLabel?: string
}) {
  const { authUser, mode, currentUser, signOut } = useBeam()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isFloat = variant === 'float'
  const light = variant === 'light' || variant === 'float' || scrolled
  const signedInLive = mode === 'live' && Boolean(authUser)
  const onboardingDone = Boolean(currentUser?.onboardingCompletedAt)
  const canOnboardHelper = Boolean(authUser) || mode === 'demo'

  const navLinks = useMemo(
    () => [
      { href: '/browse', label: 'Services' },
      { href: '/#how-it-works', label: 'How it works' },
      {
        href: canOnboardHelper
          ? '/onboarding/helper'
          : '/auth?mode=signup&next=%2Fonboarding%2Fhelper',
        label: 'Become a helper',
      },
    ],
    [canOnboardHelper],
  )

  useEffect(() => {
    if (variant !== 'hero') return
    function onScroll() {
      setScrolled(window.scrollY > 40)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [variant])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const linkClass = isFloat
    ? 'text-[14px] font-medium text-[#071330] transition-colors hover:text-[#1D5CE5]'
    : light
      ? 'text-[15px] font-medium text-[#475569] transition hover:text-[#071330]'
      : 'text-[15px] font-medium text-white/90 transition hover:text-white'

  const loginClass = isFloat
    ? 'hidden text-[13px] font-medium text-[#071330] transition hover:text-[#1D5CE5] sm:inline'
    : light
      ? 'hidden text-[15px] font-medium text-[#071330] transition hover:text-[#1D5CE5] sm:inline'
      : 'hidden text-[15px] font-medium text-white transition hover:text-white/85 sm:inline'

  const ctaClass = isFloat
    ? 'inline-flex h-11 min-h-[44px] items-center justify-center rounded-full bg-[#071330] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#1D5CE5]'
    : light
      ? 'hidden min-h-[44px] items-center justify-center rounded-[10px] bg-[#1D5CE5] px-4 text-[13.5px] font-semibold text-white transition hover:bg-[#1649BD] sm:inline-flex'
      : 'hidden min-h-[44px] items-center justify-center rounded-[10px] bg-white px-4 text-[13.5px] font-semibold text-[#1D5CE5] transition hover:bg-blue-50 sm:inline-flex'

  const primaryHref = onboardingDone ? '/browse' : '/onboarding'
  const primaryLabel = onboardingDone ? 'Browse' : 'Continue setup'

  const bar = (
    <>
      <Link
        href="/"
        className={`relative z-10 inline-flex min-h-[44px] shrink-0 items-center ${isFloat ? '' : 'pl-1'}`}
        aria-label="HouseCall home"
      >
        <BeamWordmark
          tone={light ? 'ink' : 'white'}
          markWidth={18}
          markHeight={18}
          wordClassName={
            isFloat
              ? 'text-[17px] font-bold tracking-[-0.03em] text-[#071330]'
              : 'text-[18px] font-bold tracking-[-0.025em]'
          }
        />
      </Link>

      <nav
        className={`hidden items-center ${isFloat ? 'gap-8 px-6 md:flex' : 'gap-8 lg:flex'}`}
        aria-label="Marketing"
      >
        {navLinks.map((l) =>
          l.href.startsWith('/#') ? (
            <a key={l.href} href={l.href} className={linkClass}>
              {l.label}
            </a>
          ) : (
            <Link key={l.href} href={l.href} className={linkClass}>
              {l.label}
            </Link>
          ),
        )}
      </nav>

      <div
        className={`flex shrink-0 items-center ${
          isFloat ? 'justify-self-end gap-1.5 sm:gap-3' : 'gap-3 sm:gap-5'
        }`}
      >
        {browseLocationLabel ? (
          <BrowseLocationTrigger
            label={browseLocationLabel}
            className={`inline-flex h-11 min-h-[44px] max-w-[9.5rem] items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 sm:max-w-[14rem] sm:px-2.5 ${
              isFloat
                ? 'border border-[#E3E8EF] bg-white/70 text-[#071330] hover:bg-white'
                : light
                  ? 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#071330]'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
            }`}
          />
        ) : null}
        {signedInLive ? (
          <>
            <button
              type="button"
              className={loginClass}
              data-testid="landing-sign-out"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
            <Link href={primaryHref} className={ctaClass} data-testid="landing-nav-primary">
              {primaryLabel}
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth?mode=signin" className={loginClass}>
              Log in
            </Link>
            <Link
              href="/auth?mode=signup&next=%2Fonboarding"
              className={ctaClass}
              data-testid="landing-nav-signup"
            >
              Sign up
            </Link>
          </>
        )}
        <button
          type="button"
          className={
            isFloat
              ? 'inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#E3E8EF] bg-white text-[#071330] md:hidden'
              : `inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] border lg:hidden ${
                  light
                    ? 'border-[#E2E8F0] text-[#071330]'
                    : 'border-white/30 text-white'
                }`
          }
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
    </>
  )

  const mobileMenu = mobileOpen ? (
    <div
      className={`relative z-50 overflow-hidden rounded-[12px] border border-[rgba(7,19,48,0.12)] bg-white shadow-[0_18px_40px_-12px_rgba(12,42,102,0.28)] ${
        isFloat ? 'mx-0 mt-2 md:hidden' : 'mx-4 mb-3 lg:hidden'
      }`}
      data-testid="landing-mobile-menu"
    >
      <div className="flex flex-col py-2">
        {navLinks.map((l) =>
          l.href.startsWith('/#') ? (
            <a
              key={l.href}
              href={l.href}
              className="px-4 py-3 text-[15px] text-[#071330]"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ) : (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-3 text-[15px] text-[#071330]"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ),
        )}
        <div className="my-1 border-t border-[rgba(7,19,48,0.08)]" />
        {signedInLive ? (
          <>
            <button
              type="button"
              className="px-4 py-3 text-left text-[15px] text-[#071330]"
              data-testid="landing-mobile-sign-out"
              onClick={() => {
                setMobileOpen(false)
                void signOut()
              }}
            >
              Sign out
            </button>
            <div className="px-4 pb-3 pt-1">
              <Link
                href={primaryHref}
                className="inline-flex h-9 w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1649BD]"
                data-testid="landing-mobile-primary"
                onClick={() => setMobileOpen(false)}
              >
                {primaryLabel}
              </Link>
            </div>
          </>
        ) : (
          <>
            <Link
              href="/auth?mode=signin"
              className="px-4 py-3 text-[15px] text-[#071330]"
              onClick={() => setMobileOpen(false)}
            >
              Log in
            </Link>
            <div className="px-4 pb-3 pt-1">
              <Link
                href="/auth?mode=signup&next=%2Fonboarding"
                className="inline-flex h-9 w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1649BD]"
                data-testid="landing-mobile-signup"
                onClick={() => setMobileOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null

  if (isFloat) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-6 pt-4 md:px-5 md:pt-5">
        <div className="pointer-events-none w-full md:w-auto md:max-w-[calc(100%-40px)]">
          <header
            className="landing-float-nav pointer-events-auto grid w-full grid-cols-[auto_1fr] items-center md:inline-grid md:w-max md:grid-cols-[1fr_auto_1fr] md:gap-x-10"
            data-testid="landing-nav"
            data-nav-style="float"
          >
            {bar}
          </header>
          <div className="pointer-events-auto w-full">{mobileMenu}</div>
        </div>
      </div>
    )
  }

  return (
    <header
      className={`relative z-50 w-full transition-colors ${
        light
          ? variant === 'hero'
            ? 'sticky top-0 border-b border-[#E2E8F0] bg-white'
            : 'border-b border-[#E2E8F0] bg-white'
          : ''
      }`}
      data-testid="landing-nav"
    >
      <div className="beam-container flex h-14 items-center justify-between lg:h-16">{bar}</div>
      {mobileMenu}
    </header>
  )
}
