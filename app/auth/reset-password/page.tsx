'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ResetPasswordExperience } from '@/components/auth/ResetPasswordExperience'
import { LandingPage } from '@/components/landing/LandingPage'

export default function ResetPasswordPage() {
  const router = useRouter()

  const closeToLanding = useCallback(() => {
    router.push('/')
  }, [router])

  return (
    <>
      <div inert aria-hidden="true">
        <LandingPage />
      </div>
      <ResetPasswordExperience onClose={closeToLanding} />
    </>
  )
}
