'use client'

import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useBeam } from '@/context/BeamContext'
import '@/components/account/account-hc.css'
import '@/components/legal/legal-doc.css'

/**
 * Legal policy page shell. Keeps signed-in / guest back-link behavior used by
 * nav QA. Document body is passed from the server page (markdown at build time).
 */
export function PolicyPlaceholder({
  title,
  testId,
  children,
}: {
  title: 'Terms of Service' | 'Privacy Policy'
  testId: string
  children: ReactNode
}) {
  const { authUser, mode } = useBeam()
  const signedIn = mode === 'demo' || Boolean(authUser)
  const backHref = signedIn ? '/settings' : '/'
  const backLabel = signedIn ? 'Back to Settings' : 'Back to HouseCall'

  return (
    <div className="account-hc" data-testid={testId} data-policy={title}>
      <div className="account-hc-wrap account-hc-page account-hc-profile-page account-hc-policy-page">
        <Link href={backHref} className="account-hc-page-back" data-testid={`${testId}-back`}>
          <ChevronLeft className="chev h-4 w-4" strokeWidth={2.25} aria-hidden />
          {backLabel}
        </Link>
        {children}
      </div>
    </div>
  )
}
