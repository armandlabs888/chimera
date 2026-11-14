'use client'

import { ChevronRight, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Avatar } from '@/components/ui'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { useBeam } from '@/context/BeamContext'
import { formatLocationLabel } from '@/lib/location'
import { formatRate } from '@/lib/matching'

export type AccountQuickLink =
  | { kind: 'href'; href: string; label: string; testId?: string }
  | { kind: 'messages'; label: string; testId?: string }

export function AccountSummaryCard() {
  const { currentUser } = useBeam()
  const isHelper = Boolean(currentUser.isHelper || currentUser.skills.length > 0)
  const locationText = formatLocationLabel(currentUser)

  return (
    <div className="account-hc-card account-hc-summary-card" data-testid="account-summary-card">
      <div className="account-hc-summary-who">
        <Avatar src={currentUser.avatar} name={currentUser.name} size={52} />
        <div className="min-w-0">
          <p className="name truncate">{currentUser.name}</p>
          <p className="role">{isHelper ? 'Helper' : 'Neighbor'}</p>
        </div>
      </div>
      <p className="account-hc-summary-meta">
        {locationText}
        {isHelper ? (
          <>
            <span className="dot">·</span>
            {formatRate(currentUser)}
          </>
        ) : null}
      </p>
      {isHelper ? (
        <div className="account-hc-summary-actions">
          <Link href="/onboarding/helper" className="account-hc-btn account-hc-btn-block">
            Edit helper profile
          </Link>
          <Link
            href={`/people/${currentUser.id}`}
            className="account-hc-btn account-hc-btn-secondary account-hc-btn-block"
          >
            View public profile
          </Link>
        </div>
      ) : null}
    </div>
  )
}

export function AccountQuickLinksCard({
  links,
  title = 'Quick links',
}: {
  links: AccountQuickLink[]
  title?: string
}) {
  const { openList } = useMessagesDrawer()

  return (
    <div className="account-hc-card account-hc-links-card" data-testid="account-quick-links">
      <h2>{title}</h2>
      {links.map((link) => {
        if (link.kind === 'messages') {
          return (
            <button
              key={link.label}
              type="button"
              className="account-hc-link-row"
              data-testid={link.testId}
              onClick={() => openList()}
            >
              <span>{link.label}</span>
              <ChevronRight className="chev h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          )
        }
        return (
          <Link
            key={link.href}
            href={link.href}
            className="account-hc-link-row"
            data-testid={link.testId}
          >
            <span>{link.label}</span>
            <ChevronRight className="chev h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        )
      })}
    </div>
  )
}

export function AccountSignOutButton() {
  const { signOut, authUser, mode } = useBeam()
  if (!(authUser || mode === 'demo')) return null

  return (
    <button
      type="button"
      className="account-hc-signout-card"
      data-testid="you-sign-out"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  )
}

export function AccountDemoReset() {
  const { mode, resetDemo } = useBeam()
  if (mode !== 'demo') return null

  return (
    <button
      type="button"
      className="account-hc-demo-reset"
      data-testid="you-reset-demo"
      onClick={() => {
        if (confirm('Reset all demo data to the Austin seed?')) resetDemo()
      }}
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
      Reset demo
    </button>
  )
}

export function AccountPageSidebar({
  quickLinks,
  children,
  showSignOut = true,
  showDemoReset = true,
}: {
  quickLinks: AccountQuickLink[]
  children?: ReactNode
  showSignOut?: boolean
  showDemoReset?: boolean
}) {
  return (
    <aside className="account-hc-sidebar" data-testid="account-sidebar">
      <AccountSummaryCard />
      <AccountQuickLinksCard links={quickLinks} />
      {children}
      {showSignOut ? <AccountSignOutButton /> : null}
      {showDemoReset ? <AccountDemoReset /> : null}
    </aside>
  )
}
