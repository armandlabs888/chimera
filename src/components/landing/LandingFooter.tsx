'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'
import { BROWSE_PARENTS } from '@/lib/taxonomy'
import { hidesPeerHelperDiscovery } from '@/lib/roles'

const linkClass =
  'rounded-sm text-[14px] font-medium leading-snug text-[#CBD5E1] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071330]'

function FooterGroup({
  id,
  title,
  links,
}: {
  id: string
  title: string
  links: ReadonlyArray<{ href: string; label: string }>
}) {
  if (links.length === 0) return null
  return (
    <nav aria-labelledby={id} className="min-w-0">
      <h2
        id={id}
        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
      >
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={`${l.href}-${l.label}`}>
            <Link href={l.href} className={linkClass}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Shared grouped site footer — Paper navy (#071330), compact spacing.
 * Functional groups preserved for marketing + AppShell/auth.
 */
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
      { href: '/#neighborhoods', label: 'Available services' },
    ]

    const start = signedIn
      ? [
          { href: '/post', label: 'Post a request' },
          {
            href: '/onboarding/helper',
            label:
              currentUser.accountRole === 'helper' || currentUser.isHelper
                ? 'Helper profile'
                : 'Find work',
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
            label: 'Find work',
          },
          { href: '/auth?mode=signup', label: 'Create account' },
          { href: '/auth?mode=signin', label: 'Sign in' },
        ]

    return [
      { id: 'footer-explore', title: 'Explore', links: explore },
      {
        id: 'footer-services',
        title: 'Services',
        links: BROWSE_PARENTS.map((p) => ({
          href: `/browse?category=${p.id}`,
          label: p.shortLabel,
        })),
      },
      { id: 'footer-start', title: 'Get started', links: start },
      {
        id: 'footer-trust',
        title: 'Trust',
        links: [{ href: '/safety', label: 'Safety & guidelines' }],
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
      className={`shrink-0 border-t border-white/10 bg-[#071330] ${
        dockPadding ? 'pb-24 md:pb-0' : ''
      }`}
      data-testid="landing-footer"
      data-app-footer="true"
      id="site-footer"
    >
      <div className="beam-container py-7 sm:py-8">
        <div className="grid gap-7 lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="flex max-w-[32ch] flex-col lg:col-span-4">
            <Link
              href="/"
              className="inline-flex w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071330]"
              aria-label="Beam home"
            >
              <BeamWordmark
                markWidth={24}
                markHeight={24}
                wordClassName="text-[22px] tracking-[-0.03em]"
                tone="onDark"
              />
            </Link>
            <p className="mt-2.5 text-[13.5px] leading-[1.45] text-[#CBD5E1]">
              Peer-to-peer everyday local help — home, auto, junk removal, pets, and other casual
              tasks.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 lg:col-span-8">
            {groups.map((g) => (
              <FooterGroup key={g.id} id={g.id} title={g.title} links={g.links} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10" data-testid="footer-legal">
        <div className="beam-container flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="shrink-0 text-[12.5px] leading-[1.35] text-[#94A3B8]">© Beam</p>
          <p className="max-w-[68ch] text-[12px] leading-[1.45] text-[#94A3B8] sm:text-right">
            Payments are arranged directly between neighbors. Not for licensed trades, childcare,
            medical/senior care, or passenger driving.
          </p>
        </div>
      </div>
    </footer>
  )
}
