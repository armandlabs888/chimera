'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { BeamWordmark } from '@/components/BeamMark'
import { BrowseJobRow } from '@/components/browse/BrowseJobRow'
import {
  DescribeSearchForm,
  type DescribeSearchSubmit,
} from '@/components/describe/DescribeSearchForm'
import { useBeam } from '@/context/BeamContext'
import {
  detectDescribeIntent,
  formatHelpersHeading,
  formatIntentChip,
  matchRequestAgainstCategory,
  matchSkillAgainstCategory,
  resolveDescribeZip,
  softCategoryLabel,
  stripTrailingLocationPhrase,
  type DescribeRoleHint,
  type MatchIntent,
} from '@/lib/describeIntent'
import { computeEntityDistanceMiles, formatBrowseMiles } from '@/lib/browseDistance'
import { fetchBrowseMarketplaceDistances as fetchLiveDistances } from '@/lib/browseDistancesLive'
import { formatJobDetailsDisplay } from '@/lib/displayDetails'
import { formatLocation } from '@/lib/location'
import {
  formatBudget,
  formatPriceCaption,
  formatRate,
  hasListedPrice,
  requestAcceptsOffers,
} from '@/lib/matching'
import { formatPublicRating } from '@/lib/ratingDisplay'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import { formatCategoryLabel, isServiceCategoryId } from '@/lib/taxonomy'
import { navyButtonClass } from '@/components/ui/button'
import { normalizeZipInput } from '@/lib/zip/format'
import type { Person, Review } from '@/types'
import '@/components/browse/browse-hc.css'
import '@/components/match/match-page.css'

function isBrowseHelper(person: Person): boolean {
  return Boolean(person.isHelper || person.skills.length > 0) && !isBlankZeroCard(person)
}

function isBlankZeroCard(person: Person): boolean {
  return (
    person.rating === 0 &&
    person.reviewCount === 0 &&
    person.jobsCompleted === 0 &&
    person.hourlyRate === 0 &&
    person.skills.length === 0
  )
}

function formatJoined(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(+d)) return null
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = d.getFullYear()
  return `Joined ${month} ${year}`
}

function areaFromLabel(label: string): string {
  const trimmed = label.trim()
  if (!trimmed || trimmed === 'Nearby' || trimmed === 'Local area') return trimmed || 'Nearby'
  // "East Austin, TX" → "East Austin"; "North San Jose, CA 95131" → "North San Jose"
  const withoutZip = trimmed.replace(/\b\d{5}(?:-\d{4})?\b/, '').trim()
  const beforeComma = withoutZip.split(',')[0]?.trim()
  return beforeComma || withoutZip || trimmed
}

function latestReviewFor(
  personId: string,
  reviews: Review[],
  people: Person[],
): { comment: string; who: string } | null {
  const mine = reviews
    .filter((r) => r.toId === personId && (r.comment || '').trim())
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  const top = mine[0]
  if (!top) return null
  const from = people.find((p) => p.id === top.fromId)
  const area = from ? areaFromLabel(formatLocation(from)) : 'Nearby'
  return {
    comment: top.comment.trim(),
    who: `Neighbor in ${area}`,
  }
}

function primarySkillLabel(person: Person, preferredCategoryId: string | null): string {
  if (preferredCategoryId && matchSkillAgainstCategory(person.skills, preferredCategoryId)) {
    const hit =
      person.skills.find((s) => matchSkillAgainstCategory([s], preferredCategoryId)) ||
      preferredCategoryId
    return formatCategoryLabel(hit, person.otherSkillLabel)
  }
  const first = person.skills[0]
  return formatCategoryLabel(first, person.otherSkillLabel)
}

