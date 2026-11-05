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
  createLiveRequest,
  ensureLiveThread,
  ensureProfile,
  loadLiveState,
  sendLiveMessage,
  submitLiveReview,
  updateLiveProfile,
  BeamBackendError,
} from '@/lib/beam/liveRepository'
import { createClient } from '@/lib/supabase/client'
import type {
  AppState,
  AvailabilitySlot,
  CategoryId,
  HelpRequest,
  NeighborhoodId,
  Offer,
  Person,
  Review,
  WhenOption,
} from '@/types'

interface BeamContextValue {
  mode: BeamMode
  ready: boolean
  authUser: User | null
  backendError: string | null
  state: AppState
  currentUser: Person
  refresh: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  clearBackendError: () => void
  resetDemo: () => void
  updateProfile: (patch: Partial<Person>) => void
  createRequest: (input: {
    title: string
    details: string
    category: CategoryId
    neighborhood: NeighborhoodId
    when: WhenOption
    whenLabel?: string
    budget: number
  }) => HelpRequest | Promise<HelpRequest>
  createOffer: (input: {
    requestId: string
    price: number
    note: string
    eta: string
  }) => Offer | Promise<Offer>
  acceptOffer: (offerId: string) => void | Promise<void>
  markComplete: (requestId: string) => void | Promise<void>
  addReview: (input: {
    requestId: string
    toId: string
    rating: number
    comment: string
  }) => Review | Promise<Review>
  ensureThread: (requestId: string, otherUserId: string) => string | Promise<string>
  sendMessage: (
    threadId: string,
    body: string,
    opts?: { simulateReply?: boolean },
  ) => void | Promise<void>
  getPerson: (id: string) => Person | undefined
  getRequest: (id: string) => HelpRequest | undefined
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
  }
}

