'use client'

import Link from 'next/link'
import { Bell, MapPinned, UserRound } from 'lucide-react'
import type { HelperProfileProgress } from '@/lib/helperProfileProgress'

const cardClass =
  'rounded-[12px] border border-[#C7D7F0] bg-[#F8FBFF] p-4 shadow-[0_6px_18px_-10px_rgba(29,92,229,0.2)]'

export function WhileYouWait({
  alertsEnabled,
  onToggleAlerts,
  onWidenRadius,
  profileProgress,
  showProfileCard,
}: {
  alertsEnabled: boolean
  onToggleAlerts: () => void
  onWidenRadius: () => void
  profileProgress: HelperProfileProgress
  showProfileCard: boolean
}) {
  return (
    <section className="mt-3.5 sm:mt-5" data-testid="browse-while-you-wait" aria-labelledby="while-you-wait-heading">
      <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2 sm:mb-3">
        <h3 id="while-you-wait-heading" className="text-[16px] font-bold text-[#071330]">
          While you wait
        </h3>
        <p className="text-[13px] font-medium text-[#475569]">Useful next steps nearby</p>
      </div>

      <div
        className={`grid grid-cols-1 gap-3 ${
          showProfileCard ? 'md:grid-cols-3' : 'md:grid-cols-2'
        }`}
      >
        <article className={cardClass}>
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#DBEAFE] text-[#1D5CE5]">
              <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={alertsEnabled}
              aria-label="In-app job alerts preference"
              onClick={onToggleAlerts}
              data-testid="browse-alerts-toggle"
              className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/50 ${
                alertsEnabled ? 'bg-[#1D5CE5]' : 'bg-[#CBD5E1]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-md bg-white shadow transition ${
                  alertsEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <h4 className="mt-3 text-[14.5px] font-bold text-[#071330]">In-app job alerts</h4>
          <p className="mt-1 text-[13px] leading-[1.45] text-[#334155]">
            Save a preference so new nearby jobs stand out when you come back. No push or SMS.
          </p>
          <p
            className={`mt-3 text-[13px] font-bold ${
              alertsEnabled ? 'text-[#1D5CE5]' : 'text-[#475569]'
            }`}
          >
            {alertsEnabled ? 'Alerts are on' : 'Alerts are off'}
          </p>
        </article>

        <article className={cardClass}>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#1D5CE5]">
            <MapPinned className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <h4 className="mt-3 text-[14.5px] font-bold text-[#071330]">Widen your service area</h4>
          <p className="mt-1 text-[13px] leading-[1.45] text-[#334155]">
            Expand the browse travel distance to catch open jobs a bit farther from your pin.
          </p>
          <button
            type="button"
            onClick={onWidenRadius}
            className="mt-3 inline-flex rounded-lg text-[13px] font-bold text-[#1D5CE5] transition hover:text-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45"
            data-testid="browse-widen-radius"
          >
            Set to 25 mi →
          </button>
        </article>

        {showProfileCard ? (
          <article className={cardClass} data-testid="browse-profile-progress-card">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#DBEAFE] text-[#1D5CE5]">
                <UserRound className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <span className="inline-flex items-center rounded-lg bg-[#DBEAFE] px-2 py-0.5 text-[12px] font-bold tabular-nums text-[#1D5CE5]">
                {profileProgress.percent}%
              </span>
            </div>
            <h4 className="mt-3 text-[14.5px] font-bold text-[#071330]">Finish your helper profile</h4>
            <p className="mt-1 text-[13px] leading-[1.45] text-[#334155]">
              {profileProgress.missing.length
                ? `Still needed: ${profileProgress.missing.slice(0, 2).join(', ')}${
                    profileProgress.missing.length > 2 ? '…' : ''
                  }`
                : 'Profile checklist looks complete. Keep skills and rate up to date.'}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-lg bg-[#D7E3F4]">
              <div
                className="h-full rounded-lg bg-[#1D5CE5] transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${profileProgress.percent}%` }}
              />
            </div>
            <Link
              href="/onboarding/helper"
              className="mt-3 inline-flex rounded-lg text-[13px] font-bold text-[#1D5CE5] transition hover:text-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45"
              data-testid="browse-continue-profile"
            >
              Continue →
            </Link>
          </article>
        ) : null}
      </div>
    </section>
  )
}
