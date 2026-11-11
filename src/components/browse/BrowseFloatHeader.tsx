'use client'

import { ArrowRight, ChevronDown, LogOut, Menu, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { BrowseLocationTrigger } from '@/components/browse/BrowseLocationDialog'
import { MessagesTrigger } from '@/components/messages/MessagesTrigger'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { Avatar } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { useBrowseLocation } from '@/hooks/useBrowseLocation'
import '@/components/landing/landing-v2.css'

const NAV = [
  { href: '/browse', label: 'Browse' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/post', label: 'Post a task' },
]

export function BrowseFloatHeader({
  guest,
  showHelperBanner,
}: {
  guest: boolean
  showHelperBanner: boolean
}) {
  const { currentUser, ready, authUser, signOut } = useBeam()
  const { toggle } = useMessagesDrawer()
  const { origin } = useBrowseLocation(currentUser)
  const locationText = ready ? origin.locationLabel : '…'
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accountOpen && !mobileOpen) return
    function onDoc(e: MouseEvent) {
      if (accountOpen && accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAccountOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountOpen, mobileOpen])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-white from-70% to-transparent ${
          showHelperBanner ? 'h-36' : 'h-[92px]'
        }`}
      />
      {showHelperBanner ? (
        <div
          className="pointer-events-auto relative min-h-9 bg-[#071330] py-1.5 text-white"
          data-testid="helper-setup-callout"
          role="region"
          aria-label="Finish your helper profile"
        >
          <div className="beam-container flex flex-col items-center justify-center gap-1.5 text-center sm:flex-row sm:flex-wrap sm:gap-3">
            <p className="min-w-0 max-w-[42rem] text-[12.5px] font-medium leading-[1.35] sm:max-w-none">
              Finish your helper profile to appear in Local Helpers.
            </p>
            <Link
              href="/onboarding/helper"
              data-testid="helper-setup-banner-cta"
              className="inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-md bg-white px-2.5 text-[12px] font-semibold text-[#071330] transition hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              Add skills &amp; rate
              <ArrowRight className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}

      <header
        className="pointer-events-none relative"
        data-testid={guest ? 'landing-nav' : 'app-topnav'}
        data-nav-style="float"
      >
        <div className="beam-container pt-4 md:pt-5">
          <div
            className="landing-float-nav pointer-events-auto mx-auto flex h-14 max-w-[1120px] items-center justify-between rounded-[16px] border border-white/70 px-3 shadow-[0_8px_28px_rgba(7,19,48,0.10),0_1px_2px_rgba(7,19,48,0.04)] md:px-4"
            data-testid="browse-float-header"
          >
            <Link href="/browse" className="shrink-0 pl-1 focus-visible:outline-none">
              <BeamWordmark
                markWidth={18}
                markHeight={18}
                wordClassName="text-[20px] font-bold tracking-[-0.03em] text-[#1D5CE5]"
                tone="ink"
              />
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
              {NAV.map((item) => {
                const active = item.href === '/browse'
                const className = `rounded-lg px-3 py-2 text-[14px] font-medium ${
                  active ? 'bg-[#F4F8FD] text-[#1D5CE5]' : 'text-[#071330] hover:bg-[#F4F8FD]'
                }`
                if (item.href === '/post') {
                  return (
                    <Link key={item.href} href={item.href} className={className} data-testid="topnav-post-cta">
                      {item.label}
                    </Link>
                  )
                }
                return (
                  <Link key={item.href} href={item.href} className={className} aria-current={active ? 'page' : undefined}>
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <BrowseLocationTrigger
                label={locationText}
                chevron
                pinClassName="text-[#1D5CE5]"
                className="inline-flex h-9 max-w-[8.5rem] items-center gap-1.5 rounded-[10px] border border-[#E3E8EF] bg-white px-2 text-[13px] font-medium text-[#071330] transition hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 sm:max-w-[14rem] sm:px-2.5 sm:text-[13.5px]"
              />
              <MessagesTrigger appearance="icon" hideFrom="sm" />
              <MessagesTrigger appearance="float" />

              {guest ? (
                <>
                  <Link
                    href="/auth?mode=signin"
                    className="hidden px-2 text-[13px] font-medium text-[#071330] hover:text-[#1D5CE5] sm:inline"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth?mode=signup&next=%2Fbrowse"
                    className="hidden h-9 items-center rounded-[10px] bg-[#071330] px-3.5 text-[13px] font-semibold text-white hover:bg-[#1D5CE5] sm:inline-flex"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <div className="relative" ref={accountRef}>
                  <button
                    type="button"
                    data-testid="account-menu-trigger"
                    aria-label="Account menu"
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    onClick={() => setAccountOpen((o) => !o)}
                    className="inline-flex h-9 items-center gap-2 rounded-[10px] px-1.5 hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
                  >
                    {ready ? (
                      <Avatar src={currentUser.avatar} name={currentUser.name} size={28} />
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#071330] text-white">
                        <UserRound className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <ChevronDown className="hidden h-3.5 w-3.5 text-[#3D4A5F] sm:block" aria-hidden />
                  </button>
                  {accountOpen ? (
                    <div
                      className="pointer-events-auto absolute right-0 top-11 z-50 w-[min(280px,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_12px_32px_-8px_rgba(7,19,48,0.12)]"
                      role="menu"
                      aria-label="Account"
                      data-testid="account-menu"
                    >
                      <div className="border-b border-[#F1F5F9] px-4 py-3.5">
                        <p className="truncate text-[14px] font-bold text-[#071330]">
                          {ready ? currentUser.name : '…'}
                        </p>
                        <p className="mt-0.5 truncate text-[12.5px] font-medium text-[#334155]">
                          {locationText}
                        </p>
                      </div>
                      <ul className="py-1.5">
                        <MenuLink href="/you" onNavigate={() => setAccountOpen(false)}>
                          Profile &amp; account
                        </MenuLink>
                        <MenuLink href="/home" onNavigate={() => setAccountOpen(false)}>
                          My activity
                        </MenuLink>
                        <MenuLink href="/onboarding/helper" onNavigate={() => setAccountOpen(false)}>
                          Helper profile
                        </MenuLink>
                        <MenuLink href="/onboarding?edit=1" onNavigate={() => setAccountOpen(false)}>
                          Change city
                        </MenuLink>
                      </ul>
                      {authUser ? (
                        <div className="border-t border-[#F1F5F9] py-1.5">
                          <button
                            type="button"
                            role="menuitem"
                            data-testid="account-sign-out"
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
                            onClick={() => {
                              setAccountOpen(false)
                              void signOut()
                            }}
                          >
                            <LogOut className="h-4 w-4" strokeWidth={1.85} />
                            Sign out
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#E3E8EF] bg-white text-[#071330] md:hidden"
                aria-label={mobileOpen ? 'Close menu' : 'Menu'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {mobileOpen ? (
            <div className="pointer-events-auto mx-auto mt-2 max-w-[1120px] overflow-hidden rounded-xl border border-[rgba(7,19,48,0.12)] bg-white shadow-[0_18px_40px_-12px_rgba(12,42,102,0.28)] md:hidden">
              <div className="flex flex-col py-2">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-3 text-[15px] text-[#071330]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                {guest ? (
                  <Link
                    href="/auth?next=%2Fmessages"
                    className="px-4 py-3 text-[15px] text-[#071330]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Messages
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="px-4 py-3 text-left text-[15px] text-[#071330]"
                    onClick={() => {
                      setMobileOpen(false)
                      toggle()
                    }}
                  >
                    Messages
                  </button>
                )}
                {guest ? (
                  <>
                    <Link href="/auth?mode=signin" className="px-4 py-3 text-[15px] text-[#071330]" onClick={() => setMobileOpen(false)}>
                      Log in
                    </Link>
                    <div className="px-4 pb-3 pt-1">
                      <Link
                        href="/auth?mode=signup&next=%2Fbrowse"
                        className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] text-[14px] font-semibold text-white"
                        onClick={() => setMobileOpen(false)}
                      >
                        Sign up
                      </Link>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </header>
    </div>
  )
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string
  onNavigate: () => void
  children: ReactNode
}) {
  return (
    <li>
      <Link
        href={href}
        role="menuitem"
        onClick={onNavigate}
        className="block px-4 py-2.5 text-[13.5px] font-semibold text-[#071330] hover:bg-[#F8FAFC]"
      >
        {children}
      </Link>
    </li>
  )
}
