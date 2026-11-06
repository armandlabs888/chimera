'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthExperience, type AuthMode } from '@/components/auth/AuthExperience'
import { useBeam } from '@/context/BeamContext'
import { sanitizeNext } from '@/lib/auth/safeNext'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { authUser, ready } = useBeam()

  const rawMode = searchParams.get('mode')
  const initialMode: AuthMode = rawMode === 'signup' ? 'signup' : 'signin'
  const safeNext = sanitizeNext(searchParams.get('next'))
  const initialError = searchParams.get('error')

  useEffect(() => {
    if (!ready) return
    // Already signed-in users should not linger on /auth.
    // Demo mode stays on /auth so the daylight auth chrome (and Continue CTA) is visible.
    if (authUser) {
      router.replace(safeNext)
    }
  }, [ready, authUser, router, safeNext])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F4F8FD]">
        <p className="text-[22px] font-semibold tracking-tight text-[#071330]">Beam</p>
      </div>
    )
  }

  if (authUser) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F4F8FD]">
        <p className="type-sec text-beam-muted">Continuing…</p>
      </div>
    )
  }

  return (
    <AuthExperience
      key={`${initialMode}:${initialError ?? ''}:${safeNext}`}
      initialMode={initialMode}
      nextPath={safeNext}
      initialError={initialError}
    />
  )
}
