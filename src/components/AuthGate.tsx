'use client'

import Link from 'next/link'
import { useEffect, useMemo, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'
import { AuthExperience } from '@/components/auth/AuthExperience'
import { sanitizeNext } from '@/lib/auth/safeNext'

/** Routes that stay readable while logged out. */
const PUBLIC_APP_PREFIXES = ['/browse', '/safety', '/people/', '/requests/']

/** Routes an incomplete onboarder may visit in live mode (exact /onboarding + safety). */
function isOnboardingAllowedPath(pathname: string) {
  return pathname === '/onboarding' || pathname === '/safety'
}

function isPublicAppPath(pathname: string) {
  // Exact /onboarding is public for ?preview=1 QA and guest redirect-to-signup UX.
  // /onboarding/helper stays gated for live guests.
  if (pathname === '/onboarding') return true
  return PUBLIC_APP_PREFIXES.some(
    (p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p),
  )
}

/**
 * Live-mode gate. Public discovery routes pass through; write routes prompt
 * for sign-in. Authenticated users missing onboarding are forced to /onboarding.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { mode, authUser, currentUser, ready } = useBeam()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const preview = searchParams.get('preview') === '1'

  const nextPath = useMemo(() => {
    const q = searchParams?.toString()
    return sanitizeNext(q ? `${pathname}?${q}` : pathname)
  }, [pathname, searchParams])

  const needsOnboarding =
    mode === 'live' && Boolean(authUser) && !currentUser.onboardingCompletedAt && !preview

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

  if (mode !== 'live' || authUser) {
    if (needsOnboarding && !isOnboardingAllowedPath(pathname)) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-[#F4F8FD]">
          <p className="text-[22px] font-semibold tracking-tight text-[#071330]" aria-busy="true">
            Beam
          </p>
        </div>
      )
    }
    return <>{children}</>
  }

  // Guests: /onboarding is public so ?preview=1 QA can walk the flow; the
  // screen itself redirects live guests without preview to sign-up.
  if (isPublicAppPath(pathname)) return <>{children}</>

  return (
    <div className="min-h-dvh bg-[#F4F8FD]">
      <header className="border-b border-[rgba(7,19,48,0.08)] bg-white">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6">
          <Link href="/">
            <BeamWordmark markWidth={24} markHeight={24} wordClassName="text-[22px]" tone="ink" />
          </Link>
          <nav className="flex items-center gap-6 text-[14.5px] font-medium text-[#64748B]">
            <Link href="/browse" className="hover:text-[#071330]">
              Browse
            </Link>
            <Link href="/safety" className="hover:text-[#071330]">
              Safety
            </Link>
          </nav>
        </div>
      </header>
      <AuthExperience initialMode="signin" nextPath={nextPath} compact />
    </div>
  )
}
