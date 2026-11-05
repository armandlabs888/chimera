'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthExperience, type AuthMode } from '@/components/auth/AuthExperience'
import { useBeam } from '@/context/BeamContext'
import { sanitizeNext } from '@/lib/auth/safeNext'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { mode, authUser, ready } = useBeam()

  const rawMode = searchParams.get('mode')
  const initialMode: AuthMode = rawMode === 'signup' ? 'signup' : 'signin'
  const safeNext = sanitizeNext(searchParams.get('next'))
  const initialError = searchParams.get('error')

  useEffect(() => {
    if (!ready) return
    // Signed-in users (or demo) should not get stuck on /auth.
    if (authUser || mode === 'demo') {
      router.replace(safeNext)
    }
  }, [ready, authUser, mode, router, safeNext])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-beam-base">
        <p className="text-[22px] font-semibold tracking-tight text-beam-charcoal">Beam</p>
      </div>
    )
  }

  if (authUser || mode === 'demo') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-beam-base">
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
