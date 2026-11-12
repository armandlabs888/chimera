'use client'

import Link from 'next/link'
import { ArrowRight, Calendar, ChevronDown, MapPin, Zap } from 'lucide-react'
import { BrowseCategoryThumb } from '@/components/browse/BrowseCategoryThumb'
import { BrowseLocationDialogHost } from '@/components/browse/BrowseLocationDialog'
import { useBeam } from '@/context/BeamContext'
import { useBrowseLocation } from '@/hooks/useBrowseLocation'
import { requestBrowseLocationPicker } from '@/lib/browseLocationPreference'
import {
  popularGigsCopy,
  selectPopularGigs,
  type PopularGigRow,
} from '@/lib/popularGigs'
import { useEffect, useMemo, useState } from 'react'
import './popular-gigs.css'

function GigCard({ row }: { row: PopularGigRow }) {
  const href = `/browse?job=${encodeURIComponent(row.request.id)}`
  return (
    <li>
      <Link
        href={href}
        className="gg-card"
        data-testid="popular-gig-card"
        data-job-id={row.request.id}
        aria-label={`${row.request.title} — ${row.budgetLabel}`}
      >
        <div className="gg-ph">
          {row.coverSrc ? (
            // Listing photos are arbitrary HTTPS URLs (and demo data URLs); next/image
            // domains are not configured for every storage host, so use a plain img.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.coverSrc} alt="" loading="lazy" decoding="async" />
          ) : (
            <BrowseCategoryThumb
              categoryId={row.request.category}
              size="hero"
              className="gg-ph-fallback !aspect-auto h-full w-full !rounded-none"
            />
          )}
          <span className={`gg-when${row.asap ? ' asap' : ''}`}>
            {row.asap ? (
              <Zap className="h-3 w-3" strokeWidth={2.4} aria-hidden />
            ) : (
              <Calendar className="h-3 w-3 text-[#1D5CE5]" strokeWidth={2.2} aria-hidden />
            )}
            {row.timingLabel}
          </span>
        </div>
        <div className="gg-b">
          <p className="gg-cat">{row.categoryLabel}</p>
          <h3 className="gg-t">{row.request.title}</h3>
          <div className="gg-m">
            <span>
              <MapPin className="h-[13px] w-[13px] shrink-0 text-[#475569]" strokeWidth={2} aria-hidden />
              {row.neighborhood}
            </span>
            <b>{row.budgetLabel}</b>
          </div>
        </div>
      </Link>
    </li>
  )
}

/**
 * Location-aware open-job grid under the hero. Real inventory only — never pads.
 */
export function LandingPopularGigs() {
  const { state, currentUser, ready, mode } = useBeam()
  const { origin } = useBrowseLocation(currentUser)
  // Demo-only QA hook so Playwright can screenshot the guest-unset copy while
  // the seed profile still has a city. Inert in live mode (production).
  const [demoForceUnset, setDemoForceUnset] = useState(false)
  useEffect(() => {
    if (mode !== 'demo') return
    setDemoForceUnset(new URLSearchParams(window.location.search).get('gigsLoc') === 'unset')
  }, [mode])

  const rows = useMemo(
    () =>
      selectPopularGigs({
        requests: state.requests,
        offers: state.offers,
        origin,
      }),
    [state.requests, state.offers, origin],
  )

  const copyOrigin = demoForceUnset
    ? { source: 'none' as const, city: '', locationLabel: 'Nearby' }
    : origin
  const copy = popularGigsCopy(copyOrigin)
  const browseHref = '/browse'

  return (
    <>
      <BrowseLocationDialogHost />
      <section
        id="popular-gigs"
        className="gg"
        data-testid="popular-gigs"
        data-ready={ready ? 'true' : 'false'}
        data-has-city={copy.hasCity ? 'true' : 'false'}
        aria-labelledby="popular-gigs-heading"
      >
        <div className="gg-w">
          <div className="gg-head">
            <div>
              <p className="gg-eb">Open near you</p>
              <h2 id="popular-gigs-heading" className="gg-h">
                <span>{copy.headingLead}</span>
                <button
                  type="button"
                  className={`gg-loc${copy.hasCity ? '' : ' gg-loc-choose'}`}
                  data-testid="popular-gigs-location"
                  data-location-mode={copy.hasCity ? 'city' : 'choose'}
                  aria-haspopup="dialog"
                  aria-label={
                    copy.hasCity
                      ? `Change location, currently ${copy.city}`
                      : 'Choose a city for popular gigs'
                  }
                  onClick={() => requestBrowseLocationPicker()}
                >
                  <MapPin className="h-5 w-5 text-[#1D5CE5]" strokeWidth={2.2} aria-hidden />
                  {copy.locationChipLabel}
                  <ChevronDown className="ch h-4 w-4 text-[#334155]" strokeWidth={2.2} aria-hidden />
                </button>
              </h2>
              <p className="gg-sub" data-testid="popular-gigs-subtext">
                {copy.subtext}
              </p>
            </div>
            <Link href={browseHref} className="gg-all" data-testid="popular-gigs-see-all">
              See all jobs
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="gg-empty" data-testid="popular-gigs-empty">
              <h3>No open gigs nearby yet</h3>
              <p>Be the first to post a task, or browse a wider area.</p>
              <div className="gg-empty-actions">
                <Link href="/post" className="gg-empty-primary">
                  Post a task
                </Link>
                <Link href={browseHref} className="gg-empty-secondary">
                  Browse jobs
                </Link>
              </div>
            </div>
          ) : (
            <ul
              className="gg-grid"
              data-testid="popular-gigs-grid"
              data-count={String(rows.length)}
            >
              {rows.map((row) => (
                <GigCard key={row.request.id} row={row} />
              ))}
            </ul>
          )}

          {rows.length > 0 ? (
            <Link
              href={browseHref}
              className="gg-mall"
              data-testid="popular-gigs-see-all-mobile"
            >
              {copy.mobileSeeAll}
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            </Link>
          ) : null}

          <div className="gg-foot">
            <span className="gg-post">
              Need something different?{' '}
              <Link href="/post" data-testid="popular-gigs-post">
                Post a task →
              </Link>
            </span>
          </div>
        </div>
      </section>
    </>
  )
}
