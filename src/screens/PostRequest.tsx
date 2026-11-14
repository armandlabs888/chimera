'use client'

import {
  Camera,
  ChevronDown,
  Lock,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RequestCard } from '@/components/RequestCard'
import { CategorySelect } from '@/components/CategorySelect'
import { Avatar, Button, Field, TextArea, TextInput } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { getCategory } from '@/data/categories'
import { deleteBeamMedia, uploadBeamMedia } from '@/lib/beam/storageUpload'
import {
  LISTING_PHOTO_HINT,
  LISTING_PHOTO_MAX,
  listingCoverImage,
} from '@/lib/listingPhotos'
import {
  ASAP_ARRIVAL_NOTE,
  addLocalDays,
  buildWhenLabel,
  combineLocalDateTime,
  formatTimeInput,
  localDateISO,
  parseTimeInput,
  validateTimeWindow,
  type ClockTime,
} from '@/lib/listingSchedule'
import { rankHelpersForRequest } from '@/lib/matching'
import { createClient } from '@/lib/supabase/client'
import {
  defaultServiceForParent,
  isBrowseParentId,
  isCategoryId,
  normalizeOtherCustom,
  type ServiceCategoryId,
} from '@/lib/taxonomy'
import type {
  BudgetType,
  CategoryId,
  HelpRequest,
  WhenOption,
} from '@/types'

const PAGE_BG = '#F4F8FD'
const INK = '#071330'
const MUTED = '#64748B'
const BUTTER = '#FFF8D6'

const BUDGET_PRESETS = [40, 60, 80, 100, 120] as const
const TITLE_MAX = 70
const DETAILS_MAX = 1200
const DEFAULT_START: ClockTime = { hours: 14, minutes: 0 }

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

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function cardClass(extra = '') {
  return `rounded-lg border border-[rgba(7,19,48,0.08)] bg-white p-5 sm:p-6 ${extra}`
}

/** New post form: only asap | scheduled expose / hide the clock UI. */
function isScheduledMode(when: WhenOption): boolean {
  return when === 'scheduled'
}

const WHEN_MODES = [
  {
    id: 'asap' as const,
    title: 'As soon as possible',
    body: 'You’re looking for help now. Helpers respond with their price and timing.',
  },
  {
    id: 'scheduled' as const,
    title: 'Schedule a date',
    body: 'Pick a date and start time. Optional end time keeps the window clear.',
  },
]

