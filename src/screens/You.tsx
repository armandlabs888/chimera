'use client'

import { Heart } from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AccountDemoReset,
  AccountQuickLinksCard,
  AccountSignOutButton,
  type AccountQuickLink,
} from '@/components/account/AccountSidebar'
import { HelperUrgentSmsSettings } from '@/components/account/HelperUrgentSmsSettings'
import { YouHelperDetailsForm } from '@/components/account/YouHelperDetailsForm'
import { YouProfileForm } from '@/components/account/YouProfileForm'
import { PersonCard } from '@/components/PersonCard'
import {
  HelperProfileHero,
  HelperProfileSettingsButton,
} from '@/components/profile/HelperProfileHero'
import { HelperProfileReviews } from '@/components/profile/HelperProfileReviews'
import { RequestCard } from '@/components/RequestCard'
import { Button, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { hidesPeerHelperDiscovery } from '@/lib/roles'
import '@/components/account/account-hc.css'

const ACTIVITY_TABS = ['requests', 'offers', 'saved'] as const
type ActivityTab = (typeof ACTIVITY_TABS)[number]
function scrollToId(id: string) {
  if (typeof window === 'undefined') return
  const run = () => {
    const el = document.getElementById(id)
    if (!el) return false
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return true
  }
  requestAnimationFrame(() => {
    if (run()) return
    window.setTimeout(run, 50)
  })
}

export function You() {
  const {
    state,
    currentUser,
    getRequest,
    getPerson,
    mode,
    authUser,
    toggleSavedHelper,
    helperVerification,
  } = useBeam()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const rawTab = params.get('tab')
  const activityTab: ActivityTab = ACTIVITY_TABS.includes(rawTab as ActivityTab)
    ? (rawTab as ActivityTab)
    : 'requests'
  const verificationStatus = helperVerification?.status

  function setActivityTab(next: ActivityTab) {
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
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash === '#helper-urgent-sms' || (rawTab === 'helper' && hash === '#helper-urgent-sms')) {
      scrollToId('helper-urgent-sms')
      return
    }
    if (rawTab === 'helper') {
      scrollToId('you-helper')
      return
    }
    if (rawTab === 'profile') {
      scrollToId('you-profile')
      return
    }
    if (rawTab === 'offers' || rawTab === 'saved') {
      scrollToId('you-activity')
    }
  }, [rawTab, state])

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

  const reviews = useMemo(
    () =>
      state.reviews
        .filter((r) => r.toId === currentUser.id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.reviews, currentUser.id],
  )

  const isHelper = Boolean(
    currentUser.isHelper ||
      currentUser.accountRole === 'helper' ||
      currentUser.skills.length > 0,
  )
  const isGuest = mode === 'live' && !authUser
  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)
  const helpersBrowseHref = hidePeerDiscovery ? '/browse' : '/browse?tab=people'
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
    if (isHelper) {
      links.push({
        kind: 'href',
        href: '/you?tab=helper',
        label: 'Helper profile',
        testId: 'you-link-helper-profile',
      })
    }
    return links
  }, [showGetVerified, isHelper])

  const activityItems = (
    [
      ['requests', 'My requests'],
      ['offers', 'My offers'],
      ['saved', 'Saved helpers'],
    ] as const
  )

  return (
    <div className="account-hc account-hc-you-page" data-testid="you-page">
      <div className="beam-container pb-10 pt-6 sm:pt-8">
        <HelperProfileHero
          person={currentUser}
          showHelperMeta={isHelper}
          accountType={isHelper ? 'helper' : 'neighbor'}
          showBio={false}
          trailingAction={<HelperProfileSettingsButton />}
          actions={
            <>
              <ButtonLink href="#you-profile" data-testid="you-edit-profile">
                Edit profile
              </ButtonLink>
              {isHelper ? (
                <ButtonLink
                  href={`/people/${currentUser.id}`}
                  variant="secondary"
                  data-testid="you-view-public-profile"
                >
                  View public profile
                </ButtonLink>
              ) : null}
            </>
          }
        />

        {isHelper ? <HelperProfileReviews reviews={reviews} getPerson={getPerson} /> : null}

        <section id="you-profile" className="mt-10 scroll-mt-24">
          <h2 className="font-display text-[22px] font-bold text-[#071330]">Your profile</h2>
          <div className="mt-4">
            <YouProfileForm />
          </div>
        </section>

        {isHelper ? (
          <section id="you-helper" className="mt-10 scroll-mt-24" data-testid="you-helper-section">
            <h2 className="font-display text-[22px] font-bold text-[#071330]">Helper details</h2>
            <div className="mt-4">
              <YouHelperDetailsForm />
            </div>
          </section>
        ) : null}

        {isHelper ? (
          <section className="mt-10 scroll-mt-24">
            <h2 className="font-display text-[22px] font-bold text-[#071330]">Urgent job texts</h2>
            <div className="mt-4">
              <HelperUrgentSmsSettings
                userId={authUser?.id || currentUser.id}
                localOnly={mode !== 'live'}
              />
            </div>
          </section>
        ) : (
          <section className="mt-10" data-testid="you-become-helper">
            <h2 className="font-display text-[22px] font-bold text-[#071330]">Become a helper</h2>
            <div className="mt-4 rounded-lg border border-[rgba(7,19,48,0.08)] bg-white px-6 py-7">
              <h3 className="font-display text-[22px] font-bold text-[#071330]">Become a helper</h3>
              <p className="mt-2 max-w-[42ch] text-[14px] text-[#48556A]">
                Set your skills, service area, and rate. Then start browsing open requests nearby.
              </p>
              <div className="mt-4">
                <HelperCta />
              </div>
            </div>
          </section>
        )}

        <section id="you-activity" className="mt-10 scroll-mt-24">
          <h2 className="font-display text-[22px] font-bold text-[#071330]">Your activity</h2>
          <div className="account-hc-tabs-wrap mt-4">
            <div className="account-hc-tabs" role="tablist" aria-label="Account sections">
              {activityItems.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activityTab === id}
                  onClick={() => setActivityTab(id)}
                  className={`account-hc-tab ${activityTab === id ? 'is-active' : ''}`}
                  data-testid={`you-tab-${id}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {activityTab === 'requests' ? (
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

            {activityTab === 'offers' ? (
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

            {activityTab === 'saved' ? (
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
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-[22px] font-bold text-[#071330]">Quick links</h2>
          <div className="mt-4 flex flex-col gap-3">
            <AccountQuickLinksCard links={quickLinks} title="" />
            <AccountSignOutButton />
            <AccountDemoReset />
          </div>
        </section>

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
    <Link href={href} className="account-hc-btn" data-testid="you-become-helper-cta">
      Become a helper
    </Link>
  )
}
