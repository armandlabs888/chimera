'use client'

import {
  Bell,
  ChevronLeft,
  FileText,
  LogOut,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useBeam } from '@/context/BeamContext'
import { isHelperPerson } from '@/lib/roles'
import './settings-nav.css'

export type SettingsNavItemId =
  | 'edit-profile'
  | 'helper-details'
  | 'notifications'
  | 'verification'
  | 'legal'

export function SettingsNav({
  active,
  showBackToProfile = false,
}: {
  active: SettingsNavItemId
  showBackToProfile?: boolean
}) {
  const { signOut, authUser, mode, currentUser } = useBeam()
  const canSignOut = Boolean(authUser) || mode === 'demo'
  const isHelper = isHelperPerson(currentUser)

  return (
    <nav className="settings-side" aria-label="Settings" data-testid="settings-side-nav">
      {showBackToProfile ? (
        <Link href="/you" className="settings-back" data-testid="settings-back-profile">
          <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Back to your profile
        </Link>
      ) : null}
      <div className="settings-grp">PROFILE</div>
      <Link
        href="/settings/profile"
        className={active === 'edit-profile' ? 'is-on' : undefined}
        data-testid="settings-nav-edit-profile"
      >
        <UserRound className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        Edit profile
      </Link>
      <Link
        href={isHelper ? '/settings/profile#services' : '/onboarding/helper'}
        className={active === 'helper-details' ? 'is-on' : undefined}
        data-testid="settings-nav-helper-details"
      >
        <Wrench className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        Helper details
      </Link>
      <div className="settings-grp">ACCOUNT</div>
      <Link
        href="/settings/account#notifications"
        className={active === 'notifications' ? 'is-on' : undefined}
        data-testid="settings-nav-notifications"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        Notifications
      </Link>
      <Link
        href="/settings/account#verification"
        className={active === 'verification' ? 'is-on' : undefined}
        data-testid="settings-nav-verification"
      >
        <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        Verification
      </Link>
      <Link
        href="/settings/account#legal"
        className={active === 'legal' ? 'is-on' : undefined}
        data-testid="settings-nav-legal"
      >
        <FileText className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        Legal
      </Link>
      {canSignOut ? (
        <>
          <div className="settings-grp" />
          <button
            type="button"
            className="settings-signout"
            data-testid="settings-nav-sign-out"
            onClick={() => void signOut()}
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            Sign out
          </button>
        </>
      ) : null}
    </nav>
  )
}

export function SettingsPageChrome({
  title,
  subtitle,
  active,
  children,
  previewHref,
  mobileBackHref = '/settings',
  mobileBackLabel = 'Settings',
}: {
  title: string
  subtitle?: ReactNode
  active: SettingsNavItemId
  children: ReactNode
  previewHref?: string
  mobileBackHref?: string
  mobileBackLabel?: string
}) {
  const pathname = usePathname()
  const showBackToProfile = pathname.startsWith('/settings/profile')

  return (
    <div className="beam-container pb-10 pt-6 sm:pt-8" data-testid="settings-chrome">
      <Link
        href={mobileBackHref}
        className="settings-mobile-back"
        data-testid="settings-mobile-back"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        {mobileBackLabel}
      </Link>
      {showBackToProfile ? (
        <Link
          href="/you"
          className="settings-back settings-desk-back"
          data-testid="settings-desk-back-profile"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Back to your profile
        </Link>
      ) : null}
      <h1 className="settings-h1">{title}</h1>
      {previewHref ? (
        <p className="settings-sub">
          Everything on this page shows on your public profile.{' '}
          <Link href={previewHref} className="settings-link">
            Preview
          </Link>
        </p>
      ) : subtitle ? (
        <p className="settings-sub">{subtitle}</p>
      ) : null}
      <div className="settings-layout">
        <div className="settings-side-wrap">
          <SettingsNav active={active} />
        </div>
        <div className="settings-content">{children}</div>
      </div>
    </div>
  )
}
