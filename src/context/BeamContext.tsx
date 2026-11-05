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
import { getCategory, whenLabel } from '../data/categories'
import { loadState, resetState, saveState, uid } from '../data/storage'
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
} from '../types'

interface BeamContextValue {
  state: AppState
  currentUser: Person
  ready: boolean
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
  }) => HelpRequest
  createOffer: (input: {
    requestId: string
    price: number
    note: string
    eta: string
  }) => Offer
  acceptOffer: (offerId: string) => void
  markComplete: (requestId: string) => void
  addReview: (input: {
    requestId: string
    toId: string
    rating: number
    comment: string
  }) => Review
  ensureThread: (requestId: string, otherUserId: string) => string
  sendMessage: (threadId: string, body: string, opts?: { simulateReply?: boolean }) => void
  getPerson: (id: string) => Person | undefined
  getRequest: (id: string) => HelpRequest | undefined
}

const BeamContext = createContext<BeamContextValue | null>(null)

function withState(
  setState: Dispatch<SetStateAction<AppState | null>>,
  updater: (prev: AppState) => AppState,
) {
  setState((prev) => (prev ? updater(prev) : prev))
}

const HELPER_REPLIES = [
  'Sounds good — I can make that work.',
  'Got it. I’ll confirm once I’m headed over.',
  'Perfect. Any parking tips near you?',
  'Thanks for the details. See you then!',
  'All set on my end. Message if anything changes.',
]

export function BeamProvider({ children }: { children: ReactNode }) {
  // null until mount so SSR and the first client paint match (seed uses Date.now()).
  const [state, setState] = useState<AppState | null>(null)
  const stateRef = useRef<AppState | null>(null)
  stateRef.current = state
  const ready = state !== null

  useEffect(() => {
    setState(loadState())
  }, [])

  useEffect(() => {
    if (!state) return
    saveState(state)
  }, [state])

  const currentUser = useMemo(() => {
    if (!state) return null
    const user = state.people.find((p) => p.id === state.currentUserId)
    if (!user) throw new Error('Current user missing')
    return user
  }, [state])

  const resetDemo = useCallback(() => {
    setState(resetState())
  }, [])

  const updateProfile = useCallback((patch: Partial<Person>) => {
    withState(setState, (prev) => ({
      ...prev,
      people: prev.people.map((p) =>
        p.id === prev.currentUserId ? { ...p, ...patch, id: p.id, isCurrentUser: true } : p,
      ),
    }))
  }, [])

  const createRequest = useCallback<BeamContextValue['createRequest']>((input) => {
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
  }, [])

  const createOffer = useCallback<BeamContextValue['createOffer']>((input) => {
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
  }, [])

  const acceptOffer = useCallback((offerId: string) => {
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

      const participants = [prev.requests.find((r) => r.id === offer.requestId)!.requesterId, offer.helperId] as [
        string,
        string,
      ]
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
  }, [])

  const markComplete = useCallback((requestId: string) => {
    withState(setState, (prev) => ({
      ...prev,
      requests: prev.requests.map((r) =>
        r.id === requestId ? { ...r, status: 'completed' as const } : r,
      ),
    }))
  }, [])

  const addReview = useCallback<BeamContextValue['addReview']>((input) => {
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
  }, [])

  const ensureThread = useCallback((requestId: string, otherUserId: string) => {
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
  }, [])

  const sendMessage = useCallback(
    (threadId: string, body: string, opts?: { simulateReply?: boolean }) => {
      const trimmed = body.trim()
      if (!trimmed) return

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
    [],
  )

  const getPerson = useCallback(
    (id: string) => state?.people.find((p) => p.id === id),
    [state?.people],
  )

  const getRequest = useCallback(
    (id: string) => state?.requests.find((r) => r.id === id),
    [state?.requests],
  )

  if (!state || !currentUser) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-beam-base text-beam-cream">
        <div className="pointer-events-none fixed inset-0 grain opacity-40" aria-hidden />
        <p className="relative font-display text-2xl font-semibold text-beam-amber" aria-busy="true">
          Beam
        </p>
      </div>
    )
  }

  const value: BeamContextValue = {
    state,
    currentUser,
    ready,
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
