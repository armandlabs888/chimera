'use client'

import { ChevronDown, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import {
  AccountMenuPanel,
  AccountMenuTrigger,
  MobileAccountLinks,
} from '@/components/account/AccountMenuLinks'
import { Avatar } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { useBrowseLocation } from '@/hooks/useBrowseLocation'
import '@/components/account/account-hc.css'

/**
 * Shared signed-in account chrome (avatar + desktop dropdown + mobile links).
 * Used by BrowseFloatHeader and LandingNav so every signed-in surface matches.
 */
export function SiteAccountMenu({
  onDark = false,
  mobile = false,
  onNavigate,
}: {
  /** Rare dark chrome: light chevron (legacy; landing now uses solid white). */
  onDark?: boolean
  /** Render mobile sheet links instead of the desktop trigger/menu. */
  mobile?: boolean
  onNavigate?: () => void
}) {
  const { currentUser, ready, authUser, signOut, mode } = useBeam()
  const { origin } = useBrowseLocation(currentUser)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  const displayName = ready ? currentUser.name : '…'
  const locationText = ready ? origin.locationLabel : '…'
  const canSignOut = Boolean(authUser) || mode === 'demo'

  useEffect(() => {
    if (!accountOpen) return
    function onDoc(e: MouseEvent | globalThis.MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountOpen])

  if (mobile) {
    return (
      <MobileAccountLinks
        name={displayName}
        locationText={locationText}
        onNavigate={() => {
          setAccountOpen(false)
          onNavigate?.()
        }}
        canSignOut={canSignOut}
        onSignOut={() => {
          onNavigate?.()
          void signOut()
        }}
      />
    )
  }

  return (
    <div
      className={`hc-account-desktop relative ${onDark ? 'hc-account-desktop-on-dark' : ''}`}
      ref={accountRef}
    >
      <AccountMenuTrigger open={accountOpen} onToggle={() => setAccountOpen((o) => !o)}>
        {ready ? (
          <Avatar src={currentUser.avatar} name={currentUser.name} size={24} />
        ) : (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#071330] text-white">
            <UserRound className="h-3 w-3" />
          </span>
        )}
        <ChevronDown className="chev h-3 w-3" aria-hidden />
      </AccountMenuTrigger>
      {accountOpen ? (
        <AccountMenuPanel
          name={displayName}
          locationText={locationText}
          open={accountOpen}
          onNavigate={() => {
            setAccountOpen(false)
            onNavigate?.()
          }}
          canSignOut={canSignOut}
          onSignOut={() => {
            setAccountOpen(false)
            void signOut()
          }}
        />
      ) : null}
    </div>
  )
}