export function BeamProvider({ children }: { children: ReactNode }) {
  const [mode] = useState<BeamMode>(() => resolveBeamMode())
  const [state, setState] = useState<AppState | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [booting, setBooting] = useState(true)
  const stateRef = useRef<AppState | null>(null)
  stateRef.current = state

  const reportError = useCallback((err: unknown, fallback: string) => {
    const message =
      err instanceof BeamBackendError
        ? err.message
        : err instanceof Error
          ? err.message
          : fallback
    setBackendError(message)
    throw err instanceof Error ? err : new Error(message)
  }, [])

  const refreshLive = useCallback(async (userId: string) => {
    const client = createClient()
    const next = await loadLiveState(client, userId)
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
          setState(null)
          return
        }

        await ensureProfile(
          client,
          session.user.id,
          session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Neighbor',
        )
        const next = await loadLiveState(client, session.user.id)
        if (!cancelled) setState(next)
      } catch (err) {
        if (!cancelled) {
          setBackendError(err instanceof Error ? err.message : 'Failed to start Beam backend')
          // Live/config errors must not fall back to localStorage.
          setState(null)
        }
      } finally {
        if (!cancelled) setBooting(false)
      }
    }

    void boot()

    if (mode !== 'live') return () => {
      cancelled = true
    }

    const client = createClient()
    const { data: sub } = client.auth.onAuthStateChange(async (_event, session: Session | null) => {
      try {
        setAuthUser(session?.user ?? null)
        if (!session?.user) {
          setState(null)
          return
        }
        await ensureProfile(
          client,
          session.user.id,
          session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Neighbor',
        )
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

  const signIn = useCallback(async (email: string, password: string) => {
    const client = createClient()
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) reportError(error, 'Sign in failed')
  }, [reportError])

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const client = createClient()
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) reportError(error, 'Sign up failed')
      if (data.user) {
        await ensureProfile(client, data.user.id, name)
      }
    },
    [reportError],
  )

  const signOut = useCallback(async () => {
    const client = createClient()
    const { error } = await client.auth.signOut()
    if (error) reportError(error, 'Sign out failed')
    setState(null)
    setAuthUser(null)
  }, [reportError])

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
          p.id === prev.currentUserId ? { ...p, ...patch, id: p.id, isCurrentUser: true } : p,
        ),
      }))
    },
    [authUser, mode, refreshLive, reportError],
  )

  const createRequest = useCallback(
    (input: {
      title: string
      details: string
      category: CategoryId
      neighborhood: NeighborhoodId
      when: WhenOption
      whenLabel?: string
      budget: number
    }) => {
      if (mode === 'live') {
        return (async () => {
          try {
            if (!authUser) throw new Error('Not signed in')
            const client = createClient()
            const created = await createLiveRequest(client, authUser.id, {
              ...input,
              whenLabel: input.whenLabel ?? whenLabel(input.when),
              image: getCategory(input.category).image,
            })
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
          neighborhood: input.neighborhood,
          when: input.when,
          whenLabel: input.whenLabel ?? whenLabel(input.when),
          budget: input.budget,
          status: 'open',
          requesterId: prev.currentUserId,
          image: getCategory(input.category).image,
          createdAt: new Date().toISOString(),
        }
        return { ...prev, requests: [created, ...prev.requests] }
      })
      return created
    },
    [authUser, mode, refreshLive, reportError],
  )

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
        return { ...prev, offers: [full, ...withoutMine] }
      })
      return offer
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
            await acceptLiveOffer(client, offerId)
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
        return {
          ...prev,
          offers,
          requests,
          threads,
          messages: [...prev.messages, systemMsg],
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
      withState(setState, (prev) => ({
        ...prev,
        requests: prev.requests.map((r) =>
          r.id === requestId ? { ...r, status: 'completed' as const } : r,
        ),
      }))
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
        return { ...prev, reviews: [full, ...prev.reviews], people }
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
        return {
          ...prev,
          messages: [...prev.messages, msg],
          threads: prev.threads.map((t) =>
            t.id === threadId ? { ...t, lastMessageAt: msg.createdAt } : t,
          ),
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

  const getPerson = useCallback(
    (id: string) => state?.people.find((p) => p.id === id),
    [state?.people],
  )
  const getRequest = useCallback(
    (id: string) => state?.requests.find((r) => r.id === id),
    [state?.requests],
  )

  const ready = !booting

  if (booting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-beam-base text-beam-cream">
        <p className="font-display text-2xl font-semibold text-beam-amber" aria-busy="true">
          Beam
        </p>
      </div>
    )
  }

  if (mode === 'unconfigured') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4 text-beam-cream">
        <h1 className="font-display text-3xl text-beam-amber">Beam needs configuration</h1>
        <p className="text-sm text-beam-muted">
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
          state: emptyLiveState('anonymous'),
          currentUser: {
            id: 'anonymous',
            name: 'Guest',
            avatar: '',
            bio: '',
            neighborhood: 'east-austin',
            skills: [],
            hourlyRate: 0,
            availability: [],
            rating: 0,
            reviewCount: 0,
            jobsCompleted: 0,
          },
          refresh: async () => undefined,
          signIn,
          signUp,
          signOut,
          clearBackendError: () => setBackendError(null),
          resetDemo,
          updateProfile,
          createRequest,
          createOffer,
          acceptOffer,
          markComplete,
          addReview,
          ensureThread,
          sendMessage,
          getPerson,
          getRequest,
        }}
      >
        {children}
      </BeamContext.Provider>
    )
  }

  if (!state || !currentUser) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4 text-beam-cream">
        <h1 className="font-display text-3xl text-beam-amber">Beam backend error</h1>
        <p className="text-sm text-beam-muted">
          {backendError || 'Could not load your Beam session from Supabase.'}
        </p>
        <p className="text-xs text-beam-muted">
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
    signIn,
    signUp,
    signOut,
    clearBackendError: () => setBackendError(null),
    resetDemo,
    updateProfile,
    createRequest,
    createOffer,
    acceptOffer,
    markComplete,
    addReview,
    ensureThread,
    sendMessage,
    getPerson,
    getRequest,
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
  neighborhood: NeighborhoodId
  skills: CategoryId[]
  hourlyRate: number
  availability: AvailabilitySlot[]
}
