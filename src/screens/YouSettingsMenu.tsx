'use client'

import {
  Bell,
  ChevronRight,
  CircleHelp,
  FileText,
  List,
  LogOut,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { Avatar } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { isHelperPerson } from '@/lib/roles'
import './you-settings-menu.css'

export function YouSettingsMenu() {
  const { currentUser, signOut, authUser, mode, helperVerification } = useBeam()
  const isHelper = isHelperPerson(currentUser)
  const canSignOut = Boolean(authUser) || mode === 'demo'
  const verificationDone = helperVerification?.status === 'approved'

  return (
    <div className="beam-container mobile-page-above-dock pb-10 pt-4 md:pt-6" data-testid="you-settings-menu">
      <h1 className="mb-3 text-[22px] font-bold tracking-[-0.02em] text-[#071330] md:sr-only">
        Profile
      </h1>
      <Link href="/you" className="ysm-profile-row touch-press" data-testid="ysm-view-profile">
        <Avatar src={currentUser.avatar} name={currentUser.name} size={72} />
        <span className="ysm-profile-grow">
          <b className="ysm-name">{currentUser.name}</b>
          <span className="ysm-link">View your profile</span>
        </span>
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#9AA4B2]" strokeWidth={2} aria-hidden />
      </Link>

      <h2 className="ysm-h2">Profile</h2>
      <div className="ysm-list">
        <Link href="/settings/profile" className="ysm-row" data-testid="ysm-edit-profile">
          <UserRound className="ysm-lead" strokeWidth={2} aria-hidden />
          <span className="ysm-grow">
            Edit profile
            <span className="ysm-meta">Photo, name, bio, city</span>
          </span>
          <ChevronRight className="ysm-chev" strokeWidth={2} aria-hidden />
        </Link>
        {isHelper ? (
          <Link
            href="/settings/profile#services"
            className="ysm-row"
            data-testid="ysm-helper-details"
          >
            <Wrench className="ysm-lead" strokeWidth={2} aria-hidden />
            <span className="ysm-grow">
              Helper details
              <span className="ysm-meta">Services, radius, rate, availability</span>
            </span>
            <ChevronRight className="ysm-chev" strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
        <Link href="/home?tab=offers" className="ysm-row" data-testid="ysm-activity">
          <List className="ysm-lead" strokeWidth={2} aria-hidden />
          <span className="ysm-grow">
            My activity
            <span className="ysm-meta">Requests, offers, saved</span>
          </span>
          <ChevronRight className="ysm-chev" strokeWidth={2} aria-hidden />
        </Link>
        <Link href="/verify" className="ysm-row" data-testid="ysm-get-verified">
          <ShieldCheck className="ysm-lead" strokeWidth={2} aria-hidden />
          <span className="ysm-grow">
            Get verified
            <span className="ysm-meta">
              {verificationDone ? 'Verified nearby' : 'Phone and home check'}
            </span>
          </span>
          {verificationDone ? (
            <span className="ysm-ok" data-testid="ysm-verification-done">
              Done
            </span>
          ) : (
            <ChevronRight className="ysm-chev" strokeWidth={2} aria-hidden />
          )}
        </Link>
        <Link href="/help" className="ysm-row" data-testid="ysm-help">
          <CircleHelp className="ysm-lead" strokeWidth={2} aria-hidden />
          <span className="ysm-grow">
            Help
            <span className="ysm-meta">Contact and FAQs</span>
          </span>
          <ChevronRight className="ysm-chev" strokeWidth={2} aria-hidden />
        </Link>
      </div>

      <h2 className="ysm-h2 ysm-h2-gap">Settings</h2>
      <div className="ysm-list">
        {isHelper ? (
          <Link
            href="/settings/account#notifications"
            className="ysm-row"
            data-testid="ysm-notifications"
          >
            <Bell className="ysm-lead" strokeWidth={2} aria-hidden />
            <span className="ysm-grow">
              Notifications
              <span className="ysm-meta">Urgent job texts</span>
            </span>
            <ChevronRight className="ysm-chev" strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
        <Link href="/settings/account" className="ysm-row" data-testid="ysm-account">
          <FileText className="ysm-lead" strokeWidth={2} aria-hidden />
          <span className="ysm-grow">
            Account
            <span className="ysm-meta">Legal and account options</span>
          </span>
          <ChevronRight className="ysm-chev" strokeWidth={2} aria-hidden />
        </Link>
      </div>

      {canSignOut ? (
        <div className="ysm-list ysm-list-gap">
          <button
            type="button"
            className="ysm-row ysm-red"
            data-testid="ysm-sign-out"
            onClick={() => void signOut()}
          >
            <LogOut className="ysm-lead" strokeWidth={2} aria-hidden />
            <span className="ysm-grow">Sign out</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
