'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'

export function LandingNav({
  variant = 'hero',
}: {
  variant?: 'hero' | 'light'
}) {
  const { authUser, mode, currentUser, signOut } = useBeam()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const light = variant === 'light' || scrolled
  const signedInLive = mode === 'live' && Boolean(authUser)
  const onboardingDone = Boolean(currentUser?.onboardingCompletedAt)
  const canOnboardHelper = Boolean(authUser) || mode === 'demo'

  const navLinks = useMemo(
    () => [
      { href: '/browse', label: 'Services' },
      { href: '/#how-it-works', label: 'How it works' },
      { href: '/#neighborhoods', label: 'Neighborhoods' },
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
    if (variant === 'light') return
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

  const linkClass = light
    ? 'text-[15px] font-medium text-[#475569] transition hover:text-[#071330]'
    : 'text-[15px] font-medium text-white/90 transition hover:text-white'

  const loginClass = light
    ? 'hidden text-[15px] font-medium text-[#071330] transition hover:text-[#1D5CE5] sm:inline'
    : 'hidden text-[15px] font-medium text-white transition hover:text-white/85 sm:inline'

  const ctaClass = light
    ? 'hidden h-11 items-center justify-center rounded-full bg-[#1D5CE5] px-5 text-[14.5px] font-semibold text-white transition hover:bg-[#1649BD] sm:inline-flex'
    : 'hidden h-11 items-center justify-center rounded-full bg-white px-5 text-[14.5px] font-semibold text-[#1D5CE5] transition hover:bg-blue-50 sm:inline-flex'

  const primaryHref = onboardingDone ? '/browse' : '/onboarding'
  const primaryLabel = onboardingDone ? 'Browse' : 'Continue setup'

  return (
    <header
      className={`relative z-50 w-full transition-colors ${
        light && variant === 'hero'
          ? 'sticky top-0 border-b border-[rgba(7,19,48,0.08)] bg-white/95 backdrop-blur-md'
          : ''
      }`}
      data-testid="landing-nav"
    >
      <div className="beam-container flex h-20 items-center justify-between lg:h-24">
        <Link href="/" className="relative z-10">
          <BeamWordmark
            tone={light ? 'ink' : 'white'}
            markWidth={26}
            markHeight={26}
            wordClassName="text-[24px]"
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Marketing">
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

        <div className="flex items-center gap-4 sm:gap-5">
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
              <Link
                href={primaryHref}
                className={ctaClass}
                data-testid="landing-nav-primary"
              >
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
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border lg:hidden ${
              light
                ? 'border-[rgba(7,19,48,0.12)] text-[#071330]'
                : 'border-white/30 text-white'
            }`}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          className="relative z-50 mx-4 mb-3 overflow-hidden rounded-2xl border border-[rgba(7,19,48,0.12)] bg-white shadow-[0_18px_40px_-12px_rgba(12,42,102,0.28)] lg:hidden"
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
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#1D5CE5] px-5 text-[14.5px] font-semibold text-white transition hover:bg-[#1649BD]"
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
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#1D5CE5] px-5 text-[14.5px] font-semibold text-white transition hover:bg-[#1649BD]"
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
      ) : null}
    </header>
  )
}
