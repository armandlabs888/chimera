'use client'

import {
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Send,
  Star,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { PersonCard } from '../components/PersonCard'
import { Badge, Button, ButtonLink, EmptyState, Field, TextArea, TextInput } from '../components/ui'
import { useBeam } from '../context/BeamContext'
import { getCategory } from '../data/categories'
import { distanceMiles, formatDistance, getNeighborhood } from '../data/neighborhoods'
import { formatMoney, rankMatches, relativeTime } from '../lib/matching'

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export function RequestDetail() {
  const params = useParams()
  const id = paramId(params.id)
  const router = useRouter()
  const {
    state,
    currentUser,
    getRequest,
    getPerson,
    createOffer,
    acceptOffer,
    markComplete,
    addReview,
    ensureThread,
  } = useBeam()

  const request = getRequest(id)
  const [offerPrice, setOfferPrice] = useState(request?.budget ?? 40)
  const [offerNote, setOfferNote] = useState('')
  const [offerEta, setOfferEta] = useState('Within 1 hour')
  const [offerError, setOfferError] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [showOfferForm, setShowOfferForm] = useState(false)

  const requester = request ? getPerson(request.requesterId) : undefined
  const isOwner = request?.requesterId === currentUser.id
  const category = request ? getCategory(request.category) : undefined

  const offers = useMemo(
    () =>
      state.offers
        .filter((o) => o.requestId === request?.id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.offers, request?.id],
  )

  const myOffer = offers.find((o) => o.helperId === currentUser.id)
  const acceptedOffer = offers.find((o) => o.id === request?.acceptedOfferId)

  const matches = useMemo(() => {
    if (!request) return []
    return rankMatches(request, state.people).slice(0, 5)
  }, [request, state.people])

  const existingReview = state.reviews.find(
    (r) => r.requestId === request?.id && r.fromId === currentUser.id,
  )

  if (!request || !category || !requester) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          title="Request not found"
          body="It may have been cleared with demo reset."
          action={<ButtonLink href="/browse">Back to browse</ButtonLink>}
        />
      </div>
    )
  }

  const activeRequest = request

  async function submitOffer(e: FormEvent) {
    e.preventDefault()
    if (offerPrice < 5) {
      setOfferError('Name a real price before you show up.')
      return
    }
    try {
      await createOffer({
        requestId: activeRequest.id,
        price: offerPrice,
        note: offerNote || 'Happy to help — message me to coordinate.',
        eta: offerEta,
      })
      await ensureThread(activeRequest.id, activeRequest.requesterId)
      setShowOfferForm(false)
      setOfferError('')
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'Could not send offer')
    }
  }

  async function openThreadWith(otherId: string) {
    const threadId = await ensureThread(activeRequest.id, otherId)
    router.push(`/messages/${threadId}`)
  }

  async function submitReview(e: FormEvent) {
    e.preventDefault()
    if (!activeRequest.helperId && !isOwner) return
    const toId = isOwner ? activeRequest.helperId! : activeRequest.requesterId
    await addReview({
      requestId: activeRequest.id,
      toId,
      rating: reviewRating,
      comment: reviewComment || 'Great experience on Beam.',
    })
  }

  return (
    <div>
      <div className="relative h-56 overflow-hidden md:h-72">
        <img src={request.image} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-beam-base via-beam-base/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge tone="amber">{category.label}</Badge>
            <Badge tone={request.status === 'open' ? 'live' : 'neutral'}>{request.status}</Badge>
          </div>
          <h1 className="max-w-3xl font-display text-3xl font-semibold text-beam-cream md:text-4xl">
            {request.title}
          </h1>
        </div>
      </div>

      <div className="grid gap-8 px-4 py-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 text-sm text-beam-cream-dim">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-beam-amber" />
              {getNeighborhood(request.neighborhood).name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-beam-amber" />
              {request.whenLabel}
            </span>
            <span className="font-semibold text-beam-amber">Budget {formatMoney(request.budget)}</span>
            <span className="text-beam-muted">Posted {relativeTime(request.createdAt)}</span>
          </div>

          <p className="whitespace-pre-wrap text-base leading-relaxed text-beam-cream-dim">
            {request.details}
          </p>

          <Link href={`/people/${requester.id}`} className="flat-row flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-white/[0.04]">
            <img src={requester.avatar} alt="" className="h-12 w-12 rounded-xl object-cover" />
            <div>
              <p className="font-medium text-beam-cream">
                {requester.name}
                {isOwner ? ' (you)' : ''}
              </p>
              <p className="text-xs text-beam-muted">
                {getNeighborhood(requester.neighborhood).shortName} · {requester.jobsCompleted} jobs
              </p>
            </div>
          </Link>

          <section>
            <h2 className="mb-3 font-display text-2xl text-beam-cream">Offers</h2>
            {offers.length === 0 ? (
              <EmptyState
                title="No offers yet"
                body={
                  isOwner
                    ? 'Nearby matches are listed on the right. They’ll appear here when someone names a price.'
                    : 'Be the first to name a price and ETA.'
                }
              />
            ) : (
              <ul className="space-y-3">
                {offers.map((offer) => {
                  const helper = getPerson(offer.helperId)
                  if (!helper) return null
                  return (
                    <li
                      key={offer.id}
                      className="rounded-xl bg-beam-ink/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/people/${helper.id}`} className="flex items-center gap-3">
                          <img
                            src={helper.avatar}
                            alt=""
                            className="h-11 w-11 rounded-xl object-cover"
                          />
                          <div>
                            <p className="font-medium text-beam-cream">{helper.name}</p>
                            <p className="text-xs text-beam-muted">
                              {formatDistance(
                                distanceMiles(request.neighborhood, helper.neighborhood),
                              )}{' '}
                              · ETA {offer.eta} · {relativeTime(offer.createdAt)}
                            </p>
                          </div>
                        </Link>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-beam-amber">
                            {formatMoney(offer.price)}
                          </p>
                          <Badge
                            tone={
                              offer.status === 'accepted'
                                ? 'live'
                                : offer.status === 'pending'
                                  ? 'amber'
                                  : 'neutral'
                            }
                          >
                            {offer.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-beam-cream-dim">{offer.note}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {isOwner && offer.status === 'pending' && request.status === 'open' ? (
                          <Button type="button" onClick={() => acceptOffer(offer.id)}>
                            Accept offer
                          </Button>
                        ) : null}
                        {(isOwner || offer.helperId === currentUser.id) && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              openThreadWith(isOwner ? offer.helperId : request.requesterId)
                            }
                          >
                            <MessageCircle className="h-4 w-4" />
                            Message
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {!isOwner && request.status === 'open' ? (
            <section className="rounded-xl bg-beam-ink/80 p-4 ring-1 ring-white/[0.06]">
              <h2 className="font-display text-2xl text-beam-cream">
                {myOffer ? 'Update your offer' : 'Send an offer'}
              </h2>
              <p className="mt-1 text-sm text-beam-muted">
                Name a price before anyone shows up. No lead fees.
              </p>
              {showOfferForm || !myOffer ? (
                <form className="mt-4 space-y-3" onSubmit={submitOffer}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Your price (USD)">
                      <TextInput
                        type="number"
                        min={5}
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(Number(e.target.value))}
                        required
                      />
                    </Field>
                    <Field label="When you can start">
                      <TextInput
                        value={offerEta}
                        onChange={(e) => setOfferEta(e.target.value)}
                        placeholder="e.g. 40 min"
                        required
                      />
                    </Field>
                  </div>
                  <Field label="Note">
                    <TextArea
                      value={offerNote}
                      onChange={(e) => setOfferNote(e.target.value)}
                      placeholder="Experience, what you’ll bring, questions…"
                    />
                  </Field>
                  {offerError ? <p className="text-sm text-red-300">{offerError}</p> : null}
                  <Button type="submit" className="w-full sm:w-auto">
                    <Send className="h-4 w-4" />
                    {myOffer ? 'Update offer' : 'Send offer'}
                  </Button>
                </form>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-beam-cream-dim">
                    You offered {formatMoney(myOffer.price)} · {myOffer.eta}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => setShowOfferForm(true)}
                  >
                    Edit offer
                  </Button>
                </div>
              )}
            </section>
          ) : null}

          {request.status === 'accepted' &&
          (isOwner || request.helperId === currentUser.id) ? (
            <section className="rounded-xl bg-beam-amber-soft p-4 ring-1 ring-beam-amber/35">
              <h2 className="font-display text-xl text-beam-cream">Job in progress</h2>
              <p className="mt-1 text-sm text-beam-cream-dim">
                Accepted at {acceptedOffer ? formatMoney(acceptedOffer.price) : '—'}. Message to
                coordinate, then mark complete when done.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    openThreadWith(isOwner ? request.helperId! : request.requesterId)
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                  Open messages
                </Button>
                <Button type="button" onClick={() => markComplete(request.id)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Mark complete
                </Button>
              </div>
            </section>
          ) : null}

          {request.status === 'completed' ? (
            <section className="rounded-xl bg-beam-ink/80 p-4">
              <h2 className="font-display text-xl text-beam-cream">Leave a review</h2>
              {existingReview ? (
                <p className="mt-2 text-sm text-beam-cream-dim">
                  You rated {existingReview.rating}/5 — “{existingReview.comment}”
                </p>
              ) : (
                <form className="mt-4 space-y-3" onSubmit={submitReview}>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className={`touch-target rounded-xl border px-3 ${
                          reviewRating >= n
                            ? 'border-beam-amber text-beam-amber'
                            : 'border-beam-line text-beam-muted'
                        }`}
                        aria-label={`${n} stars`}
                      >
                        <Star
                          className={`h-5 w-5 ${reviewRating >= n ? 'fill-beam-amber' : ''}`}
                        />
                      </button>
                    ))}
                  </div>
                  <TextArea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="How did it go?"
                  />
                  <Button type="submit">Submit review</Button>
                </form>
              )}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div>
            <h2 className="mb-1 font-display text-2xl text-beam-cream">Nearby matches</h2>
            <p className="mb-4 text-sm text-beam-muted">
              Ranked by skill + distance + availability for this request.
            </p>
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.person.id} className="space-y-2">
                  <PersonCard person={match.person} match={match} />
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {match.reasons.map((reason) => (
                      <Badge key={reason} tone="amber">
                        {reason}
                      </Badge>
                    ))}
                    <Badge>{formatDistance(match.distanceMiles)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {isOwner ? (
            <ButtonLink href="/post" variant="secondary" className="w-full">
              Post another request
            </ButtonLink>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
