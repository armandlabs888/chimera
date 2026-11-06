'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useBeam } from '@/context/BeamContext'
import { guestAuthRedirectPath, isPublicAppPath } from '@/lib/auth/appRoutes'
import {
  browsePathWithoutHelperDiscovery,
  hidesPeerHelperDiscovery,
} from '@/lib/roles'

/** Routes an incomplete onboarder may visit in live mode (exact /onboarding + safety). */
function isOnboardingAllowedPath(pathname: string) {
  return pathname === '/onboarding' || pathname === '/safety'
}

function BootSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F4F8FD]">
      <p className="text-[22px] font-semibold tracking-tight text-[#071330]" aria-busy="true">
        Beam
      </p>
    </div>
  )
}

/**
 * Live-mode gate. Public discovery routes pass through; write / account routes
 * redirect to the canonical `/auth` page (never an inline compact auth UI).
 * Authenticated users missing onboarding are forced to /onboarding.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { mode, authUser, currentUser, ready } = useBeam()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const preview = searchParams.get('preview') === '1'
  // Demo uses seed chrome; only live signed-out visitors are guests.
  const isGuest = mode === 'live' && !authUser
  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)

  const needsOnboarding =
    mode === 'live' && Boolean(authUser) && !currentUser.onboardingCompletedAt && !preview

  const search = searchParams?.toString() ?? ''
  const guestAuthHref =
    mode === 'live' && !authUser ? guestAuthRedirectPath(pathname, search) : null

  const helperDiscoveryRedirect =
    ready &&
    hidePeerDiscovery &&
    pathname === '/browse' &&
    (searchParams.get('tab') === 'people' ||
      searchParams.get('free') === '1' ||
      searchParams.has('avail'))
      ? browsePathWithoutHelperDiscovery(search)
      : null

  useEffect(() => {
    if (!ready || !needsOnboarding) return
    if (isOnboardingAllowedPath(pathname)) return
    router.replace('/onboarding')
  }, [ready, needsOnboarding, pathname, router])

  // Already-onboarded users leaving /onboarding (without preview) → browse.
  useEffect(() => {
    if (!ready) return
    if (mode !== 'live' || !authUser) return
    if (pathname !== '/onboarding') return
    if (preview) return
    if (!currentUser.onboardingCompletedAt) return
    router.replace('/browse')
  }, [ready, mode, authUser, pathname, preview, currentUser.onboardingCompletedAt, router])

  // Live guests on protected routes → canonical /auth (preserve ?next=).
  useEffect(() => {
    if (!ready || !guestAuthHref) return
    router.replace(guestAuthHref)
  }, [ready, guestAuthHref, router])

  // Helpers must not land on peer-helper discovery deep links.
  useEffect(() => {
    if (!helperDiscoveryRedirect) return
    router.replace(helperDiscoveryRedirect)
  }, [helperDiscoveryRedirect, router])

  if (!ready) return <BootSplash />

  if (mode !== 'live' || authUser) {
    if (needsOnboarding && !isOnboardingAllowedPath(pathname)) {
      return <BootSplash />
    }
    return <>{children}</>
  }

  // Guests: /onboarding is public so ?preview=1 QA can walk the flow; the
  // screen itself redirects live guests without preview to sign-up.
  if (isPublicAppPath(pathname) && !guestAuthHref) return <>{children}</>

  // Redirecting to /auth — never render secondary compact auth UI.
  return <BootSplash />
}
