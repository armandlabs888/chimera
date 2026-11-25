'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { SiteAccountMenu } from '@/components/account/SiteAccountMenu'
import { BunkWordmark } from '@/components/BunkWordmark'
import { BrowseLocationTrigger } from '@/components/browse/BrowseLocationDialog'
import { useBeam } from '@/context/BeamContext'
import { becomeHelperHref } from '@/lib/helperAccess'
import '@/components/account/account-hc.css'

export function LandingNav({
  variant = 'light',
  browseLocationLabel,
}: {
  /**
   * Solid white chrome for marketing surfaces. `hero` / `overlay` are kept as
   * aliases of `light` so callers that still pass the old overlay API stay on
   * the solid white sticky header (landing no longer overlays the hero).
   */
  variant?: 'hero' | 'light' | 'overlay'
  /** Guest Browse: reuse topnav location control without a page eyebrow. */
  browseLocationLabel?: string
}) {
  const { authUser, mode, currentUser, ready } = useBeam()
  const [mobileOpen, setMobileOpen] = useState(false)
  // Landing and guest chrome are always solid light; ignore legacy overlay/hero.
  void variant
  // Demo has no auth session but still uses the same account chrome as live signed-in.
  const showAccountMenu = mode === 'demo' || Boolean(authUser)
  const onboardingDone = Boolean(currentUser?.onboardingCompletedAt)
  const signedIn = Boolean(authUser) || mode === 'demo'
  // Before hydrate, keep the helper editor path so neighbors are not wrong-footed
  // only after ready (Become a helper → Get verified for signed-in neighbors).
  const helperCtaHref =
    !signedIn
      ? becomeHelperHref({ signedIn: false, person: null })
      : !ready
        ? '/onboarding/helper'
        : becomeHelperHref({ signedIn: true, person: currentUser })

  const navLinks = useMemo(
    () => [
      { href: '/browse', label: 'Browse Jobs' },
      { href: '/#how-it-works', label: 'How it works' },
      {
        href: helperCtaHref,
        label: 'Become a helper',
      },
    ],
    [helperCtaHref],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const linkClass =
    'text-[14px] font-medium text-[#071330] transition-colors hover:text-[#1D5CE5]'

  const loginClass =
    'hidden min-h-11 items-center text-[13px] font-medium text-[#071330] transition hover:text-[#1D5CE5] sm:inline-flex'

  // 40px+ tap targets (responsive audit / PR #187 used 44px).
  const ctaClass =
    'inline-flex h-11 min-h-[44px] items-center justify-center rounded-full bg-[#1D5CE5] px-4 text-[13px] font-semibold text-white shadow-none transition-colors hover:bg-[#1649BD]'

  const primaryHref = onboardingDone ? '/post' : '/onboarding'
  const primaryLabel = onboardingDone ? 'Post a task' : 'Continue setup'

  const accountMenu = showAccountMenu ? (
    <Suspense fallback={null}>
      <SiteAccountMenu onDark={false} />
    </Suspense>
  ) : null

  const bar = (
    <>
      <BunkWordmark
        size="header"
        tone="brand"
        className="relative z-10 min-h-[44px] shrink-0"
      />

      {/* Desktop links from lg up so 768–1024 keeps the hamburger (PR #187). */}
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

      <div className="flex shrink-0 items-center justify-self-end gap-1.5 sm:gap-3">
        {browseLocationLabel ? (
          <BrowseLocationTrigger
            label={browseLocationLabel}
            className="inline-flex h-11 min-h-[44px] max-w-[9.5rem] items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-medium text-[#071330] transition hover:bg-[#EEF2F7] hover:text-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 sm:max-w-[14rem] sm:px-2.5"
          />
        ) : null}
        {showAccountMenu ? (
          <>
            <Link
              href={primaryHref}
              className={ctaClass}
              data-testid="landing-nav-primary"
            >
              {primaryLabel}
            </Link>
            {/* Visibility follows .hc-account-desktop (hidden ≤860px; hamburger owns account). */}
            {accountMenu}
          </>
        ) : (
          <>
            <Link href="/auth?mode=signin" className={loginClass} data-testid="landing-log-in">
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
          className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] border border-[#E3E8EF] text-[#071330] lg:hidden"
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
      className="relative z-50 mx-4 mb-3 overflow-hidden rounded-[12px] border border-[#E3E8EF] bg-white lg:hidden"
      data-testid="landing-mobile-menu"
    >
      <div className="flex flex-col py-2">
        {navLinks.map((l) =>
          l.href.startsWith('/#') ? (
            <a
              key={l.href}
              href={l.href}
              className="min-h-[44px] px-4 py-3 text-[15px] text-[#071330]"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ) : (
            <Link
              key={l.href}
              href={l.href}
              className="min-h-[44px] px-4 py-3 text-[15px] text-[#071330]"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ),
        )}
        <div className="my-1 border-t border-[#E3E8EF]" />
        {showAccountMenu ? (
          <>
            <Suspense fallback={null}>
              <SiteAccountMenu mobile onNavigate={() => setMobileOpen(false)} />
            </Suspense>
            <div className="px-4 pb-3 pt-1">
              <Link
                href={primaryHref}
                className="inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1649BD]"
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
              className="min-h-[44px] px-4 py-3 text-[15px] text-[#071330]"
              onClick={() => setMobileOpen(false)}
            >
              Log in
            </Link>
            <div className="px-4 pb-3 pt-1">
              <Link
                href="/auth?mode=signup&next=%2Fonboarding"
                className="inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1649BD]"
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

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-[#E3E8EF] bg-white"
      data-testid="landing-nav"
      data-nav-style="flat"
    >
      <div className="beam-container flex h-14 items-center justify-between lg:h-16">{bar}</div>
      {mobileMenu}
    </header>
  )
}
