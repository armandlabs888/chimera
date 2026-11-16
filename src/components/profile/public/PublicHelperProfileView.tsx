'use client'

import { Heart, MessageSquare, Star } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import {
  ProfileHeader,
  ProfileHeaderIcons,
  buildHelperStats,
  buildRoleMeta,
  shareProfileLink,
  type ProfileHeaderOverflowItem,
} from '@/components/profile/ProfileHeader'
import { ButtonLink, EmptyState } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { useBrowseLocation } from '@/hooks/useBrowseLocation'
import {
  addLocalDays,
  formatClockLabel,
  formatShortDate,
  formatWeekdayShortDate,
  localDateISO,
  parseTimeInput,
} from '@/lib/listingSchedule'
import { formatLocation } from '@/lib/location'
import { formatRate, isFlatRate, relativeTime } from '@/lib/matching'
import { hidesPeerHelperDiscovery } from '@/lib/roles'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { Person, Review } from '@/types'
import { hasWorkingHours } from '@/lib/workingHours'
import './public-helper-profile.css'

const ARRIVAL_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function buildDayOptions(from = new Date()) {
  const start = localDateISO(from)
  return Array.from({ length: 6 }, (_, i) => {
    const value = addLocalDays(start, i)
    const d = new Date(`${value}T12:00:00`)
    return {
      value,
      dow: d.toLocaleDateString('en-US', { weekday: 'short' }),
      short: formatShortDate(value),
      label: formatWeekdayShortDate(value),
    }
  })
}

function authNextHref(path: string): string {
  return `/auth?next=${encodeURIComponent(path)}`
}

function skillOptions(person: Person): { id: string; label: string }[] {
  return person.skills.map((skill) => ({
    id: skill,
    label: formatCategoryLabel(skill, skill === 'other' ? person.otherSkillLabel : null),
  }))
}

