'use client'

import {
  AlertCircle,
  Camera,
  MapPin,
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
import {
  formatZipLocationLabel,
  formatZipPlaceLabel,
  type ZipPlace,
} from '@/lib/zip/format'
import type {
  CategoryId,
  HelpRequest,
  WhenOption,
} from '@/types'

const PAGE_BG = '#FFFFFF'
const INK = '#071330'
const MUTED = '#4A5568'
const NOTICE_BG = '#EEF2F7'

const PRICE_PRESETS = [40, 60, 80, 100, 120] as const
const TITLE_MAX = 70
const DETAILS_MAX = 1200
const DEFAULT_START: ClockTime = { hours: 14, minutes: 0 }

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
  return `border-0 border-b border-[#E3E8EF] bg-transparent p-5 sm:p-6 last:border-b-0 ${extra}`
}

/** New post form: only asap | scheduled expose / hide the clock UI. */
function isScheduledMode(when: WhenOption): boolean {
  return when === 'scheduled'
}

const WHEN_MODES = [
  {
    id: 'asap' as const,
    title: 'I need help as soon as possible',
  },
  {
    id: 'scheduled' as const,
    title: 'I need help on this date and time',
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
  const dateParam = (params.get('date') || params.get('scheduledDate') || '').trim()
  const timeParam = (params.get('time') || params.get('start') || '').trim()
  const zipParam = (params.get('zip') || '').trim()
  const detailsParam = (params.get('details') || '').trim()
  const titleParam = (params.get('title') || '').trim()
  const budgetParamRaw = (params.get('budget') || '').trim()
  const budgetParam = Number(budgetParamRaw)
  const budgetTypeParam = params.get('budgetType')
  const whenParam = params.get('when')
  const prefillsFromHelperBook =
    Boolean(helperId) &&
    (Boolean(dateParam) ||
      Boolean(timeParam) ||
      Boolean(zipParam) ||
      Boolean(detailsParam) ||
      Boolean(titleParam) ||
      Number.isFinite(budgetParam))

  const [category, setCategory] = useState<ServiceCategoryId>(initialCategory)
  const [categoryCustom, setCategoryCustom] = useState('')
  const [customError, setCustomError] = useState('')
  const [title, setTitle] = useState(() => titleParam.slice(0, TITLE_MAX))
  const [details, setDetails] = useState(() => detailsParam.slice(0, DETAILS_MAX))
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBlocked, setAiBlocked] = useState('')
  const [aiPending, setAiPending] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photoPending, setPhotoPending] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const [zipInput, setZipInput] = useState(() => {
    const fromParam = zipParam.match(/^\d{5}/)?.[0]
    if (fromParam) return fromParam
    return ''
  })
  const [zipPlace, setZipPlace] = useState<ZipPlace | null>(null)
  const [zipLookupError, setZipLookupError] = useState('')
  const [zipResolving, setZipResolving] = useState(false)
  const [geoPending, setGeoPending] = useState(false)
  const [zipSubmitAttempted, setZipSubmitAttempted] = useState(false)
  const zipDigits = zipInput.replace(/\D/g, '').slice(0, 5)

  const [nowTick, setNowTick] = useState(() => Date.now())
  // Prefill scheduled mode when request-to-book sent a date; otherwise ASAP.
  const [when, setWhen] = useState<WhenOption>(() => {
    if (whenParam === 'scheduled' || dateParam) return 'scheduled'
    if (whenParam === 'asap') return 'asap'
    return prefillsFromHelperBook && dateParam ? 'scheduled' : 'asap'
  })
  const [scheduledDate, setScheduledDate] = useState(() => dateParam)
  const [startTime, setStartTime] = useState(() => {
    if (timeParam && parseTimeInput(timeParam)) return timeParam
    return formatTimeInput(DEFAULT_START)
  })
  const [endTime, setEndTime] = useState('')

  const [budget, setBudget] = useState(() => {
    if (Number.isFinite(budgetParam) && budgetParam >= 10) return Math.round(budgetParam)
    return 60
  })
  /** Unchecked = firm price; checked = helpers may propose a different amount. */
  const [acceptsOffers, setAcceptsOffers] = useState(() => {
    if (budgetTypeParam === 'open') return true
    if (budgetTypeParam === 'fixed') return false
    return false
  })
  /** Optional SMS urgency flag; regular ASAP/scheduled posts stay unchanged when false. */
  const [needsHelpNow, setNeedsHelpNow] = useState(false)

  const [error, setError] = useState('')
  const [titleError, setTitleError] = useState('')
  const [detailsError, setDetailsError] = useState('')
  const [pending, setPending] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const detailsInputRef = useRef<HTMLTextAreaElement>(null)

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

  const resolvedZipPlace =
    zipPlace && zipPlace.zip === zipDigits ? zipPlace : null
  const resolvedZipError =
    zipLookupError && zipDigits.length === 5 && !resolvedZipPlace
      ? zipLookupError
      : zipSubmitAttempted && zipDigits.length !== 5
        ? 'Enter a 5-digit US ZIP code'
        : ''

  const draft = useMemo<HelpRequest>(
    () => ({
      id: 'draft-preview',
      title: title.trim() || 'Your request title',
      details: details.trim() || 'Details helpers will read before offering a price…',
      category,
      neighborhood: '',
      when,
      whenLabel: computedWhenLabel,
      budget: budget || 0,
      budgetType: acceptsOffers ? 'open' : 'fixed',
      acceptsOffers,
      status: 'open',
      requesterId: currentUser.id,
      image: coverImage,
      images: photoUrls,
      createdAt: new Date().toISOString(),
      locationLabel: resolvedZipPlace
        ? formatZipLocationLabel(resolvedZipPlace)
        : undefined,
      city: resolvedZipPlace?.city ?? null,
      stateCode: resolvedZipPlace?.stateCode ?? null,
      zip: resolvedZipPlace?.zip ?? null,
      lat: resolvedZipPlace?.lat ?? null,
      lng: resolvedZipPlace?.lng ?? null,
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
      acceptsOffers,
      budget,
      currentUser.id,
      coverImage,
      photoUrls,
      resolvedZipPlace,
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

  // Resolve ZIP only through the server gazetteer API (never ship the table to the client).
  useEffect(() => {
    if (zipDigits.length !== 5) return

    let cancelled = false
    const handle = window.setTimeout(async () => {
      setZipResolving(true)
      try {
        const res = await fetch(`/api/zip?zip=${encodeURIComponent(zipDigits)}`)
        if (cancelled) return
        if (res.status === 404) {
          setZipPlace(null)
          setZipLookupError('We could not find that ZIP code')
          return
        }
        if (!res.ok) {
          setZipPlace(null)
          setZipLookupError('Could not look up that ZIP. Try again.')
          return
        }
        const data = (await res.json()) as {
          zip: string
          lat: number
          lng: number
          city: string
          stateCode: string
        }
        setZipPlace({
          zip: data.zip,
          lat: data.lat,
          lng: data.lng,
          city: data.city,
          stateCode: data.stateCode,
        })
        setZipLookupError('')
      } catch {
        if (!cancelled) {
          setZipPlace(null)
          setZipLookupError('Could not look up that ZIP. Try again.')
        }
      } finally {
        if (!cancelled) setZipResolving(false)
      }
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [zipDigits])

  async function onUseMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.')
      return
    }
    setGeoPending(true)
    setError('')
    setZipLookupError('')
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: false,
        }),
      )
      const res = await fetch(
        `/api/zip?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
      )
      if (!res.ok) throw new Error('Could not resolve ZIP')
      const data = (await res.json()) as {
        zip: string
        lat: number
        lng: number
        city: string
        stateCode: string
      }
      setZipInput(data.zip)
      setZipPlace({
        zip: data.zip,
        lat: data.lat,
        lng: data.lng,
        city: data.city,
        stateCode: data.stateCode,
      })
      setZipLookupError('')
    } catch {
      setError('Could not detect your location. Enter a 5-digit ZIP instead.')
    } finally {
      setGeoPending(false)
    }
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
      setPhotoError(`Only ${LISTING_PHOTO_MAX} photos allowed. Kept the first ${remaining}.`)
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
    const nextTitleError = title.trim() ? '' : 'Add a title so helpers know what you need.'
    const nextDetailsError = details.trim()
      ? ''
      : 'Add a few details so helpers know what to expect.'
    setTitleError(nextTitleError)
    setDetailsError(nextDetailsError)
    if (nextTitleError || nextDetailsError) {
      setError('Add a title and a few details so helpers know what to expect.')
      const first = nextTitleError ? titleInputRef.current : detailsInputRef.current
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      first?.focus()
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
    if (budget < 10) {
      setError('Price should be at least $10.')
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
    setZipSubmitAttempted(true)
    if (zipResolving) {
      setError('Looking up ZIP…')
      return
    }
    if (zipDigits.length !== 5 || !resolvedZipPlace) {
      const message =
        resolvedZipError ||
        (zipDigits.length === 5
          ? 'We could not find that ZIP code'
          : 'Enter a 5-digit US ZIP code')
      setError(message)
      return
    }
    setPending(true)
    setError('')
    setTitleError('')
    setDetailsError('')
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
        budget,
        budgetType: acceptsOffers ? 'open' : 'fixed',
        acceptsOffers,
        locationLabel: formatZipLocationLabel(resolvedZipPlace),
        city: resolvedZipPlace.city,
        stateCode: resolvedZipPlace.stateCode,
        zip: resolvedZipPlace.zip,
        lat: resolvedZipPlace.lat,
        lng: resolvedZipPlace.lng,
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
      <div className="beam-container">
        <header className="mb-6">
          <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]" style={{ color: INK }}>
            Post a task
          </h1>
          <p className="mt-1 text-[15px]" style={{ color: MUTED }}>
            Describe the job once. Helpers nearby can offer a price.
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
          <form
            className="space-y-4"
            onSubmit={onSubmit}
            data-testid="post-request-form"
            noValidate
          >
            {/* Draft helper */}
            <section className={cardClass()} style={{ backgroundColor: '#FFFFFF' }}>
              <h2 className="mb-1 text-[16px] font-semibold" style={{ color: INK }}>
                Describe it in one sentence
              </h2>
              <p className="mb-3 text-[13px]" style={{ color: MUTED }}>
                Describe the job in a sentence. We’ll draft title, details, and a price hint.
              </p>
              <label htmlFor="post-draft-prompt" className="sr-only">
                Describe the job in one sentence
              </label>
              <TextArea
                id="post-draft-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Need help hauling boxes to the curb this Saturday afternoon"
                rows={3}
                className="min-h-[96px]"
                aria-label="Describe the job in one sentence"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  loading={aiPending}
                  onClick={() => void onDraftWithAi()}
                >
                  Draft with AI
                </Button>
              </div>
              {aiBlocked ? (
                <p
                  className="mt-3 flex items-start gap-2 rounded-lg border border-[#D7E0EC] px-3 py-2 text-[13px] leading-snug text-[#071330]"
                  style={{ backgroundColor: NOTICE_BG }}
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]" aria-hidden />
                  <span>{aiBlocked}</span>
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
                  className="mt-2 flex items-start gap-2 rounded-lg border border-[#D7E0EC] bg-white px-3 py-2 text-[13px] font-medium text-[#071330]"
                  role="alert"
                  data-testid="post-photo-error"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]" aria-hidden />
                  <span>{photoError}</span>
                </p>
              ) : null}
              {photoUrls.length ? (
                <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5" data-testid="post-photo-thumbs">
                  {photoUrls.map((url, i) => (
                    <li key={`${url}-${i}`} className="relative aspect-square overflow-hidden rounded-lg bg-[#EEF2F7]">
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

              <Field
                label="Title"
                required
                hint={titleError ? undefined : `${title.length}/${TITLE_MAX}`}
                error={titleError || undefined}
                errorId="post-title-error"
              >
                <TextInput
                  ref={titleInputRef}
                  id="post-title"
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => {
                    setTitle(e.target.value.slice(0, TITLE_MAX))
                    if (titleError) setTitleError('')
                  }}
                  placeholder="What do you need done?"
                  aria-invalid={titleError ? true : undefined}
                  aria-describedby={titleError ? 'post-title-error' : undefined}
                  data-testid="post-title"
                />
              </Field>

              <div className="mt-4">
                <Field
                  label="Details"
                  required
                  hint={
                    detailsError
                      ? undefined
                      : `${details.length}/${DETAILS_MAX} · Be specific about access, timing, and tools.`
                  }
                  error={detailsError || undefined}
                  errorId="post-details-error"
                >
                  <TextArea
                    ref={detailsInputRef}
                    id="post-details"
                    value={details}
                    maxLength={DETAILS_MAX}
                    onChange={(e) => {
                      setDetails(e.target.value.slice(0, DETAILS_MAX))
                      if (detailsError) setDetailsError('')
                    }}
                    placeholder="A few sentences helpers can trust…"
                    rows={5}
                    aria-invalid={detailsError ? true : undefined}
                    aria-describedby={detailsError ? 'post-details-error' : undefined}
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
                Where will the job take place? We use your ZIP center for nearby matching, not a street address.
              </p>

              <div className="space-y-1.5">
                <span className="type-meta text-beam-muted">ZIP code</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <MapPin
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: MUTED }}
                      aria-hidden
                    />
                    <TextInput
                      value={zipInput}
                      onChange={(e) => {
                        const next = e.target.value.replace(/\D/g, '').slice(0, 5)
                        setZipInput(next)
                        setZipLookupError('')
                        if (next.length !== 5) {
                          setZipPlace(null)
                          setZipResolving(false)
                        }
                      }}
                      placeholder="95124"
                      className="pl-10"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={5}
                      aria-invalid={resolvedZipError ? true : undefined}
                      aria-describedby={
                        resolvedZipError
                          ? 'post-zip-error'
                          : resolvedZipPlace
                            ? 'post-zip-resolved'
                            : 'post-zip-hint'
                      }
                      data-testid="post-zip"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void onUseMyLocation()}
                    loading={geoPending}
                    className="shrink-0 whitespace-nowrap"
                    data-testid="post-use-location"
                  >
                    Use my current location
                  </Button>
                </div>
                {resolvedZipError ? (
                  <span
                    id="post-zip-error"
                    className="mt-1 flex items-start gap-2 rounded-lg border border-[#D7E0EC] bg-white px-3 py-2 type-sec text-[#071330]"
                    role="alert"
                    data-testid="post-zip-error"
                  >
                    {resolvedZipError}
                  </span>
                ) : resolvedZipPlace ? (
                  <span
                    id="post-zip-resolved"
                    className="block type-sec text-beam-muted"
                    data-testid="post-zip-resolved"
                  >
                    {formatZipPlaceLabel(resolvedZipPlace)}
                  </span>
                ) : (
                  <span id="post-zip-hint" className="block type-sec text-beam-muted">
                    {zipResolving
                      ? 'Looking up ZIP…'
                      : '5-digit US ZIP. Helpers see the area, not your street.'}
                  </span>
                )}
              </div>
            </section>

            {/* When — two flat radio rows + optional Text nearby helpers */}
            <section className={cardClass()} data-testid="post-when-section">
              <h2
                id="post-when-heading"
                className="mb-1 text-[16px] font-semibold"
                style={{ color: INK }}
              >
                When
              </h2>
              <p className="mb-4 text-[13px]" style={{ color: MUTED }}>
                Pick when you need help.
              </p>

              <div
                role="radiogroup"
                aria-labelledby="post-when-heading"
                className="border-y border-[#E3E8EF]"
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
                      className={`relative flex w-full items-center gap-3 border-b border-[#E3E8EF] py-3.5 pl-3 pr-1 text-left last:border-b-0 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/25 ${
                        selected ? 'bg-white' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {selected ? (
                        <span
                          className="absolute inset-y-0 left-0 w-[3px] bg-[#1D5CE5]"
                          aria-hidden
                        />
                      ) : null}
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
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
                      <span className="min-w-0 flex-1 text-[15px] font-semibold text-[#071330]">
                        {mode.title}
                      </span>
                    </button>
                  )
                })}
              </div>

              {when === 'scheduled' ? (
                <div className="mt-4 space-y-3" data-testid="post-time-window">
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
              ) : null}

              <label
                className="mt-4 flex cursor-pointer items-start gap-3 border-t border-[#E3E8EF] pt-4"
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
                    Text nearby helpers
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-[#4A5568]">
                    Check this if it&apos;s urgent. We&apos;ll text helpers near you who turned on
                    urgent job alerts, so someone can respond faster. Leave it unchecked for regular
                    posts.
                  </span>
                </span>
              </label>
            </section>

            {/* Price */}
            <section className={cardClass()} data-testid="post-price-section">
              <h2 className="mb-4 text-[16px] font-semibold" style={{ color: INK }}>
                Price
              </h2>
              <div className="space-y-3">
                <Field label="Your price (USD)">
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
                      data-testid="post-price-input"
                    />
                  </div>
                </Field>
                <div className="flex flex-wrap gap-2" data-testid="post-price-chips">
                  {PRICE_PRESETS.map((p) => (
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

              <label
                className="mt-4 flex cursor-pointer items-start gap-3 border-t border-[#E3E8EF] pt-4"
                data-testid="post-accepts-offers"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#1D5CE5]"
                  checked={acceptsOffers}
                  onChange={(e) => setAcceptsOffers(e.target.checked)}
                  data-testid="post-accepts-offers-checkbox"
                />
                <span>
                  <span className="block text-[15px] font-semibold text-[#071330]">
                    Open to offers
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-[#4A5568]">
                    Helpers can suggest a different price. Leave unchecked if your price is firm.
                  </span>
                </span>
              </label>
            </section>

            {error ? (
              <p
                className="flex items-start gap-2 rounded-lg border border-[#D7E0EC] bg-white px-4 py-3 text-[14px] text-[#071330]"
                role="alert"
                data-testid="post-error"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]" aria-hidden />
                <span>{error}</span>
              </p>
            ) : null}

            <Button type="submit" variant="brand" size="lg" className="w-full" loading={pending}>
              Post a task
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
