'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getCategory, whenLabel } from '@/data/categories'
import { loadState, resetState, saveState, uid } from '@/data/storage'
import { resolveBeamMode, type BeamMode } from '@/lib/config'
import {
  acceptLiveOffer,
  completeLiveRequest,
  createLiveOffer,
  withdrawLiveOffer,
  createLiveRequest,
  ensureLiveDirectThread,
  ensureLiveThread,
  ensureProfile,
  inviteLiveHelper,
  loadLiveState,
  loadPublicLiveMarketplace,
  markAllLiveNotificationsRead,
  markLiveNotificationRead,
  confirmLiveHelperHomeLocation,
  reviewLiveHelperVerification,
  sendLiveMessage,
  submitLiveReview,
  toggleLiveSavedHelper,
  updateLiveProfile,
  BeamBackendError,
  type CreateRequestInput,
  type ConfirmHomeLocationResult,
} from '@/lib/beam/liveRepository'
import { canMakeOffer } from '@/lib/verification/status'
import { createClient } from '@/lib/supabase/client'
import { profileSeedFromUser } from '@/lib/auth/profileSeed'
import { redirectThroughSignOut } from '@/lib/auth/performSignOut'
import { mapProfile } from '@/lib/beam/mappers'
import type {
  AccountRole,
  AppState,
  AvailabilitySlot,
  BeamNotification,
  BudgetType,
  CategoryId,
  HelperVerification,
  HelpRequest,
  NeighborhoodId,
  Offer,
  Person,
  RequestInvite,
  Review,
  WhenOption,
} from '@/types'

export type PostRequestInput = {
  title: string
  details: string
  category: CategoryId
  categoryCustom?: string | null
  neighborhood?: NeighborhoodId | ''
  when: WhenOption
  whenLabel?: string
  budget: number
  locationLabel?: string
  lat?: number | null
  lng?: number | null
  radiusMiles?: number
  exactAddress?: string
  budgetType?: BudgetType
  scheduledFor?: string | null
  scheduledEnd?: string | null
  preferredHelperId?: string | null
  image?: string
  images?: string[]
  isUrgent?: boolean
}

interface BeamContextValue {
  mode: BeamMode
  ready: boolean
  authUser: User | null
  backendError: string | null
  state: AppState
  currentUser: Person
  refresh: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    name: string,
    options?: {
      neighborhood?: NeighborhoodId | ''
      locationLabel?: string
      emailRedirectTo?: string
    },
  ) => Promise<{ needsEmailConfirmation: boolean }>
  signInWithGoogle: (redirectTo: string) => Promise<void>
  resendSignupConfirmation: (email: string) => Promise<void>
  signOut: () => Promise<void>
  clearBackendError: () => void
  resetDemo: () => void
  updateProfile: (patch: Partial<Person>) => void
  completeOnboarding: (input: {
    role: AccountRole
    city: string
    stateCode: string
    safetyVersion?: string
  }) => Promise<void>
  /** @deprecated Prefer postRequest */
  createRequest: (input: PostRequestInput) => HelpRequest | Promise<HelpRequest>
  postRequest: (input: PostRequestInput) => HelpRequest | Promise<HelpRequest>
  createOffer: (input: {
    requestId: string
    price: number
    note: string
    eta: string
  }) => Offer | Promise<Offer>
  /** Helper withdraws their own pending offer. */
  withdrawOffer: (offerId: string) => void | Promise<void>
  acceptOffer: (offerId: string) => void | Promise<void>
  markComplete: (requestId: string) => void | Promise<void>
  addReview: (input: {
    requestId: string
    toId: string
    rating: number
    comment: string
  }) => Review | Promise<Review>
  ensureThread: (requestId: string, otherUserId: string) => string | Promise<string>
  /** Open or reopen a direct (jobless) DM with another user. */
  ensureDirectThread: (otherUserId: string) => string | Promise<string>
  sendMessage: (
    threadId: string,
    body: string,
    opts?: { simulateReply?: boolean },
  ) => void | Promise<void>
  inviteHelper: (
    requestId: string,
    helperId: string,
    note?: string,
  ) => Promise<{ invite: RequestInvite; threadId: string }>
  toggleSavedHelper: (helperId: string) => void | Promise<void>
  markNotificationRead: (notificationId: string) => void | Promise<void>
  /** Mark several notifications read in one pass (one demo state update, one live refresh). */
  markNotificationsRead: (notificationIds: string[]) => void | Promise<void>
  markAllNotificationsRead: () => void | Promise<void>
  getPerson: (id: string) => Person | undefined
  getRequest: (id: string) => HelpRequest | undefined
  helperVerification: HelperVerification | null
  isBeamStaff: boolean
  confirmHelperHomeLocation: (input: {
    email: string
    street: string
    apt?: string
    city: string
    stateCode: string
    zip: string
    deviceLat: number
    deviceLng: number
    deviceAccuracyM: number
  }) => Promise<ConfirmHomeLocationResult>
  reviewHelperVerification: (input: {
    profileId: string
    approve: boolean
    reason?: string
  }) => Promise<HelperVerification>
  /** Demo/QA only: force the current helper verification gate state. */
  setDemoHelperVerification: (
    next:
      | HelperVerification
      | null
      | 'unverified'
      | 'pending'
      | 'needs_resubmission'
      | 'approved',
  ) => void
}

const BeamContext = createContext<BeamContextValue | null>(null)

const HELPER_REPLIES = [
  'Sounds good — I can make that work.',
  'Got it. I’ll confirm once I’m headed over.',
  'Perfect. Any parking tips near you?',
  'Thanks for the details. See you then!',
  'All set on my end. Message if anything changes.',
]

function withState(
  setState: Dispatch<SetStateAction<AppState | null>>,
  updater: (prev: AppState) => AppState,
) {
  setState((prev) => (prev ? updater(prev) : prev))
}

function emptyLiveState(userId: string): AppState {
  return {
    version: 1,
    currentUserId: userId,
    people: [],
    requests: [],
    offers: [],
    threads: [],
    messages: [],
    reviews: [],
    invites: [],
    savedHelperIds: [],
    notifications: [],
    helperVerification: null,
    helperVerifications: [],
    isBeamStaff: false,
  }
}

function guestStubPerson(): Person {
  return {
    id: 'anonymous',
    name: 'Guest',
    avatar: '',
    bio: '',
    neighborhood: '',
    skills: [],
    hourlyRate: 0,
    availability: [],
    rating: 0,
    reviewCount: 0,
    jobsCompleted: 0,
    locationLabel: '',
    isHelper: false,
    accountRole: null,
    onboardingCompletedAt: null,
  }
}

