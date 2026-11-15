'use client'

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { HelperProfileBody } from '@/components/profile/HelperProfileBody'
import { useBeam } from '@/context/BeamContext'
import { isHelperPerson } from '@/lib/roles'

const ACTIVITY_TABS = ['requests', 'offers', 'saved'] as const

/**
 * Signed-in own profile: same structure neighbors see on /people/[id],
 * plus the preview bar and disabled Request / Message actions.
 * Edit forms, notifications, and activity live on separate routes.
 */
export function You() {
  const { state, currentUser } = useBeam()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const rawTab = params.get('tab')
  const isHelper = isHelperPerson(currentUser)

  // Keep old deep links working.
  useEffect(() => {
    if (!rawTab) return
    if (rawTab === 'profile') {
      router.replace('/settings/profile')
      return
    }
    if (rawTab === 'helper') {
      // Neighbors keep the become-a-helper path on edit profile; helpers open services.
      router.replace(isHelper ? '/settings/profile#services' : '/settings/profile')
      return
    }
    if (rawTab === 'notifications') {
      router.replace(isHelper ? '/settings/account#notifications' : '/settings')
      return
    }
    if (ACTIVITY_TABS.includes(rawTab as (typeof ACTIVITY_TABS)[number])) {
      const next = new URLSearchParams()
      next.set('tab', rawTab)
      router.replace(`/home?${next.toString()}`)
      return
    }
    // Unknown tab: strip it.
    const nextParams = new URLSearchParams(params.toString())
    nextParams.delete('tab')
    const qs = nextParams.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [rawTab, params, pathname, router, isHelper])

  const myRequests = useMemo(
    () => state.requests.filter((r) => r.requesterId === currentUser.id),
    [state.requests, currentUser.id],
  )

  const reviews = useMemo(
    () =>
      state.reviews
        .filter((r) => r.toId === currentUser.id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.reviews, currentUser.id],
  )

  // While redirecting old tabs, avoid flashing the profile.
  if (
    rawTab === 'profile' ||
    rawTab === 'helper' ||
    rawTab === 'notifications' ||
    ACTIVITY_TABS.includes(rawTab as (typeof ACTIVITY_TABS)[number])
  ) {
    return (
      <div className="beam-container pb-10 pt-6 sm:pt-8" data-testid="you-page-redirecting">
        <p className="text-[14px] text-[#4A5568]">Opening…</p>
      </div>
    )
  }

  return (
    <div className="beam-container pb-10 pt-6 sm:pt-8" data-testid="you-page-shell">
      <HelperProfileBody
        person={currentUser}
        reviews={reviews}
        variant="own"
        jobsPosted={myRequests.length}
      />
    </div>
  )
}
