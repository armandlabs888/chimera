'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactNode } from 'react'
import { BackendErrorToast } from '@/components/BackendErrorToast'
import { BottomNav } from './BottomNav'
import {
  BrowseLocationDialogHost,
} from '@/components/browse/BrowseLocationDialog'
import { BrowseFloatHeader } from '@/components/browse/BrowseFloatHeader'
import { MessagesDrawerHost } from '@/components/messages/MessagesDrawerHost'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { useBeam } from '@/context/BeamContext'
import '@/components/account/account-hc.css'

function shouldHideAppChrome(pathname: string, onboardingEdit: boolean) {
  if (pathname === '/onboarding' && onboardingEdit) return false
  return (
    pathname === '/' ||
    pathname === '/onboarding' ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onboardingEdit = pathname === '/onboarding' && searchParams.get('edit') === '1'
  const { currentUser, mode, ready, authUser } = useBeam()
  const hideChrome = shouldHideAppChrome(pathname, onboardingEdit)
  // Live guests get marketing chrome on public discovery routes.
  // Demo mode always uses the authenticated marketplace top nav.
  const isLiveGuest = mode === 'live' && !authUser
  const isHelperOnboarding = pathname.startsWith('/onboarding/helper')
  const showHelperSetupBanner =
    ready &&
    !isLiveGuest &&
    currentUser.accountRole === 'helper' &&
    !currentUser.isHelper &&
    !isHelperOnboarding

  if (hideChrome) {
    return (
      <div className="app-shell relative min-h-dvh text-[#071330]">
        {children}
        <BackendErrorToast />
      </div>
    )
  }

  return (
    <div className="app-shell relative flex min-h-dvh flex-col bg-[#F5F9FF] text-[#071330]">
      <BrowseFloatHeader guest={isLiveGuest} showHelperBanner={showHelperSetupBanner && !isLiveGuest} />
      <main className="relative flex-1">{children}</main>
      <LandingFooter dockPadding={!isLiveGuest} />
      <BrowseLocationDialogHost />
      <MessagesDrawerHost />
      <BackendErrorToast />
      {isLiveGuest ? null : <BottomNav />}
    </div>
  )
}