export function PostRequest() {
  const { postRequest, getPerson, state, mode, currentUser, authUser } = useBeam()
  const router = useRouter()
  const params = useSearchParams()

  const helperId = params.get('rebook') || params.get('helper') || ''
  const preferredHelper = helperId ? getPerson(helperId) : undefined
  const categoryParam = params.get('category')
  const initialCategory: ServiceCategoryId = isCategoryId(categoryParam)
    ? categoryParam
    : isBrowseParentId(categoryParam)
      ? defaultServiceForParent(categoryParam)
      : 'house-cleaning'

  const [category, setCategory] = useState<ServiceCategoryId>(initialCategory)
  const [categoryCustom, setCategoryCustom] = useState('')
  const [customError, setCustomError] = useState('')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBlocked, setAiBlocked] = useState('')
  const [aiPending, setAiPending] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photoPending, setPhotoPending] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const [locationLabel, setLocationLabel] = useState(
    () => currentUser.locationLabel?.trim() || '',
  )
  const [lat, setLat] = useState<number | null>(currentUser.lat ?? null)
  const [lng, setLng] = useState<number | null>(currentUser.lng ?? null)
  const [exactAddress, setExactAddress] = useState('')
  const [showExact, setShowExact] = useState(false)
  const [geoPending, setGeoPending] = useState(false)
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [nowTick, setNowTick] = useState(() => Date.now())
  // Default ASAP: urgency without inventing a concrete appointment.
  const [when, setWhen] = useState<WhenOption>('asap')
  const [scheduledDate, setScheduledDate] = useState('')
  const [startTime, setStartTime] = useState(formatTimeInput(DEFAULT_START))
  const [endTime, setEndTime] = useState('')

  const [budgetType, setBudgetType] = useState<BudgetType>('fixed')
  const [budget, setBudget] = useState(60)
  /** Optional SMS urgency flag; regular ASAP/scheduled posts stay unchanged when false. */
  const [needsHelpNow, setNeedsHelpNow] = useState(false)

  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const locationWrapRef = useRef<HTMLDivElement>(null)

  const cat = useMemo(() => getCategory(category), [category])
  const todayISO = localDateISO(new Date(nowTick))
  const tomorrowISO = addLocalDays(todayISO, 1)

  const activeDateISO = isScheduledMode(when) ? scheduledDate || null : null

  const startClock = isScheduledMode(when) ? parseTimeInput(startTime) : null
  const endClock =
    isScheduledMode(when) && endTime ? parseTimeInput(endTime) : null

  const computedWhenLabel = useMemo(
    () =>
      buildWhenLabel({
        when: isScheduledMode(when) ? 'scheduled' : 'asap',
        dateISO: activeDateISO,
        start: startClock,
        end: endClock,
      }),
    [when, activeDateISO, startClock, endClock],
  )

  // ASAP must never persist leftover schedule fields after a mode switch.
  const scheduledFor =
    isScheduledMode(when) && activeDateISO && startClock
      ? combineLocalDateTime(activeDateISO, startClock).toISOString()
      : null
  const scheduledEnd =
    isScheduledMode(when) && activeDateISO && endClock
      ? combineLocalDateTime(activeDateISO, endClock).toISOString()
      : null

  const coverImage = listingCoverImage(photoUrls, cat.image)

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
      image: coverImage,
      images: photoUrls,
      createdAt: new Date().toISOString(),
      locationLabel: locationLabel.trim() || undefined,
      exactAddress: exactAddress.trim() || undefined,
      lat,
      lng,
      radiusMiles: 5,
      scheduledFor,
      scheduledEnd,
      preferredHelperId: preferredHelper?.id ?? null,
      publicOfferCount: 0,
      isUrgent: needsHelpNow,
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
      coverImage,
      photoUrls,
      locationLabel,
      exactAddress,
      lat,
      lng,
      scheduledFor,
      scheduledEnd,
      preferredHelper?.id,
      needsHelpNow,
    ],
  )

  const matchCount = useMemo(
    () => rankHelpersForRequest(draft, state.people, [currentUser.id]).length,
    [draft, state.people, currentUser.id],
  )

  // Refresh calendar labels across midnight.
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

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
      setLocationLabel(
        data.label ||
          `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
      )
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

  async function onPhotosSelected(fileList: FileList | null) {
    if (!fileList?.length) return
    setPhotoError('')
    setError('')
    const remaining = LISTING_PHOTO_MAX - photoUrls.length
    if (remaining <= 0) {
      setPhotoError(`You can add up to ${LISTING_PHOTO_MAX} photos.`)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    const selected = Array.from(fileList)
    const truncated = selected.length > remaining
    const files = selected.slice(0, remaining)
    if (truncated) {
      setPhotoError(`Only ${LISTING_PHOTO_MAX} photos allowed — kept the first ${remaining}.`)
    }
    setPhotoPending(true)
    const uploaded: string[] = []
    try {
      const supabase = mode === 'live' ? createClient() : null
      for (let i = 0; i < files.length; i++) {
        const url = await uploadBeamMedia({
          mode,
          supabase,
          userId: authUser?.id || currentUser.id,
          file: files[i],
          currentCount: photoUrls.length + uploaded.length,
        })
        uploaded.push(url)
      }
      setPhotoUrls((prev) => [...prev, ...uploaded].slice(0, LISTING_PHOTO_MAX))
    } catch (err) {
      // Clean orphan uploads from this batch on failure.
      if (mode === 'live') {
        const supabase = createClient()
        await Promise.all(
          uploaded.map((url) =>
            deleteBeamMedia({
              mode,
              supabase,
              userId: authUser?.id || currentUser.id,
              url,
            }),
          ),
        )
      }
      setPhotoError(err instanceof Error ? err.message : 'Could not upload photo')
    } finally {
      setPhotoPending(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removePhotoAt(index: number) {
    const url = photoUrls[index]
    if (!url) return
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index))
    setPhotoError('')
    try {
      const supabase = mode === 'live' ? createClient() : null
      await deleteBeamMedia({
        mode,
        supabase,
        userId: authUser?.id || currentUser.id,
        url,
      })
    } catch {
      /* best-effort delete */
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
          hasPhoto: photoUrls.length > 0,
          categoryHint: category,
        }),
      })
      const data = (await res.json()) as DraftAiResponse
      if (!res.ok) {
        setAiBlocked(data.error || 'Could not draft this request.')
        return
      }
      if (data.blocked) {
        setAiBlocked(data.reason || 'That request is not allowed on HouseCall.')
        return
      }
      if (data.category && isCategoryId(data.category)) setCategory(data.category)
      if (data.title) setTitle(data.title.slice(0, TITLE_MAX))
      if (data.details) setDetails(data.details.slice(0, DETAILS_MAX))
      // Only asap | scheduled — never reintroduce today/tomorrow/this-week chips.
      if (data.when === 'scheduled') {
        selectWhenMode('scheduled')
      } else if (data.when === 'asap' || !data.when) {
        selectWhenMode('asap')
      }
      if (typeof data.suggestedBudget === 'number' && data.suggestedBudget >= 10) {
        setBudget(data.suggestedBudget)
        setBudgetType('fixed')
      }
    } catch {
      setAiBlocked('Could not reach the drafting service. Try again.')
    } finally {
      setAiPending(false)
    }
  }

  function selectWhenMode(id: 'asap' | 'scheduled') {
    if (id === 'asap') {
      setWhen('asap')
      // Clear draft schedule so a later submit cannot pick up stale hidden values.
      setScheduledDate('')
      setStartTime(formatTimeInput(DEFAULT_START))
      setEndTime('')
      return
    }
    setWhen('scheduled')
    setScheduledDate((prev) => prev || tomorrowISO)
    setStartTime((prev) => prev || formatTimeInput(DEFAULT_START))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !details.trim()) {
      setError('Add a title and a few details so helpers know what to expect.')
      return
    }
    let customValue: string | null = null
    if (category === 'other') {
      const normalized = normalizeOtherCustom(categoryCustom)
      if (!normalized.ok) {
        setCustomError(normalized.error)
        setError(normalized.error)
        return
      }
      customValue = normalized.value
    }
    if (budgetType === 'fixed' && budget < 10) {
      setError('Budget should be at least $10.')
      return
    }
    if (isScheduledMode(when)) {
      const check = validateTimeWindow({
        when: 'scheduled',
        dateISO: activeDateISO,
        start: startClock,
        end: endClock,
        now: new Date(),
      })
      if (!check.ok) {
        setError(check.error)
        return
      }
    }
    if (photoUrls.length > LISTING_PHOTO_MAX) {
      setError(`You can add up to ${LISTING_PHOTO_MAX} photos.`)
      return
    }
    setPending(true)
    setError('')
    setCustomError('')
    setPhotoError('')
    try {
      const request = await postRequest({
        title: title.trim(),
        details: details.trim(),
        category,
        categoryCustom: customValue,
        neighborhood: '',
        when,
        whenLabel: computedWhenLabel,
        budget: budgetType === 'open' ? 0 : budget,
        budgetType,
        locationLabel: locationLabel.trim() || undefined,
        lat,
        lng,
        exactAddress: exactAddress.trim() || undefined,
        scheduledFor,
        scheduledEnd,
        preferredHelperId: preferredHelper?.id ?? null,
        images: photoUrls,
        image: listingCoverImage(photoUrls) || undefined,
        isUrgent: needsHelpNow,
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

        {preferredHelper ? (
          <div
            className="mb-5 flex items-center gap-3 rounded-lg border border-[rgba(29,92,229,0.2)] px-4 py-3"
            style={{ backgroundColor: '#EEF4FF' }}
          >
            <Avatar src={preferredHelper.avatar} name={preferredHelper.name} size={40} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: INK }}>
                Prefer {firstName(preferredHelper.name)}
              </p>
              <p className="text-[13px]" style={{ color: MUTED }}>
                They’ll be invited first when you post.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <form className="space-y-4" onSubmit={onSubmit} data-testid="post-request-form">
            {/* Smart draft */}
            <section className={cardClass()} style={{ backgroundColor: BUTTER }}>
              <h2 className="mb-1 text-[16px] font-semibold" style={{ color: INK }}>
                Smart Task Drafter
              </h2>
              <p className="mb-3 text-[13px]" style={{ color: MUTED }}>
                Describe the job in a sentence — we’ll draft title, details, and a budget hint.
              </p>
              <TextArea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Need help hauling boxes to the curb this Saturday afternoon…"
                rows={3}
                className="min-h-[96px]"
              />
              <div className="mt-3 flex justify-end">
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

            {/* Photos */}
            <section className={cardClass()} data-testid="post-photos-section">
              <h2 className="mb-1 text-[16px] font-semibold" style={{ color: INK }}>
                Photos
              </h2>
              <p className="mb-3 text-[13px]" style={{ color: MUTED }}>
                Optional. {LISTING_PHOTO_HINT}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                multiple
                className="hidden"
                data-testid="post-photo-input"
                onChange={(e) => void onPhotosSelected(e.target.files)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={photoPending}
                  disabled={photoUrls.length >= LISTING_PHOTO_MAX}
                  onClick={() => fileRef.current?.click()}
                  data-testid="post-photo-add"
                >
                  <Camera className="h-4 w-4" aria-hidden />
                  {photoUrls.length ? 'Add more photos' : 'Add photos'}
                </Button>
                <span className="text-[13px]" style={{ color: MUTED }} data-testid="post-photo-count">
                  {photoUrls.length}/{LISTING_PHOTO_MAX}
                </span>
              </div>
              {photoError ? (
                <p
                  className="mt-2 text-[13px] font-medium text-red-600"
                  role="alert"
                  data-testid="post-photo-error"
                >
                  {photoError}
                </p>
              ) : null}
              {photoUrls.length ? (
                <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5" data-testid="post-photo-thumbs">
                  {photoUrls.map((url, i) => (
                    <li key={`${url}-${i}`} className="relative aspect-square overflow-hidden rounded-lg bg-[#F1F5F9]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label={`Remove photo ${i + 1}`}
                        data-testid={`post-photo-remove-${i}`}
                        onClick={() => void removePhotoAt(i)}
                        className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#071330]/75 text-white"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {/* Category */}
            <section className={cardClass()}>
              <h2 className="mb-1 text-[16px] font-semibold" style={{ color: INK }}>
                Category
              </h2>
              <p className="mb-4 text-[13px]" style={{ color: MUTED }}>
                Choose a main category, then the specific service helpers filter by.
              </p>
              <CategorySelect
                serviceId={category}
                customLabel={categoryCustom}
                onServiceChange={(id) => {
                  setCategory(id)
                  setCustomError('')
                  if (id !== 'other') setCategoryCustom('')
                }}
                onCustomChange={(v) => {
                  setCategoryCustom(v)
                  setCustomError('')
                }}
                customError={customError}
                testIdPrefix="post-category"
              />
            </section>

            {/* Title & Details */}
            <section className={cardClass()}>
              <h2 className="mb-4 text-[16px] font-semibold" style={{ color: INK }}>
                Title &amp; Details
              </h2>

              <Field label="Title" required hint={`${title.length}/${TITLE_MAX}`}>
                <TextInput
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                  placeholder="What do you need done?"
                  required
                  data-testid="post-title"
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
                    data-testid="post-details"
                  />
                </Field>
              </div>
            </section>

            {/* Location */}
            <section className={cardClass()}>
              <h2 className="mb-1 text-[16px] font-semibold" style={{ color: INK }}>
                Location
              </h2>
              <p className="mb-4 text-[13px]" style={{ color: MUTED }}>
                Where will the job take place?
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

            {/* When — exactly two modes; not a pill chip row */}
            <section className={cardClass()} data-testid="post-when-section">
              <h2
                id="post-when-heading"
                className="mb-1 text-[16px] font-semibold"
                style={{ color: INK }}
              >
                When
              </h2>
              <p className="mb-4 text-[13px]" style={{ color: MUTED }}>
                Choose urgency or a specific date. Arrival is still agreed when you accept a helper.
              </p>

              <div
                role="radiogroup"
                aria-labelledby="post-when-heading"
                className="grid gap-2"
                data-testid="post-when-mode-group"
              >
                {WHEN_MODES.map((mode) => {
                  const selected = when === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`post-when-${mode.id}`}
                      onClick={() => selectWhenMode(mode.id)}
                      className={`flex items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/25 ${
                        selected
                          ? 'border-[#1D5CE5] bg-[#F5F9FF] ring-1 ring-[#1D5CE5]/20'
                          : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected
                            ? 'border-[#1D5CE5] bg-[#1D5CE5]'
                            : 'border-[#CBD5E1] bg-white'
                        }`}
                        aria-hidden
                      >
                        {selected ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-[#071330]">
                          {mode.title}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-[1.45] text-[#64748B]">
                          {mode.body}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <label
                className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-[#E2E8F0] bg-[#F5F9FF] px-4 py-3.5"
                data-testid="post-needs-help-now"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#1D5CE5]"
                  checked={needsHelpNow}
                  onChange={(e) => setNeedsHelpNow(e.target.checked)}
                  data-testid="post-needs-help-now-checkbox"
                />
                <span>
                  <span className="block text-[15px] font-semibold text-[#071330]">
                    I need help now
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-[#64748B]">
                    Text verified helpers nearby who turned on optional urgent alerts. Regular
                    posts stay the same when this is off.
                  </span>
                </span>
              </label>

              {when === 'asap' ? (
                <p
                  className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[13.5px] leading-relaxed text-[#475569]"
                  data-testid="post-asap-note"
                >
                  {ASAP_ARRIVAL_NOTE}
                </p>
              ) : (
                <div
                  className="mt-4 space-y-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                  data-testid="post-time-window"
                >
                  <Field label="Date">
                    <TextInput
                      type="date"
                      value={scheduledDate}
                      min={todayISO}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      data-testid="post-scheduled-date"
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Start time" hint="Local time">
                      <TextInput
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                        data-testid="post-start-time"
                      />
                    </Field>
                    <Field label="End time (optional)" hint="Must be after start">
                      <TextInput
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        data-testid="post-end-time"
                      />
                    </Field>
                  </div>

                  <p className="text-[13px]" style={{ color: MUTED }} data-testid="post-when-preview">
                    Shows as{' '}
                    <span className="font-semibold" style={{ color: INK }}>
                      {computedWhenLabel}
                    </span>
                  </p>
                </div>
              )}
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
                  <Field
                    label="Budget (USD)"
                    hint="Helpers still name their price — this sets expectations."
                  >
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
                data-testid="post-error"
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
            <div className="mt-4 rounded-lg border border-[rgba(7,19,48,0.08)] bg-white px-4 py-3.5">
              <p className="text-[14px] font-semibold" style={{ color: INK }}>
                {matchCount} helper{matchCount === 1 ? '' : 's'} nearby
              </p>
              <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
                Based on category, timing, and job location. Helpers choose their own travel distance
                when browsing.
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
