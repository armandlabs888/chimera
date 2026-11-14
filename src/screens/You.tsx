'use client'

import { ChevronLeft, Heart } from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PersonCard } from '@/components/PersonCard'
import { RequestCard } from '@/components/RequestCard'
import { Button, ButtonLink } from '@/components/ui'
import {
  AccountPageSidebar,
  type AccountQuickLink,
} from '@/components/account/AccountSidebar'
import { HelperUrgentSmsSettings } from '@/components/account/HelperUrgentSmsSettings'
import { useBeam } from '@/context/BeamContext'
import { formatCategoryLabel } from '@/lib/taxonomy'
import { formatRate } from '@/lib/matching'
import { hidesPeerHelperDiscovery } from '@/lib/roles'
import '@/components/account/account-hc.css'

const TABS = ['requests', 'offers', 'saved', 'helper'] as const
type YouTab = (typeof TABS)[number]

export function You() {
  const {
    state,
    currentUser,
    getRequest,
    mode,
    authUser,
    toggleSavedHelper,
    helperVerification,
  } = useBeam()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const rawTab = params.get('tab')
  // Former notifications tab removed from UI; Messages covers that inbox.
  const tab: YouTab = TABS.includes(rawTab as YouTab) ? (rawTab as YouTab) : 'requests'
  const verificationStatus = helperVerification?.status

  function setTab(next: YouTab) {
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'requests') nextParams.delete('tab')
    else nextParams.set('tab', next)
    const qs = nextParams.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  useEffect(() => {
    if (rawTab === 'notifications') {
      const nextParams = new URLSearchParams(params.toString())
      nextParams.delete('tab')
      const qs = nextParams.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }, [rawTab, params, pathname, router])

  useEffect(() => {
    if (tab !== 'helper') return
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#helper-urgent-sms') return
    const el = document.getElementById('helper-urgent-sms')
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [tab, state])

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

  const isHelper = Boolean(
    currentUser.isHelper ||
      currentUser.accountRole === 'helper' ||
      currentUser.skills.length > 0,
  )
  const isGuest = mode === 'live' && !authUser
  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)
  const helpersBrowseHref = hidePeerDiscovery ? '/browse' : '/browse?tab=people'
  // Show until the helper is approved; hide once status is approved.
  const showGetVerified = isHelper && verificationStatus !== 'approved'

  const quickLinks = useMemo((): AccountQuickLink[] => {
    const links: AccountQuickLink[] = [
      { kind: 'href', href: '/settings', label: 'Settings', testId: 'you-link-settings' },
      { kind: 'messages', label: 'Messages', testId: 'you-link-messages' },
      {
        kind: 'href',
        href: '/onboarding?edit=1',
        label: 'Change city',
        testId: 'you-link-change-city',
      },
    ]
    if (showGetVerified) {
      links.push({
        kind: 'href',
        href: '/verify',
        label: 'Get verified',
        testId: 'you-link-get-verified',
      })
    }
    return links
  }, [showGetVerified])

  const tabItems = (
    [
      ['requests', 'My requests'],
      ['offers', 'My offers'],
      ['saved', 'Saved helpers'],
      ['helper', isHelper ? 'Helper profile' : 'Become a helper'],
    ] as const
  )

  return (
    <div className="account-hc" data-testid="you-page">
      <div className="account-hc-wrap account-hc-page account-hc-profile-page">
        <Link href="/browse" className="account-hc-page-back" data-testid="you-back-browse">
          <ChevronLeft className="chev h-4 w-4" strokeWidth={2.25} aria-hidden />
          Back to browse
        </Link>
        <h1 className="account-hc-hero-title">Profile &amp; account</h1>
        <p className="account-hc-hero-sub account-hc-profile-sub">
          Manage your requests, offers, saved helpers, and helper profile.
        </p>

        <div className="account-hc-profile-layout">
          <div className="account-hc-profile-main">
            <div className="account-hc-tabs-wrap account-hc-tabs-wrap-flush">
              <div className="account-hc-tabs" role="tablist" aria-label="Account sections">
                {tabItems.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`account-hc-tab ${tab === id ? 'is-active' : ''}`}
                    data-testid={`you-tab-${id}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="account-hc-panel account-hc-panel-flush">
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
                    <p>
                      Post something you need done nearby. Neighbors reply with a time and price.
                    </p>
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
                              className={`account-hc-badge ${
                                offer.status === 'accepted' ? 'accepted' : ''
                              }`}
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

              {tab === 'helper' ? (
                <div className="account-hc-helper-stack">
                  <div className="account-hc-card account-hc-helper-summary">
                    {isHelper ? (
                      <>
                        <h2>Helper profile</h2>
                        <p className="meta">
                          {currentUser.availableNow ? 'Available now · ' : ''}
                          {formatRate(currentUser)} · Within{' '}
                          {currentUser.serviceRadiusMiles ?? 5} mi
                        </p>
                        {currentUser.bio ? (
                          <p className="account-hc-helper-bio">{currentUser.bio}</p>
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
                      </>
                    ) : (
                      <div className="text-center sm:text-left">
                        <h2>Become a helper</h2>
                        <p className="meta mt-2">
                          Set your skills, service area, and rate. Then start browsing open
                          requests nearby.
                        </p>
                        <div className="actions justify-center sm:justify-start">
                          <HelperCta />
                        </div>
                      </div>
                    )}
                  </div>
                  {isHelper ? (
                    <HelperUrgentSmsSettings
                      userId={authUser?.id || currentUser.id}
                      localOnly={mode !== 'live'}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <AccountPageSidebar quickLinks={quickLinks} />
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
