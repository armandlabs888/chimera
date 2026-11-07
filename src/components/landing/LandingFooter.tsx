'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES } from '@/data/categories'
import { hidesPeerHelperDiscovery } from '@/lib/roles'

const linkClass =
  'rounded-sm text-[15px] font-medium leading-snug text-[#475569] transition hover:text-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F8FD]'

function FooterGroup({
  id,
  title,
  links,
  note,
}: {
  id: string
  title: string
  links: ReadonlyArray<{ href: string; label: string }>
  note?: string
}) {
  if (links.length === 0 && !note) return null
  return (
    <nav aria-labelledby={id} className="min-w-0">
      <h2
        id={id}
        className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#071330]"
      >
        {title}
      </h2>
      {links.length > 0 ? (
        <ul className="mt-5 space-y-3.5">
          {links.map((l) => (
            <li key={`${l.href}-${l.label}`}>
              <Link href={l.href} className={linkClass}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {note ? (
        <p className="mt-5 max-w-[28ch] text-[13.5px] leading-[1.55] text-[#64748B]">{note}</p>
      ) : null}
    </nav>
  )
}

/** Shared tall marketing footer — used on landing and across AppShell/auth. */
export function LandingFooter({
  dockPadding = false,
}: {
  /** Extra bottom padding when the mobile BottomNav dock is present. */
  dockPadding?: boolean
}) {
  const { authUser, mode, currentUser } = useBeam()
  const isGuest = mode === 'live' && !authUser
  const signedIn = !isGuest
  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)
  const canOnboardHelper = Boolean(authUser) || mode === 'demo'

  const groups = useMemo(() => {
    const explore = [
      { href: '/browse', label: 'Browse tasks' },
      ...(!hidePeerDiscovery
        ? [{ href: '/browse?tab=people', label: 'Meet helpers' as const }]
        : []),
      { href: '/#categories', label: 'Popular services' },
      { href: '/#how-it-works', label: 'How it works' },
      { href: '/#neighborhoods', label: 'Neighborhoods' },
    ]

    const start = signedIn
      ? [
          { href: '/post', label: 'Post a request' },
          {
            href: '/onboarding/helper',
            label:
              currentUser.accountRole === 'helper' || currentUser.isHelper
                ? 'Helper profile'
                : 'Become a helper',
          },
          { href: '/you', label: 'Profile & account' },
          { href: '/home', label: 'My activity' },
        ]
      : [
          { href: '/post', label: 'Post a request' },
          {
            href: canOnboardHelper
              ? '/onboarding/helper'
              : '/auth?mode=signup&next=%2Fonboarding%2Fhelper',
            label: 'Become a helper',
          },
          { href: '/auth?mode=signup', label: 'Create account' },
          { href: '/auth?mode=signin', label: 'Sign in' },
        ]

    return [
      { id: 'footer-explore', title: 'Explore', links: explore },
      {
        id: 'footer-services',
        title: 'Services',
        links: CATEGORIES.map((c) => ({
          href: `/browse?category=${c.id}`,
          label: c.shortLabel,
        })),
      },
      { id: 'footer-start', title: 'Get started', links: start },
      {
        id: 'footer-trust',
        title: 'Trust',
        links: [{ href: '/safety', label: 'Safety & guidelines' }],
        note: 'Clear community rules, two-way reviews, and in-thread coordination — Beam never holds your money.',
      },
    ]
  }, [
    canOnboardHelper,
    currentUser.accountRole,
    currentUser.isHelper,
    hidePeerDiscovery,
    signedIn,
  ])

  return (
    <footer
      className={`border-t border-[rgba(7,19,48,0.08)] bg-[#F4F8FD] ${
        dockPadding ? 'pb-24 md:pb-0' : ''
      }`}
      data-testid="landing-footer"
      // Back-compat for marketplace QA that still looks for app-footer landmark.
      data-app-footer="true"
      id="site-footer"
    >
      <div className="beam-container pb-16 pt-20 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:items-start lg:gap-16">
          <div className="flex max-w-[40ch] flex-col lg:col-span-4">
            <Link
              href="/"
              className="inline-flex w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F8FD]"
              aria-label="Beam home"
            >
              <BeamWordmark
                markWidth={34}
                markHeight={34}
                wordClassName="text-[32px] tracking-[-0.03em]"
                tone="ink"
              />
            </Link>
            <p className="mt-6 text-[16px] leading-[1.6] text-[#475569]">
              Peer-to-peer everyday local help in your neighborhood — moving, cleaning, assembly,
              pet care, tutoring, and events.
            </p>
            <p className="mt-4 text-[15px] leading-[1.55] text-[#64748B]">
              Beam coordinates same-day neighbor help. You agree on price in the offer and pay
              helpers directly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white transition hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F8FD]"
              >
                Browse tasks
              </Link>
              <Link
                href="/post"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[rgba(7,19,48,0.14)] bg-white px-5 text-[14px] font-semibold text-[#071330] transition hover:border-[#1D5CE5]/35 hover:text-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F8FD]"
              >
                Post a request
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4 lg:col-span-8 lg:gap-x-10 lg:pt-1">
            {groups.map((g) => (
              <FooterGroup
                key={g.id}
                id={g.id}
                title={g.title}
                links={g.links}
                note={'note' in g ? g.note : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[rgba(7,19,48,0.08)] bg-white/60">
        <div className="beam-container flex flex-col gap-3 py-8 sm:flex-row sm:items-baseline sm:justify-between sm:gap-10 sm:py-9">
          <p className="shrink-0 text-[14px] leading-[1.5] text-[#475569]">© 2026 Beam</p>
          <p className="max-w-[68ch] text-[14px] leading-[1.55] text-[#475569] sm:text-right">
            Payments are arranged directly between neighbors. Not for licensed trades, childcare,
            medical/senior care, or passenger driving.
          </p>
        </div>
      </div>
    </footer>
  )
}
