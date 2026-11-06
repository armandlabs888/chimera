'use client'

import {
  Camera,
  Check,
  ChevronDown,
  Lock,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RequestCard } from '@/components/RequestCard'
import { Avatar, Button, Field, TextArea, TextInput } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES, getCategory, whenLabel as baseWhenLabel } from '@/data/categories'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'
import { uploadBeamMedia } from '@/lib/beam/storageUpload'
import { rankHelpersForRequest } from '@/lib/matching'
import { createClient } from '@/lib/supabase/client'
import type {
  BudgetType,
  CategoryId,
  HelpRequest,
  WhenOption,
} from '@/types'

const PAGE_BG = '#F4F8FD'
const INK = '#071330'
const BODY = '#475569'
const MUTED = '#64748B'
const CTA = '#1D5CE5'
const BUTTER = '#FFF8D6'

const RADIUS_OPTIONS = [1, 3, 5, 10, 25] as const
const BUDGET_PRESETS = [40, 60, 80, 100, 120] as const
const TITLE_MAX = 70
const DETAILS_MAX = 1200

type TimeWindow = 'Morning' | 'Afternoon' | 'Evening'

const WHEN_CHIPS: { id: WhenOption | 'pick'; label: string }[] = [
  { id: 'asap', label: 'ASAP' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'this-week', label: 'This week' },
  { id: 'pick', label: 'Pick date & time' },
]

type GeocodeSuggestion = {
  label: string
  lat: number | null
  lng: number | null
}

type DraftAiResponse = {
  blocked?: boolean
  reason?: string
  category?: CategoryId
  title?: string
  details?: string
  when?: WhenOption
  whenLabel?: string
  suggestedBudget?: number
  error?: string
}

function isCategoryId(value: string | null): value is CategoryId {
  return CATEGORIES.some((c) => c.id === value)
}

