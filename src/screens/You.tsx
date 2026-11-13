'use client'

import { Heart, RotateCcw } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PersonCard } from '@/components/PersonCard'
import { RequestCard } from '@/components/RequestCard'
import {
  Avatar,
  Button,
  ButtonLink,
} from '@/components/ui'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { useBeam } from '@/context/BeamContext'
import { threadIdFromMessagesHref } from '@/lib/messagesDrawer'
import { formatLocationLabel } from '@/lib/location'
import { formatCategoryLabel } from '@/lib/taxonomy'
import { formatRate, relativeTime } from '@/lib/matching'
import { hidesPeerHelperDiscovery } from '@/lib/roles'
import '@/components/account/account-hc.css'

const TABS = ['requests', 'offers', 'saved', 'notifications', 'helper'] as const
type YouTab = (typeof TABS)[number]

export function You() {
  const {
    state,
    currentUser,
    resetDemo,
    getRequest,
    mode,
    signOut,
    authUser,
    markNotificationRead,
    markAllNotificationsRead,
    toggleSavedHelper,
  } = useBeam()
  const router = useRouter()
  const { openList, openThread } = useMessagesDrawer()
  const pathname = usePathname()
  const params = useSearchParams()
  const rawTab = params.get('tab')
  const tab: YouTab = TABS.includes(rawTab as YouTab) ? (rawTab as YouTab) : 'requests'

  function setTab(next: YouTab) {
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'requests') nextParams.delete('tab')
    else nextParams.set('tab', next)
    const qs = nextParams.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const myRequests = useMemo(
    () => state.requests.filter((r) => r.requesterId === currentUser.id),
    [state.requests, currentUser.id],
  )

  const myOffers = useMemo(
    () => state.offers.filter((o) => o.helperId === currentUser.id),
    [state.offers, currentUser.id],
  )

  const savedHelpers = useMemo(
    () =>
      (state.savedHelperIds ?? [])
        .map((id) => state.people.find((p) => p.id === id))
        .filter(Boolean),
    [state.savedHelperIds, state.people],
  )

  const myNotifications = useMemo(
    () =>
      (state.notifications ?? [])
        .filter((n) => n.userId === currentUser.id || mode === 'demo')
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.notifications, currentUser.id, mode],
  )

  const unreadCount = myNotifications.filter((n) => !n.readAt).length
  const isHelper = Boolean(currentUser.isHelper || currentUser.skills.length > 0)
  const isGuest = mode === 'live' && !authUser
  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)
  const helpersBrowseHref = hidePeerDiscovery ? '/browse' : '/browse?tab=people'
  const locationText = formatLocationLabel(currentUser)

  return (
    <div className="account-hc" data-testid="you-page">
      <div className="account-hc-wrap account-hc-page">
        <div className="account-hc-title-row">
          <h1 className="account-hc-hero-title">Profile &amp; account</h1>
        </div>

        <div className="account-hc-card account-hc-identity">
          <Avatar src={currentUser.avatar} name={currentUser.name} size={48} />
          <div className="who">
            <p className="name truncate">{currentUser.name}</p>
            <p className="meta truncate">
              {locationText}
              {isHelper ? (
                <>
                  <span className="dot">·</span>
                  {formatRate(currentUser)}
                </>
              ) : null}
            </p>
          </div>
          {mode === 'demo' ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (confirm('Reset all demo data to the Austin seed?')) resetDemo()
              }}
              title="Reset demo data"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset demo</span>
            </Button>
          ) : authUser ? (
            <button
              type="button"
              className="account-hc-signout"
              data-testid="you-sign-out"
              onClick={() => void signOut()}
              title="Sign out"
            >
              Sign out
            </button>
          ) : null}
        </div>

        <div className="account-hc-tabs-wrap">
          <div className="account-hc-tabs" role="tablist" aria-label="Account sections">
            {(
              [
                ['requests', 'My requests'],
                ['offers', 'My offers'],
                ['saved', 'Saved helpers'],
                ['notifications', `Notifications${unreadCount ? ` (${unreadCount})` : ''}`],
                ['helper', 'Helper profile'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`account-hc-tab ${tab === id ? 'is-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="account-hc-panel">
          {tab === 'requests' ? (
            myRequests.length ? (
              <div className="account-hc-job-grid">
                {myRequests.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </div>
            ) : (
              <div className="account-hc-card account-hc-empty">
                <h3>No requests yet</h3>
                <p>Post something you need done nearby. Neighbors reply with a time and price.</p>
                <div className="actions">
                  <Link href="/post" className="account-hc-btn">
                    Post a request
                  </Link>
                </div>
              </div>
            )
          ) : null}

          {tab === 'offers' ? (
            myOffers.length ? (
              <ul className="account-hc-card account-hc-list">
                {myOffers.map((offer) => {
                  const request = getRequest(offer.requestId)
                  if (!request) return null
                  return (
                    <li key={offer.id}>
                      <Link href={`/requests/${request.id}`} className="account-hc-list-row">
                        <div className="min-w-0">
                          <p className="title truncate">{request.title}</p>
                          <p className="meta">
                            Your offer ${Math.round(offer.price)} · {offer.eta}
                          </p>
                        </div>
                        <span
                          className={`account-hc-badge ${offer.status === 'accepted' ? 'accepted' : ''}`}
                        >
                          {offer.status}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="account-hc-card account-hc-empty">
                <h3>No offers yet</h3>
                <p>Browse open requests and name a price when you can help.</p>
                <div className="actions">
                  <Link href="/browse" className="account-hc-btn">
                    Browse requests
                  </Link>
                </div>
              </div>
            )
          ) : null}

          {tab === 'saved' ? (
            savedHelpers.length ? (
              <div>
                <p className="account-hc-saved-intro">
                  Book again from people you liked working with.
                </p>
                <div className="account-hc-job-grid">
                  {savedHelpers.map((person) =>
                    person ? (
                      <div key={person.id} className="relative">
                        <PersonCard person={person} />
                        <div className="mt-3 flex gap-2">
                          <ButtonLink
                            href={
                              person.skills[0]
                                ? `/post?rebook=${person.id}&category=${person.skills[0]}`
                                : `/post?rebook=${person.id}`
                            }
                            size="sm"
                            className="flex-1"
                          >
                            Book again
                          </ButtonLink>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            aria-label="Remove saved helper"
                            onClick={() => void toggleSavedHelper(person.id)}
                          >
                            <Heart className="h-4 w-4 fill-[#1D5CE5] text-[#1D5CE5]" />
                          </Button>
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            ) : (
              <div className="account-hc-card account-hc-empty">
                <h3>No saved helpers</h3>
                <p>Tap the heart on a helper profile to save them for next time.</p>
                <div className="actions">
                  <Link href={helpersBrowseHref} className="account-hc-btn">
                    {hidePeerDiscovery ? 'Browse open jobs' : 'Browse helpers'}
                  </Link>
                </div>
              </div>
            )
          ) : null}

          {tab === 'notifications' ? (
            myNotifications.length ? (
              <div>
                <div className="account-hc-mark-all">
                  <button
                    type="button"
                    className="account-hc-text-link"
                    onClick={() => void markAllNotificationsRead()}
                  >
                    Mark all read
                  </button>
                </div>
                <ul className="account-hc-card account-hc-list">
                  {myNotifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className={`account-hc-list-row ${n.readAt ? '' : 'unread'}`}
                        onClick={() => {
                          void markNotificationRead(n.id)
                          const thread = threadIdFromMessagesHref(n.href)
                          if (thread === null) {
                            router.push(n.href)
                            return
                          }
                          if (thread) openThread(thread)
                          else openList()
                        }}
                      >
                        <div className="min-w-0">
                          <p className="title">{n.title}</p>
                          {n.body ? <p className="body line-clamp-2">{n.body}</p> : null}
                          <p className="when">{relativeTime(n.createdAt)}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="account-hc-card account-hc-empty">
                <h3>You&apos;re all caught up</h3>
                <p>New offers, messages, and reviews show up here.</p>
              </div>
            )
          ) : null}

          {tab === 'helper' ? (
            <div className="account-hc-card account-hc-helper-summary">
              {isHelper ? (
                <>
                  <h2>Helper profile</h2>
                  <p className="meta">
                    {currentUser.availableNow ? 'Available now · ' : ''}
                    {formatRate(currentUser)} · Within {currentUser.serviceRadiusMiles ?? 5} mi
                  </p>
                  {currentUser.bio ? (
                    <p className="mt-3 text-[15px] leading-[1.5] text-[#48556A]">{currentUser.bio}</p>
                  ) : null}
                  <div className="account-hc-skill-pills">
                    {currentUser.skills.map((s) => (
                      <span key={s}>
                        {formatCategoryLabel(
                          s,
                          s === 'other' ? currentUser.otherSkillLabel : null,
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="actions">
                    <Link href="/onboarding/helper" className="account-hc-btn">
                      Edit helper profile
                    </Link>
                    <Link href={`/people/${currentUser.id}`} className="account-hc-btn account-hc-btn-secondary">
                      View public profile
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center sm:text-left">
                  <h2>Become a helper</h2>
                  <p className="meta mt-2">
                    Set your skills, service area, and rate. Then start browsing open requests nearby.
                  </p>
                  <div className="actions justify-center sm:justify-start">
                    <HelperCta />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function HelperCta(): ReactNode {
  const { authUser, mode } = useBeam()
  const href =
    mode === 'live' && !authUser
      ? '/auth?mode=signup&next=%2Fonboarding%2Fhelper'
      : '/onboarding/helper'
  return (
    <Link href={href} className="account-hc-btn">
      Become a helper
    </Link>
  )
}
