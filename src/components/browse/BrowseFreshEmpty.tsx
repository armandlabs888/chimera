'use client'

import Image from 'next/image'
import Link from 'next/link'

/**
 * Fresh-marketplace empty hero — vivid blue→turquoise energy on an otherwise quiet canvas.
 * Artwork: everyday-help character (cleaning kit). No map / radar / scanning motifs.
 * Mobile: compact copy + reduced (not removed) illustration so next-step cards appear sooner.
 */
export function BrowseFreshEmpty({
  hidePeerDiscovery,
  cityLabel,
  onEnableAlerts,
  alertsEnabled,
  onWidenRadius,
}: {
  hidePeerDiscovery: boolean
  cityLabel: string
  onEnableAlerts: () => void
  alertsEnabled: boolean
  onWidenRadius?: () => void
}) {
  const area = cityLabel || 'your area'

  return (
    <div
      className="relative overflow-hidden rounded-[12px] shadow-[0_12px_32px_-14px_rgba(11,60,199,0.45)]"
      data-testid="browse-fresh-empty"
      data-empty-layout="gradient-hero"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #0A2FA8 0%, #1D5CE5 42%, #0EA5E9 72%, #2DD4BF 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 70% 80% at 15% 20%, rgba(255,255,255,0.28), transparent 55%)',
        }}
        aria-hidden
      />

      {/*
        Mobile: copy + compact art side-by-side (reduced illustration, not hidden).
        sm+: roomier art column; lg: full desktop balance.
      */}
      <div className="relative grid grid-cols-[minmax(0,1fr)_88px] items-end gap-2 pl-4 pr-2 pt-4 pb-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(160px,0.8fr)] sm:items-center sm:gap-5 sm:px-7 sm:py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(200px,0.85fr)] lg:gap-6 lg:px-8 lg:py-7">
        <div className="min-w-0 pb-0.5 sm:pb-0">
          <span className="inline-flex items-center rounded-lg border border-white/35 bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-[2px] sm:px-2.5 sm:py-1 sm:text-[10.5px] sm:tracking-[0.14em]">
            Fresh marketplace
          </span>

          <h2 className="mt-2 max-w-[16ch] text-balance font-display text-[1.45rem] font-bold leading-[1.08] tracking-[-0.03em] text-white drop-shadow-[0_1px_3px_rgba(7,19,48,0.28)] sm:mt-3 sm:max-w-[18ch] sm:text-[clamp(1.85rem,3.2vw,2.45rem)] sm:leading-[1.06]">
            {hidePeerDiscovery ? 'No open jobs nearby yet.' : 'Be the first on Beam.'}
          </h2>

          <p className="mt-1.5 max-w-[36ch] text-[13px] leading-[1.45] text-white drop-shadow-[0_1px_2px_rgba(7,19,48,0.35)] sm:mt-3 sm:max-w-[40ch] sm:text-[15px] sm:leading-[1.55]">
            {hidePeerDiscovery
              ? `Requests near ${area} will show up here. Turn on alerts, widen search, or post a task.`
              : `No open requests near ${area} yet — post a task, or set up your helper profile.`}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-2.5">
            {hidePeerDiscovery ? (
              <>
                <button
                  type="button"
                  onClick={onEnableAlerts}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3.5 text-[13px] font-semibold text-[#0A2FA8] shadow-[0_2px_8px_rgba(7,19,48,0.12)] transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D5CE5] sm:h-10 sm:px-4 sm:text-[13.5px]"
                  data-testid="browse-empty-alerts-cta"
                >
                  {alertsEnabled ? 'Alerts on' : 'Get job alerts'}
                </button>
                <Link
                  href="/post"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-white/55 bg-transparent px-3.5 text-[13px] font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-10 sm:px-4 sm:text-[13.5px]"
                >
                  Post a task
                </Link>
                {onWidenRadius ? (
                  <button
                    type="button"
                    onClick={onWidenRadius}
                    className="inline-flex h-9 items-center justify-center rounded-lg px-2 text-[12.5px] font-semibold text-white/90 underline-offset-2 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-10 sm:px-3 sm:text-[13px]"
                    data-testid="browse-empty-widen"
                  >
                    Widen to 25 mi
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <Link
                  href="/post"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3.5 text-[13px] font-semibold text-[#0A2FA8] shadow-[0_2px_8px_rgba(7,19,48,0.12)] transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-10 sm:px-4 sm:text-[13.5px]"
                >
                  Post the first request
                </Link>
                <Link
                  href="/onboarding/helper"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-white/55 bg-transparent px-3.5 text-[13px] font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-10 sm:px-4 sm:text-[13.5px]"
                >
                  Become a helper
                </Link>
              </>
            )}
          </div>

          {hidePeerDiscovery ? (
            <p
              className="mt-2 max-w-[42ch] rounded-lg bg-[#071330]/40 px-2 py-1 text-[12px] font-medium leading-snug text-white backdrop-blur-[2px] drop-shadow-[0_1px_2px_rgba(7,19,48,0.4)] sm:mt-4 sm:max-w-[46ch] sm:px-2.5 sm:py-1.5 sm:text-[13px] sm:leading-relaxed"
              data-testid="browse-empty-alerts-caveat"
            >
              {alertsEnabled
                ? 'In-app alerts preference is on — nearby jobs stand out when you return. No push or SMS.'
                : 'Alerts save an in-app preference only. No push or SMS delivery.'}
            </p>
          ) : null}
        </div>

        <div
          className="relative h-[112px] w-full min-w-[88px] sm:mx-0 sm:h-[200px] sm:max-w-none lg:h-[248px]"
          aria-hidden
          data-testid="browse-empty-artwork"
        >
          <Image
            src="/images/browse/empty-helper.png"
            alt=""
            fill
            sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 96px"
            className="object-contain object-bottom drop-shadow-[0_12px_20px_rgba(7,19,48,0.28)]"
            priority
          />
        </div>
      </div>
    </div>
  )
}
