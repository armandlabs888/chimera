'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'

const linkClass =
  'rounded-sm text-[14px] font-medium text-[#475569] transition hover:text-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F8FD]'

function FooterGroup({
  id,
  title,
  links,
}: {
  id: string
  title: string
  links: ReadonlyArray<{ href: string; label: string }>
}) {
  return (
    <nav aria-labelledby={id}>
      <h2
        id={id}
        className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#071330]"
      >
        {title}
      </h2>
      <ul className="mt-3.5 space-y-2.5">
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

export function LandingFooter() {
  const { authUser, mode } = useBeam()
  const canOnboardHelper = Boolean(authUser) || mode === 'demo'

  const groups = useMemo(
    () => [
      {
        id: 'footer-explore',
        title: 'Explore',
        links: [
          { href: '/browse', label: 'Browse tasks' },
          { href: '/#how-it-works', label: 'How it works' },
          { href: '/#neighborhoods', label: 'Neighborhoods' },
        ],
      },
      {
        id: 'footer-start',
        title: 'Get started',
        links: [
          { href: '/post', label: 'Post a request' },
          {
            href: canOnboardHelper
              ? '/onboarding/helper'
              : '/auth?mode=signup&next=%2Fonboarding%2Fhelper',
            label: 'Become a helper',
          },
          { href: '/auth?mode=signin', label: 'Sign in' },
        ],
      },
      {
        id: 'footer-trust',
        title: 'Trust',
        links: [{ href: '/safety', label: 'Safety & guidelines' }],
      },
    ],
    [canOnboardHelper],
  )

  return (
    <footer
      className="border-t border-[rgba(7,19,48,0.08)] bg-[#F4F8FD]"
      data-testid="landing-footer"
    >
      <div className="beam-container py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
          <div className="max-w-[36ch] lg:col-span-4">
            <Link
              href="/"
              className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F8FD]"
              aria-label="Beam home"
            >
              <BeamWordmark markWidth={26} markHeight={26} wordClassName="text-[26px]" tone="ink" />
            </Link>
            <p className="mt-4 text-[14.5px] leading-[1.55] text-[#64748B]">
              Peer-to-peer everyday local help in your neighborhood.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:col-span-8 lg:pt-1">
            {groups.map((g) => (
              <FooterGroup key={g.id} id={g.id} title={g.title} links={g.links} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[rgba(7,19,48,0.08)]">
        <div className="beam-container flex flex-col gap-2 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
          <p className="shrink-0 text-[13px] leading-[1.45] text-[#475569]">© 2026 Beam</p>
          <p className="max-w-[62ch] text-[13px] leading-[1.5] text-[#475569] sm:text-right">
            Payments are arranged directly between neighbors. Not for licensed trades, childcare,
            medical/senior care, or passenger driving.
          </p>
        </div>
      </div>
    </footer>
  )
}