function postJobHref(q: string, categoryId: string | null, zip: string): string {
  const params = new URLSearchParams()
  if (q) {
    params.set('title', q.slice(0, 80))
    params.set('details', q)
  }
  if (categoryId && isServiceCategoryId(categoryId)) {
    params.set('category', categoryId)
  } else if (categoryId === 'moving') {
    params.set('category', 'junk-removal')
  }
  if (zip) params.set('zip', zip)
  const qs = params.toString()
  return qs ? `/post?${qs}` : '/post'
}

type RankedHelper = {
  person: Person
  miles: number | null
  skillMatch: boolean
}

function rankHelpers(input: {
  helpers: Person[]
  categoryId: string | null
  milesById: Map<string, number | null>
}): { ranked: RankedHelper[]; usedFallback: boolean } {
  const { helpers, categoryId, milesById } = input
  const withMeta = helpers.map((person) => ({
    person,
    miles: milesById.get(person.id) ?? null,
    skillMatch: matchSkillAgainstCategory(person.skills, categoryId),
  }))

  let usedFallback = false
  let pool = withMeta
  if (categoryId) {
    const matched = withMeta.filter((h) => h.skillMatch)
    if (matched.length > 0) {
      pool = matched
    } else {
      usedFallback = true
      pool = withMeta
    }
  }

  const ranked = [...pool].sort((a, b) => {
    if (a.skillMatch !== b.skillMatch) return a.skillMatch ? -1 : 1
    const da = a.miles ?? Number.POSITIVE_INFINITY
    const db = b.miles ?? Number.POSITIVE_INFINITY
    if (da !== db) return da - db
    if (b.person.rating !== a.person.rating) return b.person.rating - a.person.rating
    if (b.person.jobsCompleted !== a.person.jobsCompleted) {
      return b.person.jobsCompleted - a.person.jobsCompleted
    }
    const ta = a.person.createdAt ? +new Date(a.person.createdAt) : 0
    const tb = b.person.createdAt ? +new Date(b.person.createdAt) : 0
    return tb - ta
  })

  return { ranked, usedFallback }
}

