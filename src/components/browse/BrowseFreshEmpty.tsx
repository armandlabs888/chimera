'use client'

import Link from 'next/link'
import { BrowseRadar } from '@/components/browse/BrowseRadar'
import { ButtonLink } from '@/components/ui'

export function BrowseFreshEmpty({
  hidePeerDiscovery,
  cityLabel,
  onEnableAlerts,
  alertsEnabled,
}: {
  hidePeerDiscovery: boolean
  cityLabel: string
  onEnableAlerts: () => void
  alertsEnabled: boolean
}) {
  const area = cityLabel || 'your area'

  return (
    <div
      className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(7,19,48,0.04)]"
      data-testid="browse-fresh-empty"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="flex flex-col justify-center px-5 py-6 sm:px-7 sm:py-8 lg:px-9">
          <span className="inline-flex w-fit items-center rounded-md border border-[#E8D9A8] bg-[#FFF8D6] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#071330]">
            Fresh marketplace
          </span>

          <h2 className="mt-3.5 max-w-[18ch] text-balance font-display text-[clamp(1.55rem,2.4vw,2rem)] font-bold leading-[1.12] tracking-[-0.025em] text-[#071330]">
            {hidePeerDiscovery ? (
              <>
                No open jobs nearby{' '}
                <span className="text-[#1D5CE5]">yet</span>
              </>
            ) : (
              'Be the first on Beam'
            )}
          </h2>

          <p className="mt-3 max-w-[42ch] text-[14.5px] leading-[1.55] text-[#64748B]">
            {hidePeerDiscovery
              ? `Open requests in ${area} will show up here. Turn on in-app alerts, widen your search, or post a task if you need help yourself.`
              : 'No open requests yet — post a task for neighbors nearby, or set up your helper profile and start earning.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {hidePeerDiscovery ? (
              <>
                <button
                  type="button"
                  onClick={onEnableAlerts}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#1D5CE5] px-4 text-[13.5px] font-semibold text-white transition hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 focus-visible:ring-offset-2"
                  data-testid="browse-empty-alerts-cta"
                >
                  {alertsEnabled ? 'Alerts on' : 'Get job alerts'}
                </button>
                <Link
                  href="/post"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#1D5CE5]/35 bg-white px-4 text-[13.5px] font-semibold text-[#1D5CE5] transition hover:bg-[#F8FBFF]"
                >
                  + Post a task
                </Link>
              </>
            ) : (
              <>
                <ButtonLink href="/post" variant="brand">
                  Post the first request
                </ButtonLink>
                <ButtonLink href="/onboarding/helper" variant="secondary">
                  Become a helper
                </ButtonLink>
              </>
            )}
          </div>

          {hidePeerDiscovery ? (
            <p className="mt-5 text-[12.5px] text-[#94A3B8]">
              {alertsEnabled
                ? 'In-app alerts are on — new nearby jobs will surface in Notifications when you return.'
                : 'Alerts stay in-app only. No push or SMS claims.'}
            </p>
          ) : null}
        </div>

        <div className="border-t border-[#F1F5F9] lg:border-l lg:border-t-0">
          <BrowseRadar cityLabel={area} className="h-full min-h-[200px] sm:min-h-[240px]" />
        </div>
      </div>
    </div>
  )
}
