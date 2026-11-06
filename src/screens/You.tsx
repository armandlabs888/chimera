'use client'

import { MessageCircle, RotateCcw } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { RequestCard } from '../components/RequestCard'
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Field,
  SectionHeader,
  Select,
  TextArea,
  TextInput,
} from '../components/ui'
import { useBeam } from '../context/BeamContext'
import { CATEGORIES } from '../data/categories'
import { NEIGHBORHOODS, getNeighborhood } from '../data/neighborhoods'
import { formatMoney, relativeTime } from '../lib/matching'
import type { AvailabilitySlot, CategoryId } from '../types'

const SLOTS: AvailabilitySlot[] = ['mornings', 'afternoons', 'evenings', 'weekends']
const TABS = ['requests', 'offers', 'messages', 'profile'] as const
type YouTab = (typeof TABS)[number]

export function You() {
  const { state, currentUser, updateProfile, resetDemo, getPerson, getRequest, mode, signOut } =
    useBeam()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const rawTab = params.get('tab')
  const tab: YouTab = TABS.includes(rawTab as YouTab) ? (rawTab as YouTab) : 'requests'

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentUser.name)
  const [bio, setBio] = useState(currentUser.bio)
  const [neighborhood, setNeighborhood] = useState(currentUser.neighborhood)
  const [hourlyRate, setHourlyRate] = useState(currentUser.hourlyRate)
  const [skills, setSkills] = useState<CategoryId[]>(currentUser.skills)
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(currentUser.availability)

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

  const myThreads = useMemo(
    () =>
      state.threads
        .filter((t) => t.participantIds.includes(currentUser.id))
        .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt)),
    [state.threads, currentUser.id],
  )

  function toggleSkill(id: CategoryId) {
    setSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  function toggleSlot(slot: AvailabilitySlot) {
    setAvailability((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    )
  }

  function saveProfile(e: FormEvent) {
    e.preventDefault()
    updateProfile({
      name: name.trim() || currentUser.name,
      bio: bio.trim(),
      neighborhood,
      hourlyRate,
      skills,
      availability,
    })
    setEditing(false)
  }

  return (
    <div className="px-4 py-6">
      <SectionHeader
        title="You"
        subtitle={
          mode === 'live'
            ? 'Your requests, offers, threads, and helper profile — under your account.'
            : 'Your requests, offers, threads, and helper profile — demo data on this device.'
        }
      />

      <div className="mb-5 flex items-center gap-3 rounded-[12px] border border-beam-line bg-beam-base px-3 py-3">
        <img
          src={currentUser.avatar}
          alt=""
          className="h-12 w-12 rounded-[10px] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold text-beam-cream">{currentUser.name}</p>
          <p className="type-sec text-beam-muted">
            {getNeighborhood(currentUser.neighborhood).shortName} · {formatMoney(currentUser.hourlyRate)}
            /hr
          </p>
        </div>
        {mode === 'demo' ? (
          <Button
            type="button"
            variant="ghost"
            className="text-beam-muted"
            onClick={() => {
              if (confirm('Reset all demo data to the Austin seed?')) resetDemo()
            }}
            title="Reset demo data"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset demo</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="text-beam-muted"
            onClick={() => {
              void signOut()
            }}
            title="Sign out"
          >
            <span className="sm:inline">Sign out</span>
          </Button>
        )}
      </div>

      <div className="hide-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {(
          [
            ['requests', 'Requests'],
            ['offers', 'Offers'],
            ['messages', 'Messages'],
            ['profile', 'Profile'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`touch-target shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
              tab === id
                ? 'bg-[#1D5CE5] text-[#FFFFFF]'
                : 'border border-beam-line/70 text-beam-cream-dim hover:border-beam-amber/40'
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
                    className="flat-row group block rounded-xl px-3 py-4 transition hover:bg-beam-ink"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[17px] font-semibold text-beam-cream">{request.title}</p>
                        <p className="mt-1 text-sm text-beam-muted">
                          Your offer {formatMoney(offer.price)} · {offer.eta}
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

      {tab === 'messages' ? (
        myThreads.length ? (
          <ul className="space-y-2">
            {myThreads.map((thread) => {
              const otherId = thread.participantIds.find((pid) => pid !== currentUser.id)!
              const other = getPerson(otherId)
              const request = getRequest(thread.requestId)
              const last = state.messages
                .filter((m) => m.threadId === thread.id)
                .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]
              return (
                <li key={thread.id}>
                  <Link
                    href={`/messages/${thread.id}`}
                    className="flat-row group flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-beam-ink"
                  >
                    <img
                      src={other?.avatar}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-beam-cream">{other?.name}</p>
                      <p className="truncate text-xs text-beam-muted">{request?.title}</p>
                      <p className="mt-0.5 truncate text-sm text-beam-cream-dim">
                        {last?.body ?? 'No messages yet'}
                      </p>
                    </div>
                    <div className="text-right text-xs text-beam-muted">
                      <MessageCircle className="mb-1 ml-auto h-4 w-4 text-beam-amber" />
                      {relativeTime(thread.lastMessageAt)}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            title="No message threads"
            body="Accept an offer or send one to start coordinating."
          />
        )
      ) : null}

      {tab === 'profile' ? (
        <div className="rounded-xl bg-beam-ink/60 p-4">
          {!editing ? (
            <div className="space-y-4">
              <p className="text-beam-cream-dim">{currentUser.bio}</p>
              <div className="flex flex-wrap gap-2">
                {currentUser.skills.map((s) => (
                  <Badge key={s} tone="amber">
                    {CATEGORIES.find((c) => c.id === s)?.shortLabel}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {currentUser.availability.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
              <Button type="button" onClick={() => setEditing(true)}>
                Edit helper profile
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={saveProfile}>
              <Field label="Name">
                <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Bio">
                <TextArea value={bio} onChange={(e) => setBio(e.target.value)} required />
              </Field>
              <Field label="Neighborhood">
                <Select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value as typeof neighborhood)}
                >
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Hourly rate (USD)">
                <TextInput
                  type="number"
                  min={10}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                />
              </Field>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-beam-cream-dim">Skills</legend>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSkill(c.id)}
                      className={`rounded-full px-3 py-2 text-sm ${
                        skills.includes(c.id)
                          ? 'bg-[#1D5CE5] text-[#FFFFFF]'
                          : 'border border-beam-line text-beam-muted'
                      }`}
                    >
                      {c.shortLabel}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-beam-cream-dim">Availability</legend>
                <div className="flex flex-wrap gap-2">
                  {SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleSlot(slot)}
                      className={`rounded-full px-3 py-2 text-sm capitalize ${
                        availability.includes(slot)
                          ? 'bg-[#1D5CE5] text-[#FFFFFF]'
                          : 'border border-beam-line text-beam-muted'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="flex gap-2">
                <Button type="submit">Save profile</Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  )
}