export function PublicHelperProfileView({
  person,
  reviews,
}: {
  person: Person
  reviews: Review[]
}) {
  const {
    currentUser,
    authUser,
    mode,
    state,
    toggleSavedHelper,
    ensureDirectThread,
    getPerson,
  } = useBeam()
  const router = useRouter()
  const { openThread } = useMessagesDrawer()
  const { origin } = useBrowseLocation(currentUser)
  const estimatorRef = useRef<HTMLFormElement>(null)

  const isGuest = mode === 'live' && !authUser
  const isYou = person.id === currentUser.id
  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)
  const browseFallbackHref = hidePeerDiscovery ? '/browse' : '/browse?tab=people'
  const profilePath = `/people/${person.id}`
  const isSaved = state.savedHelperIds?.includes(person.id) ?? false

  const locationLabel = formatLocation(person)
  const radius = person.serviceRadiusMiles ?? 5
  const skills = skillOptions(person)
  const primarySkill = skills[0]
  const hourly = Math.round(person.hourlyRate || 0)
  const rateLabel = formatRate(person)
  const flatRate = isFlatRate(person)
  const viewerArea =
    origin.locationLabel?.trim() ||
    currentUser.locationLabel?.trim() ||
    'Nearby'
  const helperFirst = firstName(person.name)
  const days = useMemo(() => buildDayOptions(), [])

  const [selectedDay, setSelectedDay] = useState(days[0]?.value ?? '')
  const [arrival, setArrival] = useState('')
  const [hours, setHours] = useState(1)
  const [taskType, setTaskType] = useState(primarySkill?.id ?? '')
  const [city, setCity] = useState(viewerArea === 'Nearby' ? '' : viewerArea)
  const [details, setDetails] = useState('')
  const [toast, setToast] = useState('')
  const [messaging, setMessaging] = useState(false)

  const headerStats = useMemo(() => buildHelperStats(person), [person])
  const headerMeta = useMemo(() => buildRoleMeta('helper', person), [person])
  const hasHours = hasWorkingHours(person)

  const total = flatRate ? hourly : hourly * hours
  const hoursLabel = hours === 1 ? '1 hr' : `${hours} hrs`

  function requireAuth(): boolean {
    if (!isGuest) return true
    router.push(authNextHref(profilePath))
    return false
  }

  function scrollToEstimator() {
    estimatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function onShare() {
    const url = typeof window !== 'undefined' ? window.location.href : profilePath
    const result = await shareProfileLink({
      title: `${person.name} on HouseCall`,
      url,
    })
    if (result === 'copied') {
      setToast('Link copied')
      window.setTimeout(() => setToast(''), 1600)
    } else if (result === 'failed') {
      setToast('Could not copy link')
      window.setTimeout(() => setToast(''), 1600)
    }
  }

  async function onSave() {
    if (!requireAuth()) return
    const wasSaved = isSaved
    try {
      await toggleSavedHelper(person.id)
      setToast(wasSaved ? 'Removed from your helpers' : 'Saved to your helpers')
      window.setTimeout(() => setToast(''), 1600)
    } catch {
      setToast('Could not update saved helpers')
      window.setTimeout(() => setToast(''), 1600)
    }
  }

  async function onMessage() {
    if (isYou) return
    if (!requireAuth()) return
    if (messaging) return
    setMessaging(true)
    try {
      const threadId = await ensureDirectThread(person.id)
      openThread(threadId)
    } catch {
      setToast('Could not open messages')
      window.setTimeout(() => setToast(''), 1600)
    } finally {
      setMessaging(false)
    }
  }

  function buildBookHref(): string {
    const params = new URLSearchParams()
    params.set('rebook', person.id)
    if (taskType) params.set('category', taskType)
    if (selectedDay) {
      params.set('when', 'scheduled')
      params.set('date', selectedDay)
    }
    if (arrival) params.set('time', arrival)
    if (city.trim()) params.set('location', city.trim())
    if (details.trim()) params.set('details', details.trim())
    if (hourly > 0) {
      params.set('budget', String(total))
      params.set('budgetType', 'fixed')
    }
    return `/post?${params.toString()}`
  }

  function onRequestToBook(e?: FormEvent) {
    e?.preventDefault()
    if (isYou) return
    if (!requireAuth()) return
    router.push(buildBookHref())
  }

  const meetHelpersHref = hidePeerDiscovery ? '/browse' : '/browse?tab=people'

  const overflowItems: ProfileHeaderOverflowItem[] = isYou
    ? [
        {
          key: 'edit-helper',
          label: 'Edit helper details',
          href: '/settings/profile#services',
          testId: 'public-helper-edit-helper',
        },
      ]
    : [
        {
          key: 'save',
          label: isSaved ? 'Saved' : 'Save',
          icon: (
            <Heart
              className={`h-4 w-4${isSaved ? ' fill-current text-[#1D5CE5]' : ''}`}
              strokeWidth={1.8}
              aria-hidden
            />
          ),
          onClick: () => void onSave(),
          testId: 'public-helper-save',
        },
      ]

  const primaryAction = isYou
    ? {
        key: 'edit',
        label: 'Edit profile',
        icon: ProfileHeaderIcons.edit,
        href: '/settings/profile',
        testId: 'public-helper-edit',
      }
    : {
        key: 'message',
        label: messaging ? 'Opening...' : 'Message',
        icon: <MessageSquare className="h-4 w-4" strokeWidth={2} aria-hidden />,
        disabled: messaging,
        onClick: () => void onMessage(),
        testId: 'public-helper-message',
      }

  return (
    <div className="public-helper-profile" data-testid="public-helper-profile">
      <nav className="php-crumb" aria-label="Breadcrumb">
        <Link href={meetHelpersHref}>Meet helpers</Link>
        <span className="php-sep">/</span>
        <Link href={meetHelpersHref}>{locationLabel}</Link>
        <span className="php-sep">/</span>
        <span className="php-here">{person.name}</span>
      </nav>
      <p className="php-your-area">
        Your area: <b>{viewerArea}</b>
      </p>
      <hr className="php-rule" />

      <div className="php-layout">
        <div className="php-main">
          <section aria-labelledby="helper-name">
            <ProfileHeader
              person={person}
              titleId="helper-name"
              stats={headerStats}
              meta={headerMeta}
              primaryAction={primaryAction}
              secondaryActions={[
                {
                  key: 'share',
                  label: 'Share',
                  icon: ProfileHeaderIcons.share,
                  onClick: () => void onShare(),
                  testId: 'public-helper-share',
                },
              ]}
              overflowItems={overflowItems}
              belowActions={
                !isYou ? (
                  <button
                    type="button"
                    className="php-book-hero"
                    data-testid="public-helper-book-hero"
                    onClick={scrollToEstimator}
                  >
                    Request to book · {rateLabel}
                  </button>
                ) : null
              }
            />

            {person.bio?.trim() ? (
              <p className="php-facts" data-testid="public-helper-bio">
                {person.bio.trim()}
              </p>
            ) : null}

            {person.availableNow ? (
              <p className="php-facts">
                <span className="php-now">Available for same-day tasks</span>
              </p>
            ) : null}

            {primarySkill ? (
              <p className="php-facts php-facts-2">
                <Link className="php-cat-link" href={browseFallbackHref}>
                  {primarySkill.label}
                </Link>
                <span className="php-sep">·</span>
                <span className="php-meta">
                  Within {radius} mi
                </span>
              </p>
            ) : (
              <p className="php-facts php-facts-2">
                <span className="php-meta">Within {radius} mi</span>
              </p>
            )}
          </section>

          <section className="php-block" aria-labelledby="day-heading">
            <h2 id="day-heading">Choose a day</h2>
            <p className="php-block-sub">
              {hasHours
                ? `Pick a date for your request with ${helperFirst}. Their working hours are shown under their name.`
                : `Pick a date for your request with ${helperFirst}.`}
            </p>
            <div className="php-days" role="listbox" aria-label="Choose a day">
              {days.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  role="option"
                  aria-selected={selectedDay === day.value}
                  className={`php-day${selectedDay === day.value ? ' is-on' : ''}`}
                  data-testid={`public-helper-day-${day.value}`}
                  onClick={() => setSelectedDay(day.value)}
                >
                  <div className="php-dow">{day.dow}</div>
                  <div className="php-date">{day.short}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="php-block" aria-labelledby="radius-heading">
            <h2 id="radius-heading">
              Service radius · {locationLabel} ({radius} mi)
            </h2>
            <p className="php-block-sub">
              {helperFirst} works from {locationLabel} and lists a {radius}-mile service radius.
              Confirm the exact address when you post the request.
            </p>
          </section>

          <section className="php-block" aria-labelledby="reviews-heading">
            <div className="php-block-head">
              <h2 id="reviews-heading">
                Reviews <span className="php-count">({reviews.length})</span>
              </h2>
            </div>
            {reviews.length ? (
              <ul className="php-review-list" data-testid="public-helper-reviews">
                {reviews.map((review) => {
                  const from = getPerson(review.fromId)
                  return (
                    <li key={review.id} className="php-review-card">
                      <div className="flex items-center gap-2 text-[14px]">
                        <Star
                          className="h-4 w-4 fill-[#071330] text-[#071330]"
                          aria-hidden
                        />
                        <span className="font-semibold text-[#071330]">{review.rating}/5</span>
                        <span className="text-[#4A5568]">
                          from {from?.name ?? 'Neighbor'}
                        </span>
                        <span className="ml-auto text-[13px] text-[#4A5568]">
                          {relativeTime(review.createdAt)}
                        </span>
                      </div>
                      {review.comment?.trim() ? (
                        <p className="mt-2 text-[15px] leading-[1.55] text-[#071330]">
                          {review.comment}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="php-reviews" data-testid="public-helper-reviews-empty">
                <p className="php-empty-title">No reviews yet</p>
                <p className="php-empty-body">
                  Completed jobs will show neighbor feedback here.
                </p>
                <div className="php-guide">
                  <h3>Pay after completion</h3>
                  <p>
                    Payments are arranged directly between neighbors. HouseCall does not collect a
                    booking fee.
                  </p>
                </div>
                {!isYou ? (
                  <button type="button" className="php-ask" onClick={() => void onMessage()}>
                    <MessageSquare className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                    Ask {helperFirst} a question before booking
                  </button>
                ) : (
                  <div className="mb-3 mt-4" />
                )}
              </div>
            )}
            {reviews.length ? (
              <div className="php-reviews mt-4">
                <div className="php-guide" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                  <h3>Pay after completion</h3>
                  <p>
                    Payments are arranged directly between neighbors. HouseCall does not collect a
                    booking fee.
                  </p>
                </div>
                {!isYou ? (
                  <button type="button" className="php-ask" onClick={() => void onMessage()}>
                    <MessageSquare className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                    Ask {helperFirst} a question before booking
                  </button>
                ) : (
                  <div className="mb-3 mt-2" />
                )}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="php-side">
          <div className="php-sticky">
            {!isYou ? (
              <form
                className="php-book-card"
                id="public-helper-estimator"
                ref={estimatorRef}
                data-testid="public-helper-estimator"
                onSubmit={onRequestToBook}
              >
                <p className="php-fee-note">
                  No platform booking fees · Pay neighbor directly
                </p>

                <div className="php-field">
                  <label className="php-label" htmlFor="php-task-type">
                    Task type
                  </label>
                  <select
                    className="php-select"
                    id="php-task-type"
                    data-testid="public-helper-task-type"
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                  >
                    {skills.length ? (
                      skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.label}
                        </option>
                      ))
                    ) : (
                      <option value="">Local help</option>
                    )}
                  </select>
                </div>

                <div className="php-field-row">
                  <div className="php-field">
                    <label className="php-label" htmlFor="php-day-select">
                      Day
                    </label>
                    <select
                      className="php-select"
                      id="php-day-select"
                      data-testid="public-helper-day-select"
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                    >
                      {days.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="php-field">
                    <label className="php-label" htmlFor="php-arrival">
                      Arrival time
                    </label>
                    <select
                      className="php-select"
                      id="php-arrival"
                      data-testid="public-helper-arrival"
                      value={arrival}
                      onChange={(e) => setArrival(e.target.value)}
                    >
                      <option value="">Choose a time</option>
                      {ARRIVAL_HOURS.map((h) => {
                        const value = `${String(h).padStart(2, '0')}:00`
                        const clock = parseTimeInput(value)
                        return (
                          <option key={value} value={value}>
                            {clock ? formatClockLabel(clock) : value}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                {hourly > 0 && !flatRate ? (
                  <div className="php-field">
                    <div className="php-time-row">
                      <span className="php-label" style={{ margin: 0 }}>
                        Estimated hours
                      </span>
                      <div className="php-stepper" role="group" aria-label="Estimated hours">
                        <button
                          type="button"
                          aria-label="Decrease hours"
                          data-testid="public-helper-hours-minus"
                          onClick={() => setHours((h) => Math.max(1, h - 1))}
                        >
                          -
                        </button>
                        <span className="php-val" data-testid="public-helper-hours-val">
                          {hoursLabel}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase hours"
                          data-testid="public-helper-hours-plus"
                          onClick={() => setHours((h) => Math.min(8, h + 1))}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <span className="php-hint">
                      Suggests a price of ${hourly} times these hours.
                    </span>
                  </div>
                ) : null}

                <div className="php-field">
                  <label className="php-label" htmlFor="php-city">
                    City
                  </label>
                  <input
                    className="php-text"
                    id="php-city"
                    data-testid="public-helper-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="php-field">
                  <label className="php-label" htmlFor="php-details">
                    What do you need help with?
                  </label>
                  <textarea
                    className="php-area"
                    id="php-details"
                    data-testid="public-helper-details"
                    placeholder="Describe the task, location notes, and any timing constraints."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>

                {hourly > 0 ? (
                  <div className="php-total-row" data-testid="public-helper-total">
                    <span className="php-lbl">
                      {flatRate
                        ? 'Estimated total (Flat Fee)'
                        : `Estimated total ($${hourly} × ${hoursLabel})`}
                    </span>
                    <span className="php-amt">${total}</span>
                  </div>
                ) : null}

                <button
                  className="php-book-submit"
                  type="submit"
                  data-testid="public-helper-request-book"
                >
                  Request to book
                </button>
                <p className="php-charge-note">You won&apos;t be charged now.</p>
              </form>
            ) : (
              <div className="php-book-card">
                <p className="php-fee-note">This is how neighbors see your public helper profile.</p>
                <ButtonLink href="/settings/profile#services" className="mt-3 w-full justify-center">
                  Edit helper details
                </ButtonLink>
              </div>
            )}
          </div>
        </aside>
      </div>

      {toast ? (
        <div className="php-toast" role="status" data-testid="public-helper-toast">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

export function PublicHelperNotFound() {
  const { currentUser, authUser, mode } = useBeam()
  const isGuest = mode === 'live' && !authUser
  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)
  const browseFallbackHref = hidePeerDiscovery ? '/browse' : '/browse?tab=people'
  return (
    <div className="beam-container py-10" data-testid="public-helper-not-found">
      <EmptyState
        titleAs="h1"
        title="This profile isn't available"
        body="It may be private, or the link may be incorrect."
        action={
          <ButtonLink href={browseFallbackHref}>
            {hidePeerDiscovery ? 'Browse open jobs' : 'Browse people'}
          </ButtonLink>
        }
      />
    </div>
  )
}

/** Shown when a neighbor profile exists server-side but is not in the signed-out marketplace payload. */
export function PublicProfileSignInPrompt({ profilePath }: { profilePath: string }) {
  return (
    <div className="beam-container py-10" data-testid="public-profile-sign-in">
      <EmptyState
        titleAs="h1"
        title="Sign in to view this profile"
        body="Neighbor profiles are available after you sign in."
        action={<ButtonLink href={authNextHref(profilePath)}>Sign in</ButtonLink>}
      />
    </div>
  )
}
