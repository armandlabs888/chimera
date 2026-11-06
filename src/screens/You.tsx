'use client'

import { Heart, RotateCcw } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PersonCard } from '@/components/PersonCard'
import { RequestCard } from '@/components/RequestCard'
import {
  Avatar,
  Badge,
  Button,
  ButtonLink,
  EmptyState,
} from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { getCategory } from '@/data/categories'
import { formatLocationLabel } from '@/lib/location'
import { formatRate, relativeTime } from '@/lib/matching'

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
  const locationText = formatLocationLabel(currentUser)

  return (
    <div className="py-1 sm:py-2">
      <div className="mb-6 flex items-center gap-3 rounded-[20px] border border-[rgba(7,19,48,0.08)] bg-white px-4 py-4 shadow-[0_8px_24px_-14px_rgba(12,42,102,0.1)]">
        <Avatar src={currentUser.avatar} name={currentUser.name} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold text-[#071330]">{currentUser.name}</p>
          <p className="truncate text-[13px] text-[#64748B]">
            {locationText}
            {isHelper ? (
              <>
                <span className="text-[#CBD5E1]"> · </span>
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
          <Button
            type="button"
            variant="ghost"
            data-testid="you-sign-out"
            onClick={() => void signOut()}
            title="Sign out"
          >
            Sign out
          </Button>
        ) : null}
      </div>

      <div className="hide-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
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
            onClick={() => setTab(id)}
            className={`touch-target shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
              tab === id
                ? 'bg-[#1D5CE5] text-white'
                : 'border border-[rgba(7,19,48,0.1)] bg-white text-[#475569] hover:border-[rgba(29,92,229,0.3)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'requests' ? (
        myRequests.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {myRequests.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No requests yet"
            body="Post something you need done nearby — neighbors reply with a time and price."
            action={<ButtonLink href="/post">Post a request</ButtonLink>}
          />
        )
      ) : null}

      {tab === 'offers' ? (
        myOffers.length ? (
          <ul className="space-y-3">
            {myOffers.map((offer) => {
              const request = getRequest(offer.requestId)
              if (!request) return null
              return (
                <li key={offer.id}>
                  <Link
                    href={`/requests/${request.id}`}
                    className="block rounded-[20px] border border-[rgba(7,19,48,0.08)] bg-white px-4 py-4 transition hover:border-[rgba(29,92,229,0.28)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-bold text-[#071330]">
                          {request.title}
                        </p>
                        <p className="mt-1 text-[13px] text-[#64748B]">
                          Your offer ${Math.round(offer.price)} · {offer.eta}
                        </p>
                      </div>
                      <Badge tone={offer.status === 'accepted' ? 'live' : 'amber'}>
                        {offer.status}
                      </Badge>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            title="No offers yet"
            body="Browse open requests and name a price when you can help."
            action={<ButtonLink href="/browse">Browse requests</ButtonLink>}
          />
        )
      ) : null}

      {tab === 'saved' ? (
        savedHelpers.length ? (
          <div className="space-y-4">
            <p className="text-[14px] text-[#64748B]">
              Book again from people you liked working with.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
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
          <EmptyState
            title="No saved helpers"
            body="Tap the heart on a helper profile to save them for next time."
            action={<ButtonLink href="/browse?tab=people">Browse helpers</ButtonLink>}
          />
        )
      ) : null}

      {tab === 'notifications' ? (
        myNotifications.length ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                className="text-[13px] font-semibold text-[#1D5CE5] hover:underline"
                onClick={() => void markAllNotificationsRead()}
              >
                Mark all read
              </button>
            </div>
            <ul className="space-y-2">
              {myNotifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-0.5 rounded-[18px] border px-4 py-3.5 text-left transition hover:border-[rgba(29,92,229,0.28)] ${
                      n.readAt
                        ? 'border-[rgba(7,19,48,0.08)] bg-white'
                        : 'border-[rgba(29,92,229,0.18)] bg-[#F4F8FD]'
                    }`}
                    onClick={() => {
                      void markNotificationRead(n.id)
                      router.push(n.href)
                    }}
                  >
                    <span className="text-[14px] font-semibold text-[#071330]">{n.title}</span>
                    {n.body ? (
                      <span className="line-clamp-2 text-[13px] text-[#64748B]">{n.body}</span>
                    ) : null}
                    <span className="text-[11px] text-[#94A3B8]">{relativeTime(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            title="You’re all caught up"
            body="New offers, messages, and reviews show up here."
          />
        )
      ) : null}

      {tab === 'helper' ? (
        <div className="rounded-xl border border-[rgba(7,19,48,0.08)] bg-white p-5 shadow-[0_10px_28px_-12px_rgba(12,42,102,0.08)] sm:p-6">
          {isHelper ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-[22px] font-bold text-[#071330]">
                  Helper profile
                </h2>
                <p className="mt-1 text-[14px] text-[#64748B]">
                  {currentUser.availableNow ? 'Available now · ' : ''}
                  {formatRate(currentUser)} · Within {currentUser.serviceRadiusMiles ?? 5} mi
                </p>
              </div>
              {currentUser.bio ? (
                <p className="text-[15px] leading-[1.5] text-[#475569]">{currentUser.bio}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {currentUser.skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex rounded-full bg-[#F4F8FD] px-3 py-1.5 text-[12.5px] font-semibold text-[#071330]"
                  >
                    {getCategory(s).shortLabel}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/onboarding/helper">Edit helper profile</ButtonLink>
                <ButtonLink href={`/people/${currentUser.id}`} variant="secondary">
                  View public profile
                </ButtonLink>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center sm:text-left">
              <h2 className="font-display text-[22px] font-bold text-[#071330]">
                Become a helper
              </h2>
              <p className="text-[15px] leading-[1.5] text-[#64748B]">
                Set your skills, service area, and rate — then start browsing open requests nearby.
              </p>
              <HelperCta />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function HelperCta(): ReactNode {
  const { authUser, mode } = useBeam()
  const href =
    mode === 'live' && !authUser
      ? '/auth?mode=signup&next=%2Fonboarding%2Fhelper'
      : '/onboarding/helper'
  return <ButtonLink href={href}>Become a helper</ButtonLink>
}