function noopAsync() {
  return Promise.resolve()
}

export function BeamProvider({
  children,
  nonBlocking = false,
}: {
  children: ReactNode
  /** When true, render children during boot with a provisional guest context (marketing SSR). */
  nonBlocking?: boolean
}) {
  const [mode] = useState<BeamMode>(() => resolveBeamMode())
  const [state, setState] = useState<AppState | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [booting, setBooting] = useState(true)
  const stateRef = useRef<AppState | null>(null)
  /** When true, ignore auth-state churn so Layout does not flash public chrome mid-logout. */
  const signingOutRef = useRef(false)
  stateRef.current = state

  const reportError = useCallback((err: unknown, fallback: string) => {
    const message =
      err instanceof BeamBackendError
        ? err.message
        : err instanceof Error
          ? err.message
          : typeof err === 'object' &&
              err !== null &&
              'message' in err &&
              typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message
            : fallback
    setBackendError(message)
    throw err instanceof Error ? err : new Error(message)
  }, [])

  const refreshLive = useCallback(async (userId: string) => {
    const client = createClient()
    const next = await loadLiveState(client, userId)
    setState(next)
    return next
  }, [])

  const refreshPublic = useCallback(async () => {
    const client = createClient()
    const next = await loadPublicLiveMarketplace(client)
    setState(next)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        if (mode === 'demo') {
          setState(loadState())
          setAuthUser(null)
          return
        }

        if (mode === 'unconfigured') {
          setBackendError(
            'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or set NEXT_PUBLIC_BEAM_DEMO_MODE=1 for local demo.',
          )
          setState(null)
          return
        }

        const client = createClient()
        const { data, error } = await client.auth.getSession()
        if (error) throw error
        if (cancelled) return

        const session = data.session
        setAuthUser(session?.user ?? null)
        if (!session?.user) {
          // CRITICAL: hydrate sanitized public marketplace for signed-out guests
          const publicState = await loadPublicLiveMarketplace(client)
          if (!cancelled) setState(publicState)
          return
        }

        await ensureProfile(client, session.user.id, profileSeedFromUser(session.user))
        const next = await loadLiveState(client, session.user.id)
        if (!cancelled) setState(next)
      } catch (err) {
        if (!cancelled) {
          setBackendError(err instanceof Error ? err.message : 'Failed to start HouseCall backend')
          setState(null)
        }
      } finally {
        if (!cancelled) setBooting(false)
      }
    }

    void boot()

    if (mode !== 'live')
      return () => {
        cancelled = true
      }

    const client = createClient()
    const { data: sub } = client.auth.onAuthStateChange(async (_event, session: Session | null) => {
      // Sign-out navigates away via /auth/signout; skip public-marketplace hydrate
      // so guests are never stranded on the prior route in landing chrome.
      if (signingOutRef.current) return
      try {
        setAuthUser(session?.user ?? null)
        if (!session?.user) {
          const publicState = await loadPublicLiveMarketplace(client)
          setState(publicState)
          return
        }
        await ensureProfile(client, session.user.id, profileSeedFromUser(session.user))
        const next = await loadLiveState(client, session.user.id)
        setState(next)
        setBackendError(null)
      } catch (err) {
        setBackendError(err instanceof Error ? err.message : 'Auth state sync failed')
        setState(null)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'demo' || !state) return
    saveState(state)
  }, [mode, state])

  const currentUser = useMemo(() => {
    if (!state) return null
    const user = state.people.find((p) => p.id === state.currentUserId)
    if (!user) return null
    return user
  }, [state])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = createClient()
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) reportError(error, 'Sign in failed')
    },
    [reportError],
  )

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      options?: {
        neighborhood?: NeighborhoodId | ''
        locationLabel?: string
        emailRedirectTo?: string
      },
    ) => {
      const client = createClient()
      const locationLabel = options?.locationLabel?.trim() || ''
      const neighborhood = options?.neighborhood || ''
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            location_label: locationLabel,
            ...(neighborhood ? { neighborhood } : {}),
          },
          emailRedirectTo: options?.emailRedirectTo,
        },
      })
      if (error) reportError(error, 'Sign up failed')
      if (data.session?.user) {
        await ensureProfile(
          client,
          data.session.user.id,
          profileSeedFromUser(data.session.user, { name, neighborhood, locationLabel }),
        )
      }
      return { needsEmailConfirmation: !data.session }
    },
    [reportError],
  )

  const signInWithGoogle = useCallback(
    async (redirectTo: string) => {
      const client = createClient()
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) reportError(error, 'Google sign-in failed')
    },
    [reportError],
  )

  const resendSignupConfirmation = useCallback(
    async (email: string) => {
      const client = createClient()
      const { error } = await client.auth.resend({ type: 'signup', email })
      if (error) reportError(error, 'Could not resend confirmation email')
    },
    [reportError],
  )

  const signOut = useCallback(async () => {
    // Freeze auth UI updates, then hard-navigate immediately through `/auth/signout`.
    // The server route clears Supabase cookies and 303s to a clean `/auth`.
    // Do not await client.auth.signOut() first — that can clear authUser / re-render
    // AuthGate on the prior protected route and flash a secondary auth UI before
    // navigation finishes.
    signingOutRef.current = true
    if (mode === 'demo') {
      setAuthUser(null)
      setState(null)
    }
    redirectThroughSignOut()
  }, [mode])

  const resetDemo = useCallback(() => {
    if (mode !== 'demo') {
      setBackendError('Reset demo is only available in local demo mode.')
      return
    }
    setState(resetState())
  }, [mode])

  const updateProfile = useCallback(
    (patch: Partial<Person>) => {
      if (mode === 'live') {
        void (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            await updateLiveProfile(client, authUser.id, patch)
            await refreshLive(authUser.id)
          } catch (err) {
            reportError(err, 'Update profile failed')
          }
        })()
        return
      }
      withState(setState, (prev) => ({
        ...prev,
        people: prev.people.map((p) =>
          p.id === prev.currentUserId
            ? {
                ...p,
                ...patch,
                id: p.id,
                isCurrentUser: true,
                isHelper:
                  patch.isHelper ??
                  (patch.skills !== undefined ? patch.skills.length > 0 : p.isHelper),
              }
            : p,
        ),
      }))
    },
    [authUser, mode, refreshLive, reportError],
  )

  const completeOnboarding = useCallback(
    async (input: {
      role: AccountRole
      city: string
      stateCode: string
      safetyVersion?: string
    }) => {
      const safetyVersion = input.safetyVersion || 'v1'
      const now = new Date().toISOString()
      const locationLabel = `${input.city}, ${input.stateCode}`

      if (mode === 'live') {
        try {
          if (!authUser) throw new Error('Not signed in')
          const client = createClient()
          await ensureProfile(client, authUser.id, profileSeedFromUser(authUser))
          const { data, error } = await client.rpc('complete_onboarding', {
            p_role: input.role,
            p_city: input.city,
            p_state_code: input.stateCode,
            p_accept_safety: true,
            p_safety_version: safetyVersion,
          })
          if (error) throw error
          if (!data) throw new Error('Onboarding did not return a profile')

          const mapped = mapProfile(data, authUser.id)
          // Patch BeamContext immediately so AuthGate sees onboardingCompletedAt
          // before navigation — avoids a redirect loop back to /onboarding.
          setState((prev) => {
            if (!prev) return prev
            const others = prev.people.filter((p) => p.id !== mapped.id)
            return {
              ...prev,
              people: [...others, { ...mapped, isCurrentUser: true }],
            }
          })
          await refreshLive(authUser.id)
          return
        } catch (err) {
          reportError(err, 'Could not complete onboarding')
          return
        }
      }

      // Demo / preview: persist locally and continue to browse.
      // Mirror live defaults: main onboarding never lists you as a helper —
      // /onboarding/helper sets isHelper after skills & rate are saved.
      withState(setState, (prev) => ({
        ...prev,
        people: prev.people.map((p) =>
          p.id === prev.currentUserId
            ? {
                ...p,
                accountRole: input.role,
                city: input.city,
                stateCode: input.stateCode,
                locationLabel,
                onboardingCompletedAt: p.onboardingCompletedAt ?? now,
                safetyDisclaimerAcceptedAt: now,
                safetyDisclaimerVersion: safetyVersion,
                isHelper: false,
                isCurrentUser: true,
              }
            : p,
        ),
      }))
    },
    [authUser, mode, refreshLive, reportError],
  )

  const postRequest = useCallback(
    (input: PostRequestInput) => {
      const budgetType = input.budgetType ?? (input.budget === 0 ? 'open' : 'fixed')
      const images = (input.images ?? [])
        .filter((u) => typeof u === 'string' && u.trim().length > 0)
        .slice(0, 5)
      const image = images[0] || input.image || getCategory(input.category).image || ''
      const label = input.whenLabel ?? whenLabel(input.when)

      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            const payload: CreateRequestInput = {
              title: input.title,
              details: input.details,
              category: input.category,
              categoryCustom: input.category === 'other' ? input.categoryCustom ?? null : null,
              neighborhood: input.neighborhood ?? '',
              when: input.when,
              whenLabel: label,
              budget: budgetType === 'open' ? 0 : input.budget,
              image,
              images,
              locationLabel: input.locationLabel,
              lat: input.lat,
              lng: input.lng,
              radiusMiles: input.radiusMiles,
              exactAddress: input.exactAddress,
              budgetType,
              scheduledFor: input.scheduledFor,
              scheduledEnd: input.scheduledEnd,
              preferredHelperId: input.preferredHelperId,
              isUrgent: Boolean(input.isUrgent),
            }
            const created = await createLiveRequest(client, authUser.id, payload)
            await refreshLive(authUser.id)
            return created
          } catch (err) {
            reportError(err, 'Create request failed')
            throw err
          }
        })()
      }

      let created!: HelpRequest
      withState(setState, (prev) => {
        created = {
          id: uid('req'),
          title: input.title.trim(),
          details: input.details.trim(),
          category: input.category,
          categoryCustom:
            input.category === 'other' ? input.categoryCustom?.trim() || null : null,
          neighborhood: input.neighborhood ?? '',
          when: input.when,
          whenLabel: label,
          budget: budgetType === 'open' ? 0 : input.budget,
          budgetType,
          status: 'open',
          requesterId: prev.currentUserId,
          image,
          images,
          createdAt: new Date().toISOString(),
          locationLabel: input.locationLabel?.trim() || '',
          exactAddress: input.exactAddress?.trim() || undefined,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          radiusMiles: input.radiusMiles ?? 5,
          scheduledFor: input.scheduledFor ?? null,
          scheduledEnd: input.scheduledEnd ?? null,
          preferredHelperId: input.preferredHelperId ?? null,
          isUrgent: Boolean(input.isUrgent),
          // Demo has no Twilio; show a sample count so poster feedback UI is visible.
          urgentHelpersNotifiedCount: input.isUrgent ? 3 : 0,
        }
        let next: AppState = { ...prev, requests: [created, ...prev.requests] }
        if (input.preferredHelperId) {
          const invite: RequestInvite = {
            id: uid('inv'),
            requestId: created.id,
            requesterId: prev.currentUserId,
            helperId: input.preferredHelperId,
            note: '',
            status: 'pending',
            createdAt: new Date().toISOString(),
          }
          const threadId = uid('th')
          const msgBody = `Hi! I just posted "${created.title}" and would love your help if you are available.`
          next = {
            ...next,
            invites: [invite, ...next.invites],
            threads: [
              {
                id: threadId,
                requestId: created.id,
                participantIds: [prev.currentUserId, input.preferredHelperId],
                lastMessageAt: invite.createdAt,
              },
              ...next.threads,
            ],
            messages: [
              ...next.messages,
              {
                id: uid('msg'),
                threadId,
                requestId: created.id,
                senderId: prev.currentUserId,
                body: msgBody,
                createdAt: invite.createdAt,
              },
            ],
            notifications: [
              {
                id: uid('notif'),
                userId: input.preferredHelperId,
                kind: 'invite',
                title: `${prev.people.find((p) => p.id === prev.currentUserId)?.name ?? 'A neighbor'} invited you to help`,
                body: created.title,
                href: `/requests/${created.id}`,
                requestId: created.id,
                readAt: null,
                createdAt: invite.createdAt,
              },
              ...next.notifications,
            ],
          }
        }
        return next
      })
      return created
    },
    [authUser, mode, refreshLive, reportError],
  )

  const createRequest = postRequest

  const createOffer = useCallback(
    (input: { requestId: string; price: number; note: string; eta: string }) => {
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            const offer = await createLiveOffer(client, authUser.id, input)
            await refreshLive(authUser.id)
            return offer
          } catch (err) {
            reportError(err, 'Create offer failed')
            throw err
          }
        })()
      }

      const verification = stateRef.current?.helperVerification
      if (!canMakeOffer(verification)) {
        const status = verification?.status
        const message =
          status === 'pending'
            ? "HouseCall still needs to confirm you're at your home address. You can offer once you're verified."
            : status === 'needs_resubmission'
              ? 'HouseCall needs you to confirm your home address again before you can make an offer.'
              : "To make an offer, HouseCall has to confirm you're at your home address. You need to be home for this check."
        const err = new Error(message)
        setBackendError(message)
        throw err
      }

      const offer: Offer = {
        id: uid('off'),
        requestId: input.requestId,
        helperId: '',
        price: input.price,
        note: input.note.trim(),
        eta: input.eta.trim() || 'Flexible',
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      withState(setState, (prev) => {
        const full = { ...offer, helperId: prev.currentUserId }
        const withoutMine = prev.offers.filter(
          (o) => !(o.requestId === input.requestId && o.helperId === prev.currentUserId),
        )
        const req = prev.requests.find((r) => r.id === input.requestId)
        const notif: BeamNotification | null = req
          ? {
              id: uid('notif'),
              userId: req.requesterId,
              kind: 'new_offer',
              title: 'New offer received',
              body: `$${full.price} · ${full.eta}`,
              href: `/requests/${req.id}`,
              requestId: req.id,
              readAt: null,
              createdAt: full.createdAt,
            }
          : null
        return {
          ...prev,
          offers: [full, ...withoutMine],
          notifications: notif ? [notif, ...prev.notifications] : prev.notifications,
        }
      })
      return offer
    },
    [authUser, mode, refreshLive, reportError],
  )

  const withdrawOffer = useCallback(
    (offerId: string) => {
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            await withdrawLiveOffer(client, authUser.id, offerId)
            await refreshLive(authUser.id)
          } catch (err) {
            reportError(err, 'Cancel offer failed')
            throw err
          }
        })()
      }

      withState(setState, (prev) => ({
        ...prev,
        offers: prev.offers.map((o) =>
          o.id === offerId && o.helperId === prev.currentUserId && o.status === 'pending'
            ? { ...o, status: 'withdrawn' as const }
            : o,
        ),
      }))
    },
    [authUser, mode, refreshLive, reportError],
  )

  const acceptOffer = useCallback(
    (offerId: string) => {
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            const { data: offerRow } = await client
              .from('offers')
              .select('request_id, helper_id')
              .eq('id', offerId)
              .maybeSingle()
            await acceptLiveOffer(client, offerId)
            if (offerRow) {
              try {
                void fetch('/api/urgent-jobs/taken', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    requestId: offerRow.request_id,
                    acceptedHelperId: offerRow.helper_id,
                  }),
                })
              } catch {
                /* best-effort SMS */
              }
            }
            await refreshLive(authUser.id)
          } catch (err) {
            reportError(err, 'Accept offer failed')
          }
        })()
      }

      withState(setState, (prev) => {
        const offer = prev.offers.find((o) => o.id === offerId)
        if (!offer) return prev
        const offers = prev.offers.map((o) => {
          if (o.id === offerId) return { ...o, status: 'accepted' as const }
          if (o.requestId === offer.requestId && o.status === 'pending') {
            return { ...o, status: 'declined' as const }
          }
          return o
        })
        const requests = prev.requests.map((r) =>
          r.id === offer.requestId
            ? {
                ...r,
                status: 'accepted' as const,
                acceptedOfferId: offer.id,
                helperId: offer.helperId,
              }
            : r,
        )
        const participants = [
          prev.requests.find((r) => r.id === offer.requestId)!.requesterId,
          offer.helperId,
        ] as [string, string]
        let threads = prev.threads
        const existing = threads.find(
          (t) =>
            t.requestId === offer.requestId &&
            t.participantIds.includes(participants[0]) &&
            t.participantIds.includes(participants[1]),
        )
        if (!existing) {
          threads = [
            {
              id: uid('th'),
              requestId: offer.requestId,
              participantIds: participants,
              lastMessageAt: new Date().toISOString(),
            },
            ...threads,
          ]
        }
        const systemMsg = {
          id: uid('msg'),
          threadId: (existing ?? threads[0]).id,
          requestId: offer.requestId,
          senderId: prev.currentUserId,
          body: `Offer accepted at $${offer.price}. Let’s coordinate timing here.`,
          createdAt: new Date().toISOString(),
        }
        const notif: BeamNotification = {
          id: uid('notif'),
          userId: offer.helperId,
          kind: 'offer_accepted',
          title: 'Your offer was accepted',
          body: `$${offer.price} · ${offer.eta}`,
          href: `/requests/${offer.requestId}`,
          requestId: offer.requestId,
          readAt: null,
          createdAt: systemMsg.createdAt,
        }
        return {
          ...prev,
          offers,
          requests,
          threads,
          messages: [...prev.messages, systemMsg],
          notifications: [notif, ...prev.notifications],
        }
      })
    },
    [authUser, mode, refreshLive, reportError],
  )

  const markComplete = useCallback(
    (requestId: string) => {
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            await completeLiveRequest(client, requestId)
            await refreshLive(authUser.id)
          } catch (err) {
            reportError(err, 'Complete request failed')
          }
        })()
      }
      withState(setState, (prev) => {
        const req = prev.requests.find((r) => r.id === requestId)
        const otherId =
          req?.helperId === prev.currentUserId ? req.requesterId : req?.helperId
        const notif: BeamNotification | null =
          otherId
            ? {
                id: uid('notif'),
                userId: otherId,
                kind: 'job_completed',
                title: 'Job marked complete',
                body: req?.title ?? 'A job was completed',
                href: `/requests/${requestId}`,
                requestId,
                readAt: null,
                createdAt: new Date().toISOString(),
              }
            : null
        return {
          ...prev,
          requests: prev.requests.map((r) =>
            r.id === requestId ? { ...r, status: 'completed' as const } : r,
          ),
          notifications: notif ? [notif, ...prev.notifications] : prev.notifications,
        }
      })
    },
    [authUser, mode, refreshLive, reportError],
  )

  const addReview = useCallback(
    (input: { requestId: string; toId: string; rating: number; comment: string }) => {
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            const review = await submitLiveReview(client, input)
            await refreshLive(authUser.id)
            return review
          } catch (err) {
            reportError(err, 'Submit review failed')
            throw err
          }
        })()
      }

      const review: Review = {
        id: uid('rev'),
        requestId: input.requestId,
        fromId: '',
        toId: input.toId,
        rating: input.rating,
        comment: input.comment.trim(),
        createdAt: new Date().toISOString(),
      }
      withState(setState, (prev) => {
        const full = { ...review, fromId: prev.currentUserId }
        const people = prev.people.map((p) => {
          if (p.id !== input.toId) return p
          const nextCount = p.reviewCount + 1
          const nextRating = (p.rating * p.reviewCount + input.rating) / nextCount
          return {
            ...p,
            reviewCount: nextCount,
            rating: Math.round(nextRating * 10) / 10,
            jobsCompleted: p.jobsCompleted + (p.id !== prev.currentUserId ? 1 : 0),
          }
        })
        const notif: BeamNotification = {
          id: uid('notif'),
          userId: input.toId,
          kind: 'new_review',
          title: 'You received a review',
          body: `${input.rating}★ · ${input.comment.trim().slice(0, 80)}`,
          href: `/requests/${input.requestId}`,
          requestId: input.requestId,
          readAt: null,
          createdAt: full.createdAt,
        }
        return {
          ...prev,
          reviews: [full, ...prev.reviews],
          people,
          notifications: [notif, ...prev.notifications],
        }
      })
      return review
    },
    [authUser, mode, refreshLive, reportError],
  )

  const ensureThread = useCallback(
    (requestId: string, otherUserId: string) => {
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            const id = await ensureLiveThread(client, requestId, otherUserId)
            await refreshLive(authUser.id)
            return id
          } catch (err) {
            reportError(err, 'Open thread failed')
            throw err
          }
        })()
      }

      const prev = stateRef.current
      if (!prev) return uid('th')
      const existing = prev.threads.find(
        (t) =>
          t.requestId === requestId &&
          t.participantIds.includes(prev.currentUserId) &&
          t.participantIds.includes(otherUserId),
      )
      if (existing) return existing.id
      const id = uid('th')
      withState(setState, (current) => {
        const live = current.threads.find(
          (t) =>
            t.requestId === requestId &&
            t.participantIds.includes(current.currentUserId) &&
            t.participantIds.includes(otherUserId),
        )
        if (live) return current
        return {
          ...current,
          threads: [
            {
              id,
              requestId,
              participantIds: [current.currentUserId, otherUserId],
              lastMessageAt: new Date().toISOString(),
            },
            ...current.threads,
          ],
        }
      })
      return id
    },
    [authUser, mode, refreshLive, reportError],
  )

  const ensureDirectThread = useCallback(
    (otherUserId: string) => {
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            const id = await ensureLiveDirectThread(client, otherUserId)
            await refreshLive(authUser.id)
            return id
          } catch (err) {
            reportError(err, 'Open direct thread failed')
            throw err
          }
        })()
      }

      const prev = stateRef.current
      if (!prev) return uid('th')
      const existing = prev.threads.find(
        (t) =>
          t.requestId == null &&
          t.participantIds.includes(prev.currentUserId) &&
          t.participantIds.includes(otherUserId),
      )
      if (existing) return existing.id
      const id = uid('th')
      withState(setState, (current) => {
        const live = current.threads.find(
          (t) =>
            t.requestId == null &&
            t.participantIds.includes(current.currentUserId) &&
            t.participantIds.includes(otherUserId),
        )
        if (live) return current
        return {
          ...current,
          threads: [
            {
              id,
              requestId: null,
              participantIds: [current.currentUserId, otherUserId] as [string, string],
              lastMessageAt: new Date().toISOString(),
            },
            ...current.threads,
          ],
        }
      })
      return id
    },
    [authUser, mode, refreshLive, reportError],
  )

  const sendMessage = useCallback(
    (threadId: string, body: string, opts?: { simulateReply?: boolean }) => {
      const trimmed = body.trim()
      if (!trimmed) return

      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            await sendLiveMessage(client, authUser.id, threadId, trimmed)
            await refreshLive(authUser.id)
          } catch (err) {
            reportError(err, 'Send message failed')
          }
        })()
      }

      withState(setState, (prev) => {
        const thread = prev.threads.find((t) => t.id === threadId)
        if (!thread) return prev
        const msg = {
          id: uid('msg'),
          threadId,
          requestId: thread.requestId,
          senderId: prev.currentUserId,
          body: trimmed,
          createdAt: new Date().toISOString(),
        }
        const otherId = thread.participantIds.find((id) => id !== prev.currentUserId)
        const notif: BeamNotification | null = otherId
          ? {
              id: uid('notif'),
              userId: otherId,
              kind: 'new_message',
              title: 'New message',
              body: trimmed.slice(0, 100),
              href: `/messages/${threadId}`,
              requestId: thread.requestId,
              readAt: null,
              createdAt: msg.createdAt,
            }
          : null
        return {
          ...prev,
          messages: [...prev.messages, msg],
          threads: prev.threads.map((t) =>
            t.id === threadId ? { ...t, lastMessageAt: msg.createdAt } : t,
          ),
          notifications: notif ? [notif, ...prev.notifications] : prev.notifications,
        }
      })

      if (opts?.simulateReply) {
        window.setTimeout(() => {
          withState(setState, (prev) => {
            const thread = prev.threads.find((t) => t.id === threadId)
            if (!thread) return prev
            const otherId = thread.participantIds.find((id) => id !== prev.currentUserId)
            if (!otherId) return prev
            const reply = {
              id: uid('msg'),
              threadId,
              requestId: thread.requestId,
              senderId: otherId,
              body: HELPER_REPLIES[Math.floor(Math.random() * HELPER_REPLIES.length)],
              createdAt: new Date().toISOString(),
              isSimulated: true,
            }
            return {
              ...prev,
              messages: [...prev.messages, reply],
              threads: prev.threads.map((t) =>
                t.id === threadId ? { ...t, lastMessageAt: reply.createdAt } : t,
              ),
            }
          })
        }, 1400 + Math.random() * 1200)
      }
    },
    [authUser, mode, refreshLive, reportError],
  )

  const inviteHelper = useCallback(
    async (requestId: string, helperId: string, note = '') => {
      if (mode === 'live') {
        try {
          if (!authUser) throw new Error('Not signed in')
          const client = createClient()
          const invite = await inviteLiveHelper(client, requestId, helperId, note)
          await refreshLive(authUser.id)
          const thread = stateRef.current?.threads.find(
            (t) =>
              t.requestId === requestId &&
              t.participantIds.includes(helperId) &&
              t.participantIds.includes(authUser.id),
          )
          return { invite, threadId: thread?.id ?? '' }
        } catch (err) {
          reportError(err, 'Invite helper failed')
          throw err
        }
      }

      const createdAt = new Date().toISOString()
      let invite!: RequestInvite
      let threadId = ''
      withState(setState, (prev) => {
        const existing = prev.invites.find(
          (i) => i.requestId === requestId && i.helperId === helperId,
        )
        invite =
          existing ??
          ({
            id: uid('inv'),
            requestId,
            requesterId: prev.currentUserId,
            helperId,
            note: note.trim(),
            status: 'pending',
            createdAt,
          } satisfies RequestInvite)

        const existingThread = prev.threads.find(
          (t) =>
            t.requestId === requestId &&
            t.participantIds.includes(prev.currentUserId) &&
            t.participantIds.includes(helperId),
        )
        threadId = existingThread?.id ?? uid('th')
        const req = prev.requests.find((r) => r.id === requestId)
        const msgBody =
          note.trim() ||
          `Hi! I just posted "${req?.title ?? 'a task'}" and would love your help if you are available.`

        let threads = prev.threads
        let messages = prev.messages
        if (!existingThread) {
          threads = [
            {
              id: threadId,
              requestId,
              participantIds: [prev.currentUserId, helperId],
              lastMessageAt: createdAt,
            },
            ...threads,
          ]
        }
        messages = [
          ...messages,
          {
            id: uid('msg'),
            threadId,
            requestId,
            senderId: prev.currentUserId,
            body: msgBody,
            createdAt,
          },
        ]

        // Simulated helper reply
        window.setTimeout(() => {
          withState(setState, (s) => ({
            ...s,
            messages: [
              ...s.messages,
              {
                id: uid('msg'),
                threadId,
                requestId,
                senderId: helperId,
                body: 'Thanks for the invite — I’ll take a look and send an offer shortly!',
                createdAt: new Date().toISOString(),
                isSimulated: true,
              },
            ],
          }))
        }, 1600)

        const me = prev.people.find((p) => p.id === prev.currentUserId)
        const notif: BeamNotification = {
          id: uid('notif'),
          userId: helperId,
          kind: 'invite',
          title: `${me?.name ?? 'A neighbor'} invited you to help`,
          body: req?.title ?? 'New invite',
          href: `/requests/${requestId}`,
          requestId,
          readAt: null,
          createdAt,
        }

        return {
          ...prev,
          invites: existing ? prev.invites : [invite, ...prev.invites],
          threads,
          messages,
          notifications: [notif, ...prev.notifications],
        }
      })
      return { invite, threadId }
    },
    [authUser, mode, refreshLive, reportError],
  )

  const toggleSavedHelper = useCallback(
    (helperId: string) => {
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            const currentlySaved = Boolean(
              stateRef.current?.savedHelperIds.includes(helperId),
            )
            await toggleLiveSavedHelper(client, authUser.id, helperId, currentlySaved)
            await refreshLive(authUser.id)
          } catch (err) {
            reportError(err, 'Toggle saved helper failed')
          }
        })()
      }
      withState(setState, (prev) => {
        const saved = prev.savedHelperIds.includes(helperId)
        return {
          ...prev,
          savedHelperIds: saved
            ? prev.savedHelperIds.filter((id) => id !== helperId)
            : [...prev.savedHelperIds, helperId],
        }
      })
    },
    [authUser, mode, refreshLive, reportError],
  )

  const markNotificationRead = useCallback(
    (notificationId: string) => {
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            await markLiveNotificationRead(client, notificationId)
            await refreshLive(authUser.id)
          } catch (err) {
            reportError(err, 'Mark notification read failed')
          }
        })()
      }
      withState(setState, (prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === notificationId ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
        ),
      }))
    },
    [authUser, mode, refreshLive, reportError],
  )

  const markNotificationsRead = useCallback(
    (notificationIds: string[]) => {
      const ids = [...new Set(notificationIds.filter(Boolean))]
      if (!ids.length) return
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            await Promise.all(ids.map((id) => markLiveNotificationRead(client, id)))
            await refreshLive(authUser.id)
          } catch (err) {
            reportError(err, 'Mark notifications read failed')
          }
        })()
      }
      const now = new Date().toISOString()
      const idSet = new Set(ids)
      withState(setState, (prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          idSet.has(n.id) ? { ...n, readAt: n.readAt ?? now } : n,
        ),
      }))
    },
    [authUser, mode, refreshLive, reportError],
  )

  const markAllNotificationsRead = useCallback(() => {
    if (mode === 'live') {
      return (async () => {
        try {
          if (!authUser) throw new Error('Not signed in')
          const client = createClient()
          await markAllLiveNotificationsRead(client)
          await refreshLive(authUser.id)
        } catch (err) {
          reportError(err, 'Mark all notifications read failed')
        }
      })()
    }
    const now = new Date().toISOString()
    withState(setState, (prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, readAt: n.readAt ?? now })),
    }))
  }, [authUser, mode, refreshLive, reportError])

  const getPerson = useCallback(
    (id: string) => state?.people.find((p) => p.id === id),
    [state?.people],
  )
  const getRequest = useCallback(
    (id: string) => state?.requests.find((r) => r.id === id),
    [state?.requests],
  )

  const confirmHelperHomeLocation = useCallback(
    async (input: {
      email: string
      street: string
      apt?: string
      city: string
      stateCode: string
      zip: string
      deviceLat: number
      deviceLng: number
      deviceAccuracyM: number
    }): Promise<ConfirmHomeLocationResult> => {
      if (mode === 'live') {
        try {
          if (!authUser) throw new Error('Not signed in')
          const client = createClient()
          const result = await confirmLiveHelperHomeLocation(client, input)

          // Apply RPC verification immediately so "You're verified" can show
          // even if a later helper_verifications SELECT fails (e.g. RLS).
          if (result.verification) {
            withState(setState, (s) => {
              const row = result.verification!
              const others = (s.helperVerifications ?? []).filter(
                (v) => v.profileId !== row.profileId,
              )
              return {
                ...s,
                helperVerification: row,
                helperVerifications: [row, ...others],
              }
            })
          }

          try {
            const next = await refreshLive(authUser.id)
            // Do not let a failed/empty refresh wipe a just-approved match.
            if (
              result.ok &&
              result.verification?.status === 'approved' &&
              next.helperVerification?.status !== 'approved'
            ) {
              withState(setState, (s) => {
                const row = result.verification!
                const others = (s.helperVerifications ?? []).filter(
                  (v) => v.profileId !== row.profileId,
                )
                return {
                  ...s,
                  helperVerification: row,
                  helperVerifications: [row, ...others],
                }
              })
            }
          } catch {
            // Keep the RPC-applied verification; confirm itself succeeded.
          }

          return result
        } catch (err) {
          reportError(err, 'Confirm home location failed')
          throw err
        }
      }

      const now = new Date().toISOString()
      const prev = stateRef.current
      const existing = prev?.helperVerification
      const w =
        typeof window !== 'undefined'
          ? (window as unknown as { __BEAM_DEMO_LOCATION_RESULT__?: string })
          : null
      const forced = w?.__BEAM_DEMO_LOCATION_RESULT__
      const result =
        forced === 'not_at_home' ||
        forced === 'weak_signal' ||
        forced === 'geocode_imprecise' ||
        forced === 'matched' ||
        forced === 'permission_denied' ||
        forced === 'rate_limited'
          ? forced
          : input.deviceAccuracyM > 250
            ? 'weak_signal'
            : 'matched'

      const row: HelperVerification = {
        id: existing?.id ?? uid('ver'),
        profileId: prev?.currentUserId ?? 'user-you',
        status: result === 'matched' ? 'approved' : 'unverified',
        email: input.email.trim().toLowerCase(),
        street: input.street.trim(),
        apt: input.apt?.trim() || null,
        city: input.city.trim(),
        stateCode: input.stateCode.trim().toUpperCase(),
        zip: input.zip.trim(),
        documentPath: null,
        documentName: null,
        lastCheckResult: result as HelperVerification['lastCheckResult'],
        lastCheckedAt: now,
        lastDeviceLat: input.deviceLat,
        lastDeviceLng: input.deviceLng,
        lastDeviceAccuracyM: input.deviceAccuracyM,
        lastDistanceM: result === 'matched' ? 12 : result === 'not_at_home' ? 1200 : null,
        geocodeQuality: 'range_interpolated',
        verificationMethod: result === 'matched' ? 'location' : null,
        reviewReason: null,
        reviewedBy: null,
        reviewedAt: result === 'matched' ? now : null,
        submittedAt: now,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }

      withState(setState, (s) => {
        const others = (s.helperVerifications ?? []).filter((v) => v.profileId !== row.profileId)
        const notifications =
          result === 'matched'
            ? [
                {
                  id: uid('notif'),
                  userId: row.profileId,
                  kind: 'verification_approved' as const,
                  title: 'You are verified',
                  body: "You're at this address, so you can make offers on local jobs right away.",
                  href: '/browse',
                  readAt: null,
                  createdAt: now,
                } satisfies BeamNotification,
                ...s.notifications,
              ]
            : s.notifications
        return {
          ...s,
          helperVerification: row,
          helperVerifications: [row, ...others],
          notifications,
        }
      })

      return {
        ok: result === 'matched',
        result,
        status: row.status,
        message:
          result === 'matched'
            ? null
            : result === 'not_at_home'
              ? "It looks like you're not at this address right now. Try again when you're home."
              : result === 'weak_signal'
                ? 'Location accuracy was too weak. Try again on your phone with location turned on.'
                : 'We could not confirm you are home. Try again when you are at this address.',
        distanceM: row.lastDistanceM ?? null,
        geocodeQuality: row.geocodeQuality ?? null,
        attemptId: uid('attempt'),
        verification: row,
      }
    },
    [authUser, mode, refreshLive, reportError],
  )

  const reviewHelperVerification = useCallback(
    async (input: { profileId: string; approve: boolean; reason?: string }) => {
      if (mode === 'live') {
        try {
          if (!authUser) throw new Error('Not signed in')
          const client = createClient()
          const row = await reviewLiveHelperVerification(client, input)
          await refreshLive(authUser.id)
          return row
        } catch (err) {
          reportError(err, 'Review verification failed')
          throw err
        }
      }

      if (!stateRef.current?.isBeamStaff) {
        throw new Error('Staff only')
      }
      const reason = input.reason?.trim() || ''
      if (!input.approve && !reason) {
        throw new Error('Tell the Helper why they should try again')
      }
      const now = new Date().toISOString()
      let updated: HelperVerification | null = null
      withState(setState, (s) => {
        const list = s.helperVerifications ?? []
        const nextList = list.map((v) => {
          if (
            v.profileId !== input.profileId ||
            !['unverified', 'pending', 'needs_resubmission'].includes(v.status)
          ) {
            return v
          }
          updated = {
            ...v,
            status: input.approve ? 'approved' : 'unverified',
            reviewReason: input.approve ? null : reason,
            reviewedBy: s.currentUserId,
            reviewedAt: now,
            verificationMethod: input.approve ? 'staff' : v.verificationMethod,
            updatedAt: now,
          }
          return updated
        })
        if (!updated) return s
        const notif: BeamNotification = {
          id: uid('notif'),
          userId: input.profileId,
          kind: input.approve ? 'verification_approved' : 'verification_needs_resubmission',
          title: input.approve ? 'You are verified' : 'Try home confirmation again',
          body: input.approve
            ? 'HouseCall verified your home address. You can make offers on local jobs now.'
            : reason,
          href: input.approve ? '/browse' : '/verify',
          readAt: null,
          createdAt: now,
        }
        return {
          ...s,
          helperVerifications: nextList,
          helperVerification:
            s.currentUserId === input.profileId ? updated : s.helperVerification,
          notifications:
            s.currentUserId === input.profileId
              ? [notif, ...s.notifications]
              : s.notifications,
        }
      })
      if (!updated) throw new Error('No reviewable verification for this Helper')
      return updated
    },
    [authUser, mode, refreshLive, reportError],
  )

  const setDemoHelperVerification = useCallback(
    (
      next:
        | HelperVerification
        | null
        | 'unverified'
        | 'pending'
        | 'needs_resubmission'
        | 'approved',
    ) => {
      if (mode !== 'demo') return
      withState(setState, (s) => {
        if (next === 'unverified' || next === null) {
          return {
            ...s,
            helperVerification: null,
            helperVerifications: (s.helperVerifications ?? []).filter(
              (v) => v.profileId !== s.currentUserId,
            ),
          }
        }
        const base: HelperVerification = {
          id: s.helperVerification?.id ?? uid('ver'),
          profileId: s.currentUserId,
          status: typeof next === 'string' ? next : next.status,
          email:
            (typeof next === 'string' ? s.helperVerification?.email : next.email) ||
            'alex.rivera@email.com',
          street:
            (typeof next === 'string' ? s.helperVerification?.street : next.street) ||
            '1842 Willow Street',
          apt: typeof next === 'string' ? s.helperVerification?.apt ?? null : next.apt ?? null,
          city: (typeof next === 'string' ? s.helperVerification?.city : next.city) || 'San Jose',
          stateCode:
            (typeof next === 'string' ? s.helperVerification?.stateCode : next.stateCode) || 'CA',
          zip: (typeof next === 'string' ? s.helperVerification?.zip : next.zip) || '95125',
          documentPath: null,
          documentName: null,
          lastCheckResult:
            typeof next === 'string'
              ? next === 'approved'
                ? 'matched'
                : next === 'pending' || next === 'needs_resubmission'
                  ? null
                  : 'not_at_home'
              : next.lastCheckResult ?? null,
          reviewReason:
            typeof next === 'string'
              ? next === 'needs_resubmission'
                ? 'Try again when you are home so we can confirm your address.'
                : null
              : next.reviewReason ?? null,
          reviewedBy: typeof next === 'string' ? null : next.reviewedBy ?? null,
          reviewedAt: typeof next === 'string' ? null : next.reviewedAt ?? null,
          verificationMethod:
            typeof next === 'string'
              ? next === 'approved'
                ? 'location'
                : null
              : next.verificationMethod ?? null,
          submittedAt: new Date().toISOString(),
          createdAt: s.helperVerification?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const row = typeof next === 'string' ? base : { ...base, ...next, profileId: s.currentUserId }
        const others = (s.helperVerifications ?? []).filter((v) => v.profileId !== s.currentUserId)
        return {
          ...s,
          helperVerification: row,
          helperVerifications: [row, ...others],
        }
      })
    },
    [mode],
  )

  const ready = !booting
  const helperVerification = state?.helperVerification ?? null
  const isBeamStaff = Boolean(state?.isBeamStaff)

  useEffect(() => {
    if (mode !== 'demo' || typeof window === 'undefined') return
    const w = window as unknown as {
      __BEAM_SET_DEMO_VERIFICATION__?: typeof setDemoHelperVerification
      __BEAM_CREATE_OFFER__?: typeof createOffer
    }
    w.__BEAM_SET_DEMO_VERIFICATION__ = setDemoHelperVerification
    w.__BEAM_CREATE_OFFER__ = createOffer
    return () => {
      delete w.__BEAM_SET_DEMO_VERIFICATION__
      delete w.__BEAM_CREATE_OFFER__
    }
  }, [mode, setDemoHelperVerification, createOffer])

  const sharedActions = {
    signIn,
    signUp,
    signInWithGoogle,
    resendSignupConfirmation,
    signOut,
    clearBackendError: () => setBackendError(null),
    resetDemo,
    updateProfile,
    completeOnboarding,
    createRequest,
    postRequest,
    createOffer,
    withdrawOffer,
    acceptOffer,
    markComplete,
    addReview,
    ensureThread,
    ensureDirectThread,
    sendMessage,
    inviteHelper,
    toggleSavedHelper,
    markNotificationRead,
    markNotificationsRead,
    markAllNotificationsRead,
    getPerson,
    getRequest,
    helperVerification,
    isBeamStaff,
    confirmHelperHomeLocation,
    reviewHelperVerification,
    setDemoHelperVerification,
  }

  if (booting) {
    if (nonBlocking) {
      const provisional: BeamContextValue = {
        mode,
        ready: false,
        authUser: null,
        backendError: null,
        state: emptyLiveState('anonymous'),
        currentUser: guestStubPerson(),
        refresh: noopAsync,
        ...sharedActions,
      }
      return <BeamContext.Provider value={provisional}>{children}</BeamContext.Provider>
    }
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F4F8FD] text-[#071330]">
        <p className="text-[22px] font-semibold tracking-tight text-[#071330]" aria-busy="true">
          HouseCall
        </p>
      </div>
    )
  }

  if (mode === 'unconfigured') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4 text-[#071330]">
        <h1 className="type-h2 text-[#071330]">HouseCall needs configuration</h1>
        <p className="text-sm text-[#64748B]">
          {backendError ||
            'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or enable local demo with NEXT_PUBLIC_BEAM_DEMO_MODE=1.'}
        </p>
      </div>
    )
  }

  if (mode === 'live' && !authUser) {
    return (
      <BeamContext.Provider
        value={{
          mode,
          ready,
          authUser,
          backendError,
          state: state ?? emptyLiveState('anonymous'),
          currentUser: guestStubPerson(),
          refresh: refreshPublic,
          ...sharedActions,
        }}
      >
        {children}
      </BeamContext.Provider>
    )
  }

  if (!state || !currentUser) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4 text-[#071330]">
        <h1 className="type-h2 text-[#071330]">HouseCall backend error</h1>
        <p className="text-sm text-[#64748B]">
          {backendError || 'Could not load your HouseCall session from Supabase.'}
        </p>
        <p className="text-xs text-[#64748B]">
          Live mode does not fall back to localStorage. Fix the backend error or use explicit demo
          mode.
        </p>
      </div>
    )
  }

  const value: BeamContextValue = {
    mode,
    ready,
    authUser,
    backendError,
    state,
    currentUser,
    refresh: async () => {
      if (mode === 'live' && authUser) await refreshLive(authUser.id)
    },
    ...sharedActions,
  }

  return <BeamContext.Provider value={value}>{children}</BeamContext.Provider>
}

export function useBeam() {
  const ctx = useContext(BeamContext)
  if (!ctx) throw new Error('useBeam must be used within BeamProvider')
  return ctx
}

export type ProfileForm = {
  name: string
  bio: string
  neighborhood: NeighborhoodId | ''
  locationLabel?: string
  skills: Array<CategoryId | string>
  otherSkillLabel?: string | null
  hourlyRate: number
  availability: AvailabilitySlot[]
  rateType?: Person['rateType']
  availableNow?: boolean
  serviceRadiusMiles?: number
  isHelper?: boolean
}
