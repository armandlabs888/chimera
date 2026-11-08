'use client'

import Image from 'next/image'
import Link from 'next/link'

/**
 * Fresh-marketplace empty hero — vivid blue→turquoise energy on an otherwise quiet canvas.
 * Artwork: everyday-help character (cleaning kit). No map / radar / scanning motifs.
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
      {/* Gradient plane */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #0A2FA8 0%, #1D5CE5 42%, #0EA5E9 72%, #2DD4BF 100%)',
        }}
        aria-hidden
      />
      {/* Soft light wash for type contrast */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 70% 80% at 15% 20%, rgba(255,255,255,0.28), transparent 55%)',
        }}
        aria-hidden
      />

      <div className="relative grid items-center gap-4 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(200px,0.85fr)] lg:gap-6 lg:px-8 lg:py-8">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-lg border border-white/35 bg-white/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-[2px]">
            Fresh marketplace
          </span>

          <h2 className="mt-3.5 max-w-[18ch] text-balance font-display text-[clamp(1.7rem,3.2vw,2.35rem)] font-bold leading-[1.08] tracking-[-0.03em] text-white">
            {hidePeerDiscovery ? 'No open jobs nearby yet.' : 'Be the first on Beam.'}
          </h2>

          <p className="mt-3 max-w-[40ch] text-[14.5px] leading-[1.55] text-white/90 sm:text-[15px]">
            {hidePeerDiscovery
              ? `Requests near ${area} will show up here. Turn on in-app alerts, widen your search, or post a task if you need help yourself.`
              : `No open requests near ${area} yet — post a task for neighbors nearby, or set up your helper profile and start earning.`}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {hidePeerDiscovery ? (
              <>
                <button
                  type="button"
                  onClick={onEnableAlerts}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-[13.5px] font-semibold text-[#0A2FA8] shadow-[0_2px_8px_rgba(7,19,48,0.12)] transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D5CE5]"
                  data-testid="browse-empty-alerts-cta"
                >
                  {alertsEnabled ? 'Alerts on' : 'Get job alerts'}
                </button>
                <Link
                  href="/post"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-white/55 bg-transparent px-4 text-[13.5px] font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Post a task
                </Link>
                {onWidenRadius ? (
                  <button
                    type="button"
                    onClick={onWidenRadius}
                    className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-[13px] font-semibold text-white/90 underline-offset-2 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-[13.5px] font-semibold text-[#0A2FA8] shadow-[0_2px_8px_rgba(7,19,48,0.12)] transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Post the first request
                </Link>
                <Link
                  href="/onboarding/helper"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-white/55 bg-transparent px-4 text-[13.5px] font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Become a helper
                </Link>
              </>
            )}
          </div>

          {hidePeerDiscovery ? (
            <p className="mt-5 max-w-[46ch] text-[12.5px] leading-relaxed text-white/75">
              {alertsEnabled
                ? 'In-app alerts preference is on — nearby jobs will stand out when you return. No push or SMS.'
                : 'Alerts save an in-app preference only. No push or SMS delivery.'}
            </p>
          ) : null}
        </div>

        {/* Dimensional helper — reduced on small screens */}
        <div
          className="relative mx-auto hidden h-[200px] w-full max-w-[260px] sm:block sm:h-[220px] lg:mx-0 lg:h-[260px] lg:max-w-none"
          aria-hidden
        >
          <Image
            src="/images/browse/empty-helper.png"
            alt=""
            fill
            sizes="(min-width:1024px) 280px, 240px"
            className="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(7,19,48,0.28)]"
            priority
          />
        </div>
      </div>
    </div>
  )
}