function formatScheduledLabel(dateIso: string, window: TimeWindow): string {
  const d = new Date(`${dateIso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return `Pick a date · ${window}`
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${day} · ${window}`
}

function scheduledForIso(dateIso: string, window: TimeWindow): string {
  const hour = window === 'Morning' ? 9 : window === 'Afternoon' ? 14 : 18
  const d = new Date(`${dateIso}T00:00:00`)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function resolveWhenLabel(
  when: WhenOption,
  scheduledDate: string,
  timeWindow: TimeWindow,
  customLabel?: string,
): string {
  if (customLabel) return customLabel
  if (when === 'scheduled') {
    return scheduledDate ? formatScheduledLabel(scheduledDate, timeWindow) : 'Pick date & time'
  }
  return baseWhenLabel(when)
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function cardClass(extra = '') {
  return `rounded-lg border border-[rgba(7,19,48,0.08)] bg-white p-5 sm:p-6 ${extra}`
}

export function PostRequest() {
  const { postRequest, getPerson, state, mode, currentUser, authUser } = useBeam()
  const router = useRouter()
  const params = useSearchParams()

  const helperId = params.get('rebook') || params.get('helper') || ''
  const preferredHelper = helperId ? getPerson(helperId) : undefined
  const categoryParam = params.get('category')
  const initialCategory: CategoryId = isCategoryId(categoryParam) ? categoryParam : 'moving'

  const [category, setCategory] = useState<CategoryId>(initialCategory)
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBlocked, setAiBlocked] = useState('')
  const [aiPending, setAiPending] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoPending, setPhotoPending] = useState(false)

  const [locationLabel, setLocationLabel] = useState(
    () => currentUser.locationLabel?.trim() || '',
  )
  const [lat, setLat] = useState<number | null>(currentUser.lat ?? null)
  const [lng, setLng] = useState<number | null>(currentUser.lng ?? null)
  const [radiusMiles, setRadiusMiles] = useState(5)
  const [exactAddress, setExactAddress] = useState('')
  const [showExact, setShowExact] = useState(false)
  const [geoPending, setGeoPending] = useState(false)
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [when, setWhen] = useState<WhenOption>('today')
  const [pickingSchedule, setPickingSchedule] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('Afternoon')
  const [customWhenLabel, setCustomWhenLabel] = useState<string | undefined>()

  const [budgetType, setBudgetType] = useState<BudgetType>('fixed')
  const [budget, setBudget] = useState(60)

  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const locationWrapRef = useRef<HTMLDivElement>(null)

  const cat = useMemo(() => getCategory(category), [category])
  const computedWhenLabel = useMemo(
    () => resolveWhenLabel(when, scheduledDate, timeWindow, customWhenLabel),
    [when, scheduledDate, timeWindow, customWhenLabel],
  )
  const scheduledFor =
    when === 'scheduled' && scheduledDate
      ? scheduledForIso(scheduledDate, timeWindow)
      : null

  const draft = useMemo<HelpRequest>(
    () => ({
      id: 'draft-preview',
      title: title.trim() || 'Your request title',
      details: details.trim() || 'Details helpers will read before offering a price…',
      category,
      neighborhood: '',
      when,
      whenLabel: computedWhenLabel,
      budget: budgetType === 'open' ? 0 : budget || 0,
      budgetType,
      status: 'open',
      requesterId: currentUser.id,
      image: photoUrl || cat.image,
      createdAt: new Date().toISOString(),
      locationLabel: locationLabel.trim() || undefined,
      exactAddress: exactAddress.trim() || undefined,
      lat,
      lng,
      radiusMiles,
      scheduledFor,
      preferredHelperId: preferredHelper?.id ?? null,
      publicOfferCount: 0,
    }),
    [
      title,
      details,
      category,
      when,
      computedWhenLabel,
      budgetType,
      budget,
      currentUser.id,
      photoUrl,
      cat.image,
      locationLabel,
      exactAddress,
      lat,
      lng,
      radiusMiles,
      scheduledFor,
      preferredHelper?.id,
    ],
  )

  const matchCount = useMemo(
    () => rankHelpersForRequest(draft, state.people, [currentUser.id]).length,
    [draft, state.people, currentUser.id],
  )

  // Debounced location autocomplete
  useEffect(() => {
    const q = locationLabel.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = (await res.json()) as GeocodeSuggestion[]
        setSuggestions(Array.isArray(data) ? data.slice(0, 5) : [])
      } catch {
        /* ignore */
      }
    }, 280)
    return () => window.clearTimeout(handle)
  }, [locationLabel])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!locationWrapRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const applyTemplate = useCallback(
    (index: number) => {
      const t = cat.templates[index]
      if (!t) return
      setTitle(t.title.slice(0, TITLE_MAX))
      setDetails(t.details.slice(0, DETAILS_MAX))
      setBudget(t.budgetHint)
      setBudgetType('fixed')
      setError('')
      setAiBlocked('')
    },
    [cat.templates],
  )

  async function onUseMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.')
      return
    }
    setGeoPending(true)
    setError('')
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: false,
        }),
      )
      const res = await fetch(
        `/api/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
      )
      if (!res.ok) throw new Error('Could not reverse-geocode')
      const data = (await res.json()) as GeocodeSuggestion
      setLocationLabel(data.label || `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
      setLat(typeof data.lat === 'number' ? data.lat : pos.coords.latitude)
      setLng(typeof data.lng === 'number' ? data.lng : pos.coords.longitude)
      setShowSuggestions(false)
    } catch {
      setError('Could not detect your location. Enter a city or ZIP instead.')
    } finally {
      setGeoPending(false)
    }
  }

  function pickSuggestion(s: GeocodeSuggestion) {
    setLocationLabel(s.label)
    setLat(s.lat)
    setLng(s.lng)
    setShowSuggestions(false)
  }

  async function onPhotoSelected(file: File | null) {
    if (!file) return
    setPhotoPending(true)
    setError('')
    try {
      const supabase = mode === 'live' ? createClient() : null
      const url = await uploadBeamMedia({
        mode,
        supabase,
        userId: authUser?.id || currentUser.id,
        file,
      })
      setPhotoUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo')
    } finally {
      setPhotoPending(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onDraftWithAi() {
    const prompt = aiPrompt.trim()
    if (!prompt) {
      setAiBlocked('Describe what you need so AI can draft the request.')
      return
    }
    setAiPending(true)
    setAiBlocked('')
    setError('')
    try {
      const res = await fetch('/api/ai/draft-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          hasPhoto: Boolean(photoUrl),
          categoryHint: category,
        }),
      })
      const data = (await res.json()) as DraftAiResponse
      if (!res.ok) {
        setAiBlocked(data.error || 'Could not draft request')
        return
      }
      if (data.blocked) {
        setAiBlocked(data.reason || 'This request is not permitted on Beam.')
        return
      }
      if (data.category && isCategoryId(data.category)) setCategory(data.category)
      if (data.title) setTitle(data.title.slice(0, TITLE_MAX))
      if (data.details) setDetails(data.details.slice(0, DETAILS_MAX))
      if (data.when && data.when !== 'scheduled') {
        setWhen(data.when)
        setPickingSchedule(false)
        setCustomWhenLabel(data.whenLabel)
      } else if (data.whenLabel) {
        setCustomWhenLabel(data.whenLabel)
      }
      if (typeof data.suggestedBudget === 'number' && data.suggestedBudget > 0) {
        setBudget(data.suggestedBudget)
        setBudgetType('fixed')
      }
    } catch {
      setAiBlocked('Could not reach the drafting service. Try again.')
    } finally {
      setAiPending(false)
    }
  }

  function selectWhenChip(id: WhenOption | 'pick') {
    setCustomWhenLabel(undefined)
    if (id === 'pick') {
      setPickingSchedule(true)
      setWhen('scheduled')
      if (!scheduledDate) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setScheduledDate(tomorrow.toISOString().slice(0, 10))
      }
      return
    }
    setPickingSchedule(false)
    setWhen(id)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !details.trim()) {
      setError('Add a title and a few details so helpers know what to expect.')
      return
    }
    if (budgetType === 'fixed' && budget < 10) {
      setError('Budget should be at least $10.')
      return
    }
    if (when === 'scheduled' && !scheduledDate) {
      setError('Pick a date for your scheduled request.')
      return
    }
    setPending(true)
    setError('')
    try {
      const request = await postRequest({
        title: title.trim(),
        details: details.trim(),
        category,
        neighborhood: '',
        when,
        whenLabel: computedWhenLabel,
        budget: budgetType === 'open' ? 0 : budget,
        budgetType,
        locationLabel: locationLabel.trim() || undefined,
        lat,
        lng,
        radiusMiles,
        exactAddress: exactAddress.trim() || undefined,
        scheduledFor,
        preferredHelperId: preferredHelper?.id ?? null,
        image: photoUrl || undefined,
      })
      router.push(`/requests/${request.id}?justPosted=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post request')
      setPending(false)
    }
  }

  return (
    <div className="min-h-full py-2 sm:py-4" style={{ backgroundColor: PAGE_BG }}>
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-6">
          <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]" style={{ color: INK }}>
            Post a request
          </h1>
          <p className="mt-1 text-[15px]" style={{ color: MUTED }}>
            Describe the job once — helpers nearby can offer a price.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
          <form className="space-y-5" onSubmit={onSubmit}>
            {preferredHelper ? (
              <div
                className="flex items-center gap-3 rounded-lg border border-[rgba(7,19,48,0.08)] px-4 py-3.5"
                style={{ backgroundColor: BUTTER }}
              >
                <Avatar src={preferredHelper.avatar} name={preferredHelper.name} size={44} />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold" style={{ color: INK }}>
                    Requesting help from {firstName(preferredHelper.name)}
                  </p>
                  <p className="mt-0.5 text-[13px]" style={{ color: BODY }}>
                    She&apos;ll be notified as soon as you post — you can still receive other offers.
                  </p>
                </div>
              </div>
            ) : null}

            {/* AI Quick-Draft */}
            <section className={cardClass()}>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: '#EEF4FF', color: CTA }}
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold" style={{ color: INK }}>
                    AI Quick-Draft
                  </h2>
                  <p className="text-[13px]" style={{ color: MUTED }}>
                    Sketch the job in plain language — we fill the form.
                  </p>
                </div>
              </div>

              <TextArea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Need help moving a couch up two flights of stairs this Saturday afternoon…"
                rows={3}
                className="min-h-[96px]"
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onPhotoSelected(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={photoPending}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="h-4 w-4" aria-hidden />
                  {photoUrl ? 'Change photo' : 'Add photo'}
                </Button>
                {photoUrl ? (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[13px] font-medium"
                    style={{ color: MUTED }}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                ) : null}
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  loading={aiPending}
                  onClick={() => void onDraftWithAi()}
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Draft with AI
                </Button>
              </div>

              {photoUrl ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-[rgba(7,19,48,0.08)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="" className="h-36 w-full object-cover" />
                </div>
              ) : null}

              {aiBlocked ? (
                <p
                  className="mt-3 rounded-lg px-3 py-2 text-[13px] leading-snug"
                  style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}
                  role="alert"
                >
                  {aiBlocked}
                </p>
              ) : null}
            </section>

            {/* Category */}
            <section className={cardClass()}>
              <h2 className="mb-1 text-[16px] font-semibold" style={{ color: INK }}>
                Category
              </h2>
              <p className="mb-4 text-[13px]" style={{ color: MUTED }}>
                Pick the closest fit — helpers filter by these.
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICONS[c.id]
                  const selected = category === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`relative flex flex-col items-start gap-2 rounded-lg border px-3 py-3 text-left transition ${
                        selected
                          ? 'border-[#1D5CE5] bg-[#EEF4FF] ring-2 ring-[#1D5CE5]/30'
                          : 'border-[rgba(7,19,48,0.08)] bg-[#F8FAFC] hover:bg-white'
                      }`}
                    >
                      {selected ? (
                        <span
                          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: CTA }}
                        >
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                      ) : null}
                      <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: c.tintBg, color: c.tintFg }}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-[14px] font-semibold" style={{ color: INK }}>
                        {c.shortLabel}
                      </span>
                      <span className="text-[12px] leading-snug" style={{ color: MUTED }}>
                        {c.typicalRange}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Title & Details */}
            <section className={cardClass()}>
              <h2 className="mb-4 text-[16px] font-semibold" style={{ color: INK }}>
                Title &amp; details
              </h2>

              <Field
                label="Title"
                required
                hint={`${title.length}/${TITLE_MAX}`}
              >
                <TextInput
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                  placeholder="What do you need done?"
                  required
                />
              </Field>

              <div className="mt-4">
                <Field
                  label="Details"
                  required
                  hint={`${details.length}/${DETAILS_MAX} · Be specific about access, timing, and tools.`}
                >
                  <TextArea
                    value={details}
                    maxLength={DETAILS_MAX}
                    onChange={(e) => setDetails(e.target.value.slice(0, DETAILS_MAX))}
                    placeholder="A few sentences helpers can trust…"
                    rows={5}
                    required
                  />
                </Field>
              </div>

              {cat.templates.length ? (
                <div className="mt-4">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                    Templates
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cat.templates.map((t, i) => (
                      <button
                        key={t.title}
                        type="button"
                        onClick={() => applyTemplate(i)}
                        className="rounded-md border border-[rgba(7,19,48,0.1)] bg-[#F4F8FD] px-3 py-1.5 text-[13px] font-medium transition hover:border-[#1D5CE5]/40 hover:bg-white"
                        style={{ color: INK }}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {/* Location */}
            <section className={cardClass()}>
              <h2 className="mb-1 text-[16px] font-semibold" style={{ color: INK }}>
                Location
              </h2>
              <p className="mb-4 text-[13px]" style={{ color: MUTED }}>
                City, neighborhood, or ZIP — helpers see a radius, not your door.
              </p>

              <div ref={locationWrapRef} className="relative">
                <Field label="City / neighborhood / ZIP">
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <MapPin
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                        style={{ color: MUTED }}
                        aria-hidden
                      />
                      <TextInput
                        value={locationLabel}
                        onChange={(e) => {
                          setLocationLabel(e.target.value)
                          setShowSuggestions(true)
                          setLat(null)
                          setLng(null)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="e.g. Seattle, WA or 98101"
                        className="pl-10"
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void onUseMyLocation()}
                      loading={geoPending}
                      className="shrink-0 whitespace-nowrap"
                    >
                      Use my location
                    </Button>
                  </div>
                </Field>

                {showSuggestions && suggestions.length > 0 ? (
                  <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[rgba(7,19,48,0.1)] bg-white py-1 shadow-[0_12px_28px_-10px_rgba(12,42,102,0.18)]">
                    {suggestions.map((s) => (
                      <li key={`${s.label}-${s.lat}-${s.lng}`}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[14px] hover:bg-[#F4F8FD]"
                          style={{ color: INK }}
                          onClick={() => pickSuggestion(s)}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: MUTED }} aria-hidden />
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[13px] font-medium" style={{ color: BODY }}>
                  Search radius
                </p>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_OPTIONS.map((r) => {
                    const selected = radiusMiles === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRadiusMiles(r)}
                        className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition ${
                          selected
                            ? 'bg-[#1D5CE5] text-white'
                            : 'border border-[rgba(7,19,48,0.1)] bg-white text-[#071330] hover:bg-[#F4F8FD]'
                        }`}
                      >
                        {r} mi
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 border-t border-[rgba(7,19,48,0.06)] pt-3">
                <button
                  type="button"
                  onClick={() => setShowExact((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="text-[14px] font-semibold" style={{ color: INK }}>
                    Exact address (optional)
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition ${showExact ? 'rotate-180' : ''}`}
                    style={{ color: MUTED }}
                    aria-hidden
                  />
                </button>
                {showExact ? (
                  <div className="mt-3 space-y-2">
                    <TextInput
                      value={exactAddress}
                      onChange={(e) => setExactAddress(e.target.value)}
                      placeholder="Street address — shared only after you accept an offer"
                      autoComplete="street-address"
                    />
                    <p className="flex items-start gap-1.5 text-[12.5px]" style={{ color: MUTED }}>
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      Locked until you accept a helper. Never shown on the public card.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            {/* When */}
            <section className={cardClass()}>
              <h2 className="mb-4 text-[16px] font-semibold" style={{ color: INK }}>
                When
              </h2>
              <div className="flex flex-wrap gap-2">
                {WHEN_CHIPS.map((chip) => {
                  const selected =
                    chip.id === 'pick' ? pickingSchedule || when === 'scheduled' : when === chip.id && !pickingSchedule
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => selectWhenChip(chip.id)}
                      className={`rounded-md px-3.5 py-2 text-[13px] font-semibold transition ${
                        selected
                          ? 'bg-[#1D5CE5] text-white'
                          : 'border border-[rgba(7,19,48,0.1)] bg-white text-[#071330] hover:bg-[#F4F8FD]'
                      }`}
                    >
                      {chip.label}
                    </button>
                  )
                })}
              </div>

              {pickingSchedule || when === 'scheduled' ? (
                <div className="mt-4 space-y-3 rounded-lg bg-[#F4F8FD] p-4">
                  <Field label="Date">
                    <TextInput
                      type="date"
                      value={scheduledDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        setScheduledDate(e.target.value)
                        setCustomWhenLabel(undefined)
                        setWhen('scheduled')
                      }}
                    />
                  </Field>
                  <div>
                    <p className="mb-2 text-[13px] font-medium" style={{ color: BODY }}>
                      Time window
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(['Morning', 'Afternoon', 'Evening'] as TimeWindow[]).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => {
                            setTimeWindow(w)
                            setCustomWhenLabel(undefined)
                            setWhen('scheduled')
                          }}
                          className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition ${
                            timeWindow === w
                              ? 'bg-[#1D5CE5] text-white'
                              : 'border border-[rgba(7,19,48,0.1)] bg-white text-[#071330]'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                  {scheduledDate ? (
                    <p className="text-[13px]" style={{ color: MUTED }}>
                      Shows as <span style={{ color: INK }}>{computedWhenLabel}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            {/* Budget */}
            <section className={cardClass()}>
              <h2 className="mb-4 text-[16px] font-semibold" style={{ color: INK }}>
                Budget
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBudgetType('fixed')}
                  className={`rounded-md px-3.5 py-2 text-[13px] font-semibold transition ${
                    budgetType === 'fixed'
                      ? 'bg-[#1D5CE5] text-white'
                      : 'border border-[rgba(7,19,48,0.1)] bg-white text-[#071330] hover:bg-[#F4F8FD]'
                  }`}
                >
                  Set a budget
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBudgetType('open')
                    setBudget(0)
                  }}
                  className={`rounded-md px-3.5 py-2 text-[13px] font-semibold transition ${
                    budgetType === 'open'
                      ? 'bg-[#1D5CE5] text-white'
                      : 'border border-[rgba(7,19,48,0.1)] bg-white text-[#071330] hover:bg-[#F4F8FD]'
                  }`}
                >
                  Open to offers
                </button>
              </div>

              {budgetType === 'fixed' ? (
                <div className="mt-4 space-y-3">
                  <Field label="Budget (USD)" hint="Helpers still name their price — this sets expectations.">
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold"
                        style={{ color: MUTED }}
                      >
                        $
                      </span>
                      <TextInput
                        type="number"
                        min={10}
                        step={5}
                        value={budget || ''}
                        onChange={(e) => setBudget(Number(e.target.value) || 0)}
                        className="pl-8 tabular-nums"
                        required
                      />
                    </div>
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    {BUDGET_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setBudget(p)}
                        className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition ${
                          budget === p
                            ? 'bg-[#EEF4FF] text-[#1D5CE5] ring-1 ring-[#1D5CE5]/40'
                            : 'border border-[rgba(7,19,48,0.1)] bg-white text-[#071330]'
                        }`}
                      >
                        ${p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-[13px]" style={{ color: MUTED }}>
                  Helpers will propose prices. You choose the offer that fits.
                </p>
              )}
            </section>

            {error ? (
              <p
                className="rounded-lg px-4 py-3 text-[14px]"
                style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" variant="brand" size="lg" className="w-full" loading={pending}>
              Post request
            </Button>
          </form>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <p className="mb-3 text-[13px] font-medium" style={{ color: MUTED }}>
              Preview
            </p>
            <div className="pointer-events-none select-none" aria-hidden>
              <RequestCard request={draft} />
            </div>
            <div
              className="mt-4 rounded-lg border border-[rgba(7,19,48,0.08)] bg-white px-4 py-3.5"
            >
              <p className="text-[14px] font-semibold" style={{ color: INK }}>
                {matchCount} helper{matchCount === 1 ? '' : 's'} nearby
              </p>
              <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
                Based on category, timing, and your {radiusMiles}-mile radius.
              </p>
            </div>
            <p className="mt-3 text-[13px]" style={{ color: MUTED }}>
              Preview updates as you edit. Nothing posts until you confirm.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