export function Match() {
  const router = useRouter()
  const params = useSearchParams()
  const { state, ready, mode, authUser, currentUser } = useBeam()
  const isLiveGuest = mode === 'live' && !authUser
  const isDemo = mode === 'demo'

  const qParam = (params.get('q') || '').trim()
  const zipFromUrl = normalizeZipInput(params.get('zip') || '') || ''
  // Prefer ZIP query param; if missing, use a ZIP typed at the end of q (heading / match only).
  const zipParam = resolveDescribeZip(zipFromUrl, qParam) || zipFromUrl
  const intentParam = params.get('intent')
  const categoryParam = params.get('category')
  // Keep the typed q in the field; heading / category logic uses the stripped request text.
  const { requestText: qForHeading } = stripTrailingLocationPhrase(qParam)

  const roleHint: DescribeRoleHint = useMemo(() => {
    if (isLiveGuest) return 'guest'
    if (currentUser?.accountRole === 'helper') return 'helper'
    if (currentUser?.accountRole === 'customer') return 'customer'
    return 'guest'
  }, [isLiveGuest, currentUser?.accountRole])

  const detected = useMemo(
    () =>
      detectDescribeIntent(qParam, {
        zip: zipParam,
        city: '',
        roleHint,
        intentOverride:
          intentParam === 'helpers' || intentParam === 'jobs'
            ? (intentParam as MatchIntent)
            : null,
      }),
    [qParam, zipParam, roleHint, intentParam],
  )

  const intent: MatchIntent =
    intentParam === 'helpers' || intentParam === 'jobs' ? intentParam : detected.intent
  const categoryId = categoryParam || detected.category?.id || null
  const categoryLabel = categoryId
    ? softCategoryLabel(formatCategoryLabel(categoryId))
    : detected.category
      ? softCategoryLabel(detected.category.label)
      : null

  const [zipPlace, setZipPlace] = useState<{
    lat: number
    lng: number
    city: string
    stateCode: string
  } | null>(null)
  const [liveProfileMiles, setLiveProfileMiles] = useState<Map<string, number | null> | null>(
    null,
  )
  const [liveRequestMiles, setLiveRequestMiles] = useState<Map<string, number | null> | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    if (!zipParam) {
      setZipPlace(null)
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/zip?zip=${encodeURIComponent(zipParam)}`)
        if (!res.ok) return
        const data = (await res.json()) as {
          lat?: number
          lng?: number
          city?: string
          stateCode?: string
        }
        if (cancelled) return
        if (
          typeof data.lat === 'number' &&
          typeof data.lng === 'number' &&
          Number.isFinite(data.lat) &&
          Number.isFinite(data.lng)
        ) {
          setZipPlace({
            lat: data.lat,
            lng: data.lng,
            city: String(data.city || ''),
            stateCode: String(data.stateCode || ''),
          })
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [zipParam])

  const origin = zipPlace

  useEffect(() => {
    let cancelled = false
    if (!origin || mode !== 'live') {
      setLiveProfileMiles(null)
      setLiveRequestMiles(null)
      return
    }
    ;(async () => {
      const result = await fetchLiveDistances({
        originLat: origin.lat,
        originLng: origin.lng,
        radius: 'all',
      })
      if (cancelled || !result) return
      setLiveProfileMiles(result.profileMiles)
      setLiveRequestMiles(result.requestMiles)
    })()
    return () => {
      cancelled = true
    }
  }, [origin, mode, state.people.length, state.requests.length])

  const localProfileMiles = useMemo(() => {
    const map = new Map<string, number | null>()
    if (!origin) return map
    for (const p of state.people) {
      map.set(p.id, computeEntityDistanceMiles(origin, p))
    }
    return map
  }, [origin, state.people])

  const localRequestMiles = useMemo(() => {
    const map = new Map<string, number | null>()
    if (!origin) return map
    for (const r of state.requests) {
      map.set(r.id, computeEntityDistanceMiles(origin, r))
    }
    return map
  }, [origin, state.requests])

  const profileMilesById = liveProfileMiles ?? localProfileMiles
  const requestMilesById = liveRequestMiles ?? localRequestMiles

  const helperBase = useMemo(
    () =>
      state.people.filter(
        (p) => isBrowseHelper(p) && !(p.isCurrentUser || p.id === currentUser.id),
      ),
    [state.people, currentUser.id],
  )

  const { ranked: rankedHelpers, usedFallback } = useMemo(
    () =>
      rankHelpers({
        helpers: helperBase,
        categoryId: intent === 'helpers' ? categoryId : null,
        milesById: profileMilesById,
      }),
    [helperBase, categoryId, intent, profileMilesById],
  )

  const openJobs = useMemo(() => {
    let list = state.requests.filter((r) => r.status === 'open')
    if (intent === 'jobs' && categoryId) {
      list = list.filter((r) => matchRequestAgainstCategory(r.category, categoryId))
    }
    list = [...list].sort((a, b) => {
      const t = +new Date(b.createdAt) - +new Date(a.createdAt)
      if (t !== 0) return t
      const da = requestMilesById.get(a.id) ?? Number.POSITIVE_INFINITY
      const db = requestMilesById.get(b.id) ?? Number.POSITIVE_INFINITY
      return da - db
    })
    return list
  }, [state.requests, intent, categoryId, requestMilesById])

  const cityName =
    zipPlace?.city ||
    (zipParam ? '' : currentUser?.city) ||
    areaFromLabel(currentUser?.locationLabel || '') ||
    ''

  const navigateMatch = useCallback(
    (payload: DescribeSearchSubmit) => {
      const next = new URLSearchParams()
      if (payload.q) next.set('q', payload.q)
      if (payload.zip) next.set('zip', payload.zip)
      next.set('intent', payload.intent)
      if (payload.categoryId) next.set('category', payload.categoryId)
      router.push(`/match?${next.toString()}`)
    },
    [router],
  )

  const top3 = rankedHelpers.slice(0, 3)
  const more = rankedHelpers.slice(3)
  const postHref = postJobHref(qForHeading || qParam, categoryId, zipParam)

  const intentSwitch = formatIntentChip({
    intent,
    categoryLabel: null,
    zip: zipParam,
  })
  const intentSwitchHref = useMemo(() => {
    const next = new URLSearchParams(params.toString())
    next.set('intent', intent === 'jobs' ? 'helpers' : 'jobs')
    return `/match?${next.toString()}`
  }, [params, intent])

  const loginHref = `/auth?next=${encodeURIComponent(
    `/match?${params.toString()}`,
  )}`
  const signupHref = `/auth?mode=signup&next=${encodeURIComponent(
    `/match?${params.toString()}`,
  )}`

  return (
    <div className="match-page" data-testid="match-page">
      <header className="match-header">
        <div className="match-header-inner">
          <div className="match-header-row">
            <Link href="/" aria-label="HouseCall home" className="shrink-0">
              <BeamWordmark />
            </Link>
            <div className="min-w-0 flex-1">
              <DescribeSearchForm
                key={`${qParam}|${zipParam}|${intent}|${categoryId ?? ''}`}
                initialQuery={qParam}
                initialZip={zipParam}
                initialIntent={intent}
                roleHint={roleHint}
                cityLabel={cityName}
                variant="results"
                showChips={false}
                onSubmit={navigateMatch}
              />
            </div>
            {isLiveGuest ? (
              <div className="match-header-cta">
                <Link href={loginHref} className="login">
                  Log in
                </Link>
                <Link href={signupHref} className="signup">
                  Sign up
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="match-wrap">
        {isDemo ? (
          <div className="match-sample">
            <span className="match-sample-pill">Sample data</span>
          </div>
        ) : null}

        {intent === 'helpers' ? (
          <>
            <h1 className="match-title">{formatHelpersHeading(categoryLabel)}</h1>
            <Link
              href={intentSwitchHref}
              className="match-intent-switch"
              data-testid="match-intent-switch"
            >
              {intentSwitch.toggleLabel}
            </Link>
            <p className="match-sub">
              <MapPin width={18} height={18} strokeWidth={2.2} aria-hidden />
              {cityName ? `Helpers serving ${cityName}` : 'Helpers near you'}
            </p>

            <aside className="match-post-banner" data-testid="match-post-banner">
              <div>
                <h2>Want helpers to come to you?</h2>
                <p>
                  Post this as a job and we will pre-fill{' '}
                  <span className="query">
                    &quot;{qForHeading || qParam || 'your request'}&quot;
                  </span>
                  . Helpers nearby can send offers.
                </p>
              </div>
              <Link href={isLiveGuest ? `/auth?next=${encodeURIComponent(postHref)}` : postHref} className="btn">
                Post this as a job
              </Link>
            </aside>

            {!ready ? (
              <p className="match-note">Loading helpers…</p>
            ) : rankedHelpers.length === 0 ? (
              <div className="match-empty" data-testid="match-helpers-empty">
                <h2>
                  No helpers for this yet
                  {zipParam ? ` near ${zipParam}` : ''}
                </h2>
                <p>
                  Post the job and nearby helpers can send offers. You can also try a broader
                  request or another ZIP.
                </p>
                <div className="mt-5">
                  <Link
                    href={isLiveGuest ? `/auth?next=${encodeURIComponent(postHref)}` : postHref}
                    className={`match-view-btn ${navyButtonClass}`}
                  >
                    Post this as a job
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {usedFallback && categoryLabel ? (
                  <p className="match-note" data-testid="match-fallback-note">
                    No exact {categoryLabel.toLowerCase()} matches nearby yet. Showing other
                    helpers close to you.
                  </p>
                ) : null}

                <section className="match-top" aria-label="Top matches">
                  <p className="match-top-label">Top {Math.min(3, top3.length)} matches</p>
                  <div className="match-top-grid">
                    {top3.map(({ person, miles }) => {
                      const rating = formatPublicRating(person)
                      const review = latestReviewFor(
                        person.id,
                        state.reviews,
                        state.people,
                      )
                      const joined = formatJoined(person.createdAt)
                      const area = areaFromLabel(formatLocation(person))
                      const milesLabel = miles != null ? formatBrowseMiles(miles) : null
                      const skill = primarySkillLabel(person, categoryId)
                      return (
                        <article
                          key={person.id}
                          className="match-helper-card"
                          data-testid="match-helper-card"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="photo"
                            src={person.avatar}
                            alt=""
                            width={112}
                            height={112}
                          />
                          <h3 className="name">{person.name}</h3>
                          <p className="skill">{skill}</p>
                          <p className="stats">
                            {rating ? (
                              <>
                                <span className="stars">★ {rating}</span>
                                <span className="match-dot" aria-hidden>
                                  ·
                                </span>
                                <span>
                                  {person.reviewCount}{' '}
                                  {person.reviewCount === 1 ? 'review' : 'reviews'}
                                </span>
                                {person.jobsCompleted > 0 ? (
                                  <>
                                    <span className="match-dot" aria-hidden>
                                      ·
                                    </span>
                                    <span>
                                      {person.jobsCompleted}{' '}
                                      {person.jobsCompleted === 1
                                        ? 'job completed'
                                        : 'jobs completed'}
                                    </span>
                                  </>
                                ) : null}
                              </>
                            ) : (
                              <span className="match-badge-new">New</span>
                            )}
                          </p>
                          <p className="stats">
                            {joined ? <span>{joined}</span> : null}
                            {joined && (area || milesLabel) ? (
                              <span className="match-dot" aria-hidden>
                                ·
                              </span>
                            ) : null}
                            <span>
                              {area}
                              {milesLabel ? `, ${milesLabel}` : ''}
                            </span>
                          </p>
                          <p className="rate">{formatRate(person)}</p>
                          {review ? (
                            <blockquote className="quote">
                              “{review.comment}”
                              <span className="who">{review.who}</span>
                            </blockquote>
                          ) : null}
                          <div className="view-profile">
                            <Link
                              href={`/people/${person.id}`}
                              className={`match-view-btn hc-btn-navy ${navyButtonClass}`}
                              data-testid="match-view-profile"
                            >
                              View profile
                            </Link>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>

                {more.length > 0 ? (
                  <section className="match-more" aria-label="More matches">
                    <h2>More matches</h2>
                    <ul className="match-helper-list">
                      {more.map(({ person, miles }) => {
                        const rating = formatPublicRating(person)
                        const review = latestReviewFor(
                          person.id,
                          state.reviews,
                          state.people,
                        )
                        const joined = formatJoined(person.createdAt)
                        const area = areaFromLabel(formatLocation(person))
                        const milesLabel = miles != null ? formatBrowseMiles(miles) : null
                        const skill = primarySkillLabel(person, categoryId)
                        return (
                          <li key={person.id}>
                            <div
                              className="match-helper-row"
                              data-testid="match-helper-row"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                className="photo"
                                src={person.avatar}
                                alt=""
                                width={72}
                                height={72}
                              />
                              <div>
                                <p className="name">
                                  {person.name}
                                  {!rating ? (
                                    <span className="match-badge-new">New</span>
                                  ) : null}
                                </p>
                                <p className="skill">{skill}</p>
                                <span className="stats">
                                  {rating ? (
                                    <>
                                      <span className="stars">★ {rating}</span>
                                      <span className="match-dot" aria-hidden>
                                        ·
                                      </span>
                                      <span>
                                        {person.reviewCount}{' '}
                                        {person.reviewCount === 1 ? 'review' : 'reviews'}
                                      </span>
                                      {person.jobsCompleted > 0 ? (
                                        <>
                                          <span className="match-dot" aria-hidden>
                                            ·
                                          </span>
                                          <span>
                                            {person.jobsCompleted}{' '}
                                            {person.jobsCompleted === 1
                                              ? 'job completed'
                                              : 'jobs completed'}
                                          </span>
                                        </>
                                      ) : null}
                                    </>
                                  ) : null}
                                </span>
                                <span className="stats">
                                  {joined ? <span>{joined}</span> : null}
                                  {joined ? (
                                    <span className="match-dot" aria-hidden>
                                      ·
                                    </span>
                                  ) : null}
                                  <span>
                                    {area}
                                    {milesLabel ? `, ${milesLabel}` : ''}
                                  </span>
                                </span>
                                {review ? (
                                  <p className="quote">“{review.comment}”</p>
                                ) : null}
                                <div className="side">
                                  <span className="rate">{formatRate(person)}</span>
                                  <Link
                                    href={`/people/${person.id}`}
                                    className={`match-view-btn view-profile hc-btn-navy ${navyButtonClass}`}
                                  >
                                    View profile
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            <h1 className="match-title">
              New jobs near {zipParam || 'you'}
            </h1>
            <Link
              href={intentSwitchHref}
              className="match-intent-switch"
              data-testid="match-intent-switch"
            >
              {intentSwitch.toggleLabel}
            </Link>
            <p className="match-sub">
              <MapPin width={18} height={18} strokeWidth={2.2} aria-hidden />
              {cityName
                ? `Open jobs close to ${cityName}`
                : 'Open jobs close to you'}
            </p>

            <div className="match-meta">
              <span>
                {openJobs.length} {openJobs.length === 1 ? 'job' : 'jobs'} nearby
              </span>
              <span>
                Sorted by newest and closest
                {' · '}
                <Link
                  href={
                    zipParam
                      ? `/browse?zip=${encodeURIComponent(zipParam)}${
                          categoryId ? `&category=${encodeURIComponent(categoryId)}` : ''
                        }`
                      : '/browse'
                  }
                >
                  See all in Browse
                </Link>
              </span>
            </div>

            {!ready ? (
              <p className="match-note">Loading jobs…</p>
            ) : openJobs.length === 0 ? (
              <div className="match-empty" data-testid="match-jobs-empty">
                <h2>No open jobs match this yet{zipParam ? ` near ${zipParam}` : ''}</h2>
                <p>
                  Try another request, widen your ZIP, or{' '}
                  <Link href="/browse" className="font-semibold text-[#1649BD]">
                    see all in Browse
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <ul className="browse-job-list mt-0 border-0 p-0" data-testid="match-job-list">
                {openJobs.map((request) => {
                  const miles = requestMilesById.get(request.id)
                  const openBudget = !hasListedPrice(request) || requestAcceptsOffers(request)
                  const priceCaption = formatPriceCaption(request)
                  const images = normalizeListingImages(request.images, request.image)
                  const imageSrc = listingCoverImage(images, request.image) || ''
                  const excerpt = formatJobDetailsDisplay(request.details).slice(0, 160)
                  return (
                    <BrowseJobRow
                      key={request.id}
                      request={request}
                      title={request.title}
                      categoryLabel={formatCategoryLabel(
                        request.category,
                        request.categoryCustom,
                      )}
                      areaLabel={areaFromLabel(formatLocation(request))}
                      distanceLabel={miles != null ? formatBrowseMiles(miles) : null}
                      timingLabel={request.whenLabel || ''}
                      asap={request.when === 'asap'}
                      excerpt={excerpt}
                      priceLabel={formatBudget(request)}
                      priceCaption={priceCaption || (openBudget && hasListedPrice(request) ? 'Open to offers' : hasListedPrice(request) ? 'Firm price' : '')}
                      openBudget={!hasListedPrice(request)}
                      imageSrc={imageSrc}
                      selected={false}
                      onOpen={(id) => router.push(`/requests/${id}`)}
                    />
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
