'use client'

import { useMemo, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useBeam } from '@/context/BeamContext'
import { AuthExperience } from '@/components/auth/AuthExperience'
import { sanitizeNext } from '@/lib/auth/safeNext'

/**
 * Live-mode gate for app routes. Renders the shared auth experience and preserves
 * the intended destination as `next` for email + Google OAuth return.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { mode, authUser } = useBeam()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const nextPath = useMemo(() => {
    const q = searchParams?.toString()
    return sanitizeNext(q ? `${pathname}?${q}` : pathname)
  }, [pathname, searchParams])

  if (mode !== 'live' || authUser) return <>{children}</>

  return <AuthExperience initialMode="signin" nextPath={nextPath} compact />
}
