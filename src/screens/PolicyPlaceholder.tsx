'use client'

import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useBeam } from '@/context/BeamContext'
import '@/components/account/account-hc.css'

export function PolicyPlaceholder({
  title,
  testId,
}: {
  title: 'Terms of Service' | 'Privacy Policy'
  testId: string
}) {
  const { authUser, mode } = useBeam()
  const signedIn = mode === 'demo' || Boolean(authUser)
  const backHref = signedIn ? '/settings' : '/'
  const backLabel = signedIn ? 'Back to Settings' : 'Back to HouseCall'

  return (
    <div className="account-hc" data-testid={testId}>
      <div className="account-hc-wrap account-hc-page account-hc-profile-page account-hc-policy-page">
        <Link href={backHref} className="account-hc-page-back" data-testid={`${testId}-back`}>
          <ChevronLeft className="chev h-4 w-4" strokeWidth={2.25} aria-hidden />
          {backLabel}
        </Link>
        <h1 className="account-hc-hero-title">{title}</h1>
        <div className="account-hc-card account-hc-policy-card">
          <p>
            Our full {title === 'Terms of Service' ? 'terms' : 'privacy policy'} are being finalized
            and will be posted here.
          </p>
        </div>
      </div>
    </div>
  )
}
