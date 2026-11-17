'use client'

import {
  AlertCircle,
  Camera,
  Loader2,
  MapPin,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RequestCard } from '@/components/RequestCard'
import { CategorySelect } from '@/components/CategorySelect'
import {
  Avatar,
  Button,
  Field,
  FieldInlineError,
  FormErrorAlert,
  Skeleton,
  TextArea,
  TextInput,
} from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import {
  focusAndScroll,
  FORM_SAVE_FAILED,
  humanizeSaveError,
  scrollAlertIntoView,
} from '@/lib/formErrors'
import { getCategory, categoryLabel } from '@/data/categories'
import { deleteBeamMedia, uploadBeamMedia } from '@/lib/beam/storageUpload'
import { readBrowseLocationPin } from '@/lib/browseLocationPreference'
import {
  LISTING_PHOTO_HINT,
  LISTING_PHOTO_MAX,
  listingCoverImage,
} from '@/lib/listingPhotos'
import {
  addLocalDays,
  ASAP_WHEN_LABEL,
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
  normalizeZipInput,
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
const PILL = '#EEF2F7'
const OUTLINE = '#D7E0EC'
const LINK = '#1649BD'
const PRIMARY = '#1D5CE5'
const NOTICE_BG = '#EEF2F7'

const TITLE_MAX = 70
const DETAILS_MAX = 1200
const DEFAULT_START: ClockTime = { hours: 14, minutes: 0 }

const EXAMPLE_CHIPS = [
  'Weekly house cleaning',
  'Move a couch',
  'Haul junk from the garage',
  'Mount a TV',
] as const

type FlowStep = 'describe' | 'review'
type EditRow =
  | null
  | 'category'
  | 'title'
  | 'details'
  | 'when'
  | 'location'
  | 'price'

type DraftAiResponse = {
  blocked?: boolean
  reason?: string
  category?: CategoryId
  title?: string
  details?: string
  when?: WhenOption
  whenLabel?: string
  scheduledDate?: string
  startTime?: string
  suggestedBudget?: number
  error?: string
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function isScheduledMode(when: WhenOption): boolean {
  return when === 'scheduled'
}

function sentenceTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const capped = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  return capped.length > TITLE_MAX ? capped.slice(0, TITLE_MAX) : capped
}

function knownZipFromSources(input: {
  paramZip?: string
  helperZip?: string | null
  pinZip?: string | null
  locationLabel?: string | null
  recentJobZip?: string | null
}): string {
  const fromParam = normalizeZipInput(input.paramZip || '')
  if (fromParam) return fromParam
  const fromHelper = normalizeZipInput(input.helperZip || '')
  if (fromHelper) return fromHelper
  const fromProfile = (input.locationLabel || '').match(/\b(\d{5})\b/)
  if (fromProfile) return fromProfile[1]
  const fromJob = normalizeZipInput(input.recentJobZip || '')
  if (fromJob) return fromJob
  const fromPin = normalizeZipInput(input.pinZip || '')
  if (fromPin) return fromPin
  return ''
}

function ReviewRow({
  label,
  value,
  editing,
  onToggle,
  children,
  testId,
}: {
  label: string
  value: ReactNode
  editing: boolean
  onToggle: () => void
  children?: ReactNode
  testId: string
}) {
  return (
    <div
      className="border-b border-[#E3E8EF] py-4 last:border-b-0"
      data-testid={testId}
      data-editing={editing ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium" style={{ color: MUTED }}>
            {label}
          </p>
          {!editing ? (
            <div className="mt-1 text-[15px] font-semibold leading-snug" style={{ color: INK }}>
              {value}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 text-[14px] font-semibold"
          style={{ color: LINK }}
          data-testid={`${testId}-edit`}
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      {editing ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}

export function PostRequest() {
  const { postRequest, getPerson, state, mode, currentUser, authUser, helperVerification } =
    useBeam()
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
  const qParam = (params.get('q') || '').trim()
  const searchSeed = (titleParam || qParam).trim()
  const fromSearch = Boolean(searchSeed)
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

  const recentOwnJobs = useMemo(() => {
    return state.requests
      .filter((r) => r.requesterId === currentUser.id)
      .slice()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 3)
  }, [state.requests, currentUser.id])

  const [step, setStep] = useState<FlowStep>('describe')
  const [editingRow, setEditingRow] = useState<EditRow>(null)
  const [showPhotos, setShowPhotos] = useState(false)
  const [showZipEditor, setShowZipEditor] = useState(false)
  const [budgetFromAi, setBudgetFromAi] = useState(false)

  const [category, setCategory] = useState<ServiceCategoryId>(initialCategory)
  const [categoryCustom, setCategoryCustom] = useState('')
  const [customError, setCustomError] = useState('')
  const [title, setTitle] = useState(() =>
    titleParam ? titleParam.slice(0, TITLE_MAX) : '',
  )
  const [details, setDetails] = useState(() => detailsParam.slice(0, DETAILS_MAX))
  const [aiPrompt, setAiPrompt] = useState(() => searchSeed)
  const [aiBlocked, setAiBlocked] = useState('')
  const [aiPending, setAiPending] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photoPending, setPhotoPending] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const [zipPrefillReady, setZipPrefillReady] = useState(false)
  const [zipInput, setZipInput] = useState(() => {
    const fromParam = zipParam.match(/^\d{5}/)?.[0]
    return fromParam || ''
  })
  const [zipPlace, setZipPlace] = useState<ZipPlace | null>(null)
  const [zipLookupError, setZipLookupError] = useState('')
  const [zipResolving, setZipResolving] = useState(false)
  const [zipSubmitAttempted, setZipSubmitAttempted] = useState(false)
  const zipDigits = zipInput.replace(/\D/g, '').slice(0, 5)

  const [nowTick, setNowTick] = useState(() => Date.now())
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

  const [budget, setBudget] = useState(() => {
    if (Number.isFinite(budgetParam) && budgetParam >= 10) return Math.round(budgetParam)
    return 60
  })
  /** Open to offers defaults on for the two-step flow. */
  const [acceptsOffers, setAcceptsOffers] = useState(() => {
    if (budgetTypeParam === 'open') return true
    if (budgetTypeParam === 'fixed') return false
    return true
  })

  const [error, setError] = useState('')
  const [titleError, setTitleError] = useState('')
  const [budgetError, setBudgetError] = useState('')
  const [zipFieldError, setZipFieldError] = useState('')
  const [pending, setPending] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const detailsInputRef = useRef<HTMLTextAreaElement>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)
  const budgetInputRef = useRef<HTMLInputElement>(null)
  const formErrorAlertRef = useRef<HTMLDivElement>(null)

  const cat = useMemo(() => getCategory(category), [category])
  const todayISO = localDateISO(new Date(nowTick))
  const tomorrowISO = addLocalDays(todayISO, 1)

  /** ASAP maps to urgent / Text nearby helpers behavior. */
  const needsHelpNow = when === 'asap'

  const activeDateISO = isScheduledMode(when) ? scheduledDate || null : null
  const startClock = isScheduledMode(when) ? parseTimeInput(startTime) : null

  const computedWhenLabel = useMemo(
    () =>
      buildWhenLabel({
        when: isScheduledMode(when) ? 'scheduled' : 'asap',
        dateISO: activeDateISO,
        start: startClock,
        end: null,
      }),
    [when, activeDateISO, startClock],
  )

  const scheduledFor =
    isScheduledMode(when) && activeDateISO && startClock
      ? combineLocalDateTime(activeDateISO, startClock).toISOString()
      : null
  const scheduledEnd = null

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
      preferredHelper?.id,
      needsHelpNow,
    ],
  )

  const matchCount = useMemo(
    () => rankHelpersForRequest(draft, state.people, [currentUser.id]).length,
    [draft, state.people, currentUser.id],
  )

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    setZipPrefillReady(true)
  }, [])

  // Prefill ZIP from profile / verified home / most recent job / browse pin.
  useEffect(() => {
    if (!zipPrefillReady) return
    if (zipInput) return
    const recentJobZip = recentOwnJobs.find((j) => normalizeZipInput(j.zip || ''))?.zip
    const next = knownZipFromSources({
      paramZip: zipParam,
      helperZip: helperVerification?.zip,
      pinZip: readBrowseLocationPin()?.zip,
      locationLabel: currentUser?.locationLabel,
      recentJobZip,
    })
    if (next) setZipInput(next)
  }, [
    zipPrefillReady,
    zipInput,
    zipParam,
    helperVerification?.zip,
    currentUser?.locationLabel,
    recentOwnJobs,
  ])

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

  function selectWhenMode(id: 'asap' | 'scheduled') {
    if (id === 'asap') {
      setWhen('asap')
      setScheduledDate('')
      setStartTime(formatTimeInput(DEFAULT_START))
      return
    }
    setWhen('scheduled')
    setScheduledDate((prev) => prev || tomorrowISO)
    setStartTime((prev) => prev || formatTimeInput(DEFAULT_START))
  }

  function applyDraftToForm(data: DraftAiResponse, fallbackPrompt: string) {
    if (data.category && isCategoryId(data.category)) setCategory(data.category)
    if (data.title) setTitle(data.title.slice(0, TITLE_MAX))
    else setTitle(sentenceTitle(fallbackPrompt))
    if (data.details) setDetails(data.details.slice(0, DETAILS_MAX))
    if (data.when === 'scheduled') {
      setWhen('scheduled')
      setScheduledDate(data.scheduledDate || tomorrowISO)
      if (data.startTime && parseTimeInput(data.startTime)) {
        setStartTime(data.startTime)
      } else {
        setStartTime(formatTimeInput(DEFAULT_START))
      }
    } else {
      setWhen('asap')
      setScheduledDate('')
      setStartTime(formatTimeInput(DEFAULT_START))
    }
    if (typeof data.suggestedBudget === 'number' && data.suggestedBudget >= 10) {
      setBudget(data.suggestedBudget)
      setBudgetFromAi(true)
    }
  }

  async function onContinueFromDescribe() {
    const prompt = aiPrompt.trim()
    if (!prompt) {
      setAiBlocked('Describe what you need so we can draft the task.')
      promptRef.current?.focus()
      return
    }
    setAiPending(true)
    setAiBlocked('')
    setError('')
    setBudgetFromAi(false)
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
        setTitle(sentenceTitle(prompt))
        setStep('review')
        setEditingRow(null)
        return
      }
      if (data.blocked) {
        setAiBlocked(data.reason || 'That request is not allowed on Bunk.')
        setTitle(sentenceTitle(prompt))
        setStep('review')
        setEditingRow(null)
        return
      }
      applyDraftToForm(data, prompt)
      setStep('review')
      setEditingRow(null)
    } catch {
      setAiBlocked('Could not reach the drafting service. Try again.')
      setTitle(sentenceTitle(prompt))
      setStep('review')
      setEditingRow(null)
    } finally {
      setAiPending(false)
    }
  }

  function onPostAgain(job: HelpRequest) {
    const service: ServiceCategoryId = isCategoryId(job.category)
      ? job.category
      : 'other'
    setCategory(service)
    setCategoryCustom(job.categoryCustom || '')
    setTitle(job.title.slice(0, TITLE_MAX))
    setDetails((job.details || '').slice(0, DETAILS_MAX))
    setAiPrompt(job.title)
    setBudget(job.budget >= 10 ? job.budget : 60)
    setBudgetFromAi(false)
    setAcceptsOffers(job.acceptsOffers !== false)
    selectWhenMode('asap')
    if (job.zip) setZipInput(normalizeZipInput(job.zip) || job.zip)
    setPhotoUrls([])
    setShowPhotos(false)
    setAiBlocked('')
    setError('')
    setEditingRow(null)
    setStep('review')
  }

  function toggleRow(row: Exclude<EditRow, null>) {
    setEditingRow((prev) => (prev === row ? null : row))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const issues: string[] = []
    let firstFocus: 'title' | 'category' | 'price' | 'when' | 'location' | null = null

    const nextTitleError = title.trim() ? '' : 'Add a title so helpers know what you need.'
    setTitleError(nextTitleError)
    if (nextTitleError) {
      issues.push(nextTitleError)
      if (!firstFocus) firstFocus = 'title'
    }

    let customValue: string | null = null
    if (category === 'other') {
      const normalized = normalizeOtherCustom(categoryCustom)
      if (!normalized.ok) {
        setCustomError(normalized.error)
        issues.push(normalized.error)
        if (!firstFocus) firstFocus = 'category'
      } else {
        setCustomError('')
        customValue = normalized.value
      }
    } else {
      setCustomError('')
    }

    const nextBudgetError =
      budget < 10 ? 'Price should be at least $10.' : ''
    setBudgetError(nextBudgetError)
    if (nextBudgetError) {
      issues.push(nextBudgetError)
      if (!firstFocus) firstFocus = 'price'
    }

    if (isScheduledMode(when)) {
      const check = validateTimeWindow({
        when: 'scheduled',
        dateISO: activeDateISO,
        start: startClock,
        end: null,
        now: new Date(),
      })
      if (!check.ok) {
        issues.push(check.error)
        if (!firstFocus) firstFocus = 'when'
      }
    }

    if (photoUrls.length > LISTING_PHOTO_MAX) {
      const photoMsg = `You can add up to ${LISTING_PHOTO_MAX} photos.`
      setPhotoError(photoMsg)
      issues.push(photoMsg)
    }

    setZipSubmitAttempted(true)
    let nextZipError = ''
    if (zipResolving) {
      nextZipError = 'Looking up ZIP…'
    } else if (zipDigits.length !== 5 || !resolvedZipPlace) {
      nextZipError =
        resolvedZipError ||
        (zipDigits.length === 5
          ? 'We could not find that ZIP code'
          : 'Enter a 5-digit US ZIP code')
    }
    setZipFieldError(nextZipError)
    if (nextZipError) {
      issues.push(nextZipError)
      if (!firstFocus) firstFocus = 'location'
    }

    if (issues.length > 0) {
      setError(issues.join(' '))
      if (firstFocus === 'title') {
        setEditingRow('title')
        focusAndScroll(titleInputRef.current)
      } else if (firstFocus === 'category') {
        setEditingRow('category')
      } else if (firstFocus === 'price') {
        setEditingRow('price')
        focusAndScroll(budgetInputRef.current)
      } else if (firstFocus === 'when') {
        setEditingRow('when')
      } else if (firstFocus === 'location') {
        setEditingRow('location')
        setShowZipEditor(true)
        focusAndScroll(zipInputRef.current)
      }
      scrollAlertIntoView(formErrorAlertRef.current)
      return
    }

    if (!resolvedZipPlace) return

    setPending(true)
    setError('')
    setTitleError('')
    setBudgetError('')
    setZipFieldError('')
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
      const postedQs = new URLSearchParams({ justPosted: '1' })
      if (mode === 'demo' || params.get('demo') === '1') postedQs.set('demo', '1')
      router.push(`/requests/${request.id}?${postedQs.toString()}`)
    } catch (err) {
      setError(humanizeSaveError(err, FORM_SAVE_FAILED))
      scrollAlertIntoView(formErrorAlertRef.current)
      setPending(false)
    }
  }

  const locationSummary = resolvedZipPlace
    ? formatZipPlaceLabel(resolvedZipPlace)
    : zipDigits.length === 5
      ? zipResolving
        ? 'Looking up ZIP…'
        : zipDigits
      : 'Add a ZIP'

  const categorySummary = categoryLabel(category, categoryCustom)
  const priceSummary = acceptsOffers
    ? `$${budget} · Open to offers`
    : `$${budget}`

  const stickyBar =
    step === 'describe' && !aiPending ? (
      <div
        className="mobile-sticky-above-dock fixed inset-x-0 bottom-0 z-50 border-t border-[#E3E8EF] bg-white px-4 py-3 lg:hidden"
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
        data-testid="post-sticky-continue"
      >
        <Button
          type="button"
          variant="brand"
          size="lg"
          className="w-full"
          onClick={() => void onContinueFromDescribe()}
          data-testid="post-continue-mobile"
        >
          Continue
        </Button>
      </div>
    ) : step === 'review' ? (
      <div
        className="mobile-sticky-above-dock fixed inset-x-0 bottom-0 z-50 border-t border-[#E3E8EF] bg-white px-4 py-3 lg:hidden"
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
        data-testid="post-sticky-submit"
      >
        <Button
          type="submit"
          form="post-request-form"
          variant="brand"
          size="lg"
          className="w-full"
          loading={pending}
          data-testid="post-submit-mobile"
        >
          Post task
        </Button>
      </div>
    ) : null

  return (
    <div
      className={`min-h-full py-2 sm:py-4 ${step === 'describe' && !aiPending ? 'pb-40 lg:pb-4' : step === 'review' ? 'pb-40 lg:pb-4' : ''}`}
      style={{ backgroundColor: PAGE_BG }}
    >
      <div className="beam-container">
        {preferredHelper ? (
          <div
            className="mb-5 flex items-center gap-3 rounded-lg border border-[rgba(29,92,229,0.2)] px-4 py-3"
            style={{ backgroundColor: '#EEF4FF' }}
            data-testid="post-preferred-helper"
          >
            <Avatar src={preferredHelper.avatar} name={preferredHelper.name} size={40} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: INK }}>
                Prefer {firstName(preferredHelper.name)}
              </p>
              <p className="text-[13px]" style={{ color: MUTED }}>
                They will be invited first when you post.
              </p>
            </div>
          </div>
        ) : null}

        {step === 'describe' || aiPending ? (
          <div className="mx-auto max-w-[640px]">
            <p
              className="text-[13px] font-medium"
              style={{ color: MUTED }}
              data-testid="post-step-label"
            >
              Step 1 of 2
            </p>
            <h1
              className="mt-1 text-[28px] font-bold tracking-tight sm:text-[32px]"
              style={{ color: INK }}
            >
              Post a task
            </h1>

            {aiPending ? (
              <div
                className="mt-6 rounded-xl border border-[#D7E0EC] bg-white p-5"
                data-testid="post-drafting"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    style={{ color: PRIMARY }}
                    aria-hidden
                  />
                  <p className="text-[16px] font-semibold" style={{ color: INK }}>
                    Drafting your task...
                  </p>
                </div>
                <div className="mt-5 space-y-4" aria-hidden>
                  {['Category', 'Title', 'Details', 'When', 'Location', 'Price'].map((label) => (
                    <div key={label} className="border-b border-[#E3E8EF] pb-4 last:border-b-0">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="mt-2 h-5 w-[75%] max-w-[280px]" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="post-draft-prompt"
                      className="text-[15px] font-semibold"
                      style={{ color: INK }}
                    >
                      What do you need done?
                    </label>
                    {fromSearch ? (
                      <span
                        className="rounded-md px-2 py-0.5 text-[12px] font-semibold"
                        style={{ backgroundColor: PILL, color: MUTED }}
                        data-testid="post-from-search"
                      >
                        From your search
                      </span>
                    ) : null}
                  </div>
                  <TextArea
                    ref={promptRef}
                    id="post-draft-prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Need help hauling boxes to the curb this Saturday afternoon"
                    rows={5}
                    className="min-h-[140px] text-[16px]"
                    aria-label="What do you need done?"
                    data-testid="post-describe-input"
                  />
                  <div className="mt-3 flex flex-wrap gap-2" data-testid="post-example-chips">
                    {EXAMPLE_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setAiPrompt(chip)}
                        className="min-h-10 rounded-md px-3 py-2 text-[13px] font-semibold transition hover:bg-[#E3E8EF]"
                        style={{ backgroundColor: PILL, color: INK }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4" data-testid="post-zip-meta">
                    {!showZipEditor ? (
                      <p className="text-[13px]" style={{ color: MUTED }}>
                        Near {zipDigits.length === 5 ? zipDigits : '_____'}
                        {' · '}
                        <button
                          type="button"
                          className="font-semibold"
                          style={{ color: LINK }}
                          onClick={() => setShowZipEditor(true)}
                          data-testid="post-zip-change"
                        >
                          Change
                        </button>
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <span className="type-meta text-beam-muted">ZIP code</span>
                        <div className="relative max-w-[200px]">
                          <MapPin
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                            style={{ color: MUTED }}
                            aria-hidden
                          />
                          <TextInput
                            ref={zipInputRef}
                            value={zipInput}
                            onChange={(e) => {
                              const next = e.target.value.replace(/\D/g, '').slice(0, 5)
                              setZipInput(next)
                              setZipLookupError('')
                              setZipFieldError('')
                              if (next.length !== 5) {
                                setZipPlace(null)
                                setZipResolving(false)
                              }
                            }}
                            placeholder="Enter ZIP"
                            className="pl-10"
                            inputMode="numeric"
                            autoComplete="postal-code"
                            maxLength={5}
                            aria-invalid={
                              resolvedZipError || zipFieldError ? true : undefined
                            }
                            data-testid="post-zip"
                          />
                        </div>
                        {resolvedZipError || zipFieldError ? (
                          <FieldInlineError testId="post-zip-error">
                            {zipFieldError || resolvedZipError}
                          </FieldInlineError>
                        ) : resolvedZipPlace ? (
                          <span
                            className="block text-[13px]"
                            style={{ color: MUTED }}
                            data-testid="post-zip-resolved"
                          >
                            {formatZipPlaceLabel(resolvedZipPlace)}
                          </span>
                        ) : (
                          <span className="block text-[13px]" style={{ color: MUTED }}>
                            {zipResolving ? 'Looking up ZIP…' : '5-digit US ZIP'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {aiBlocked ? (
                    <p
                      className="mt-4 flex items-start gap-2 rounded-lg border border-[#D7E0EC] px-3 py-2 text-[13px] leading-snug text-[#071330]"
                      style={{ backgroundColor: NOTICE_BG }}
                      role="alert"
                      data-testid="post-ai-notice"
                    >
                      <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]"
                        aria-hidden
                      />
                      <span>{aiBlocked}</span>
                    </p>
                  ) : null}

                  <div className="mt-6 hidden lg:block">
                    <Button
                      type="button"
                      variant="brand"
                      size="lg"
                      className="w-full"
                      onClick={() => void onContinueFromDescribe()}
                      data-testid="post-continue"
                    >
                      Continue
                    </Button>
                  </div>
                </div>

                {recentOwnJobs.length > 0 ? (
                  <section className="mt-10" data-testid="post-again-section">
                    <h2 className="text-[16px] font-semibold" style={{ color: INK }}>
                      Post again
                    </h2>
                    <ul className="mt-3 divide-y divide-[#E3E8EF] border-y border-[#E3E8EF]">
                      {recentOwnJobs.map((job) => (
                        <li
                          key={job.id}
                          className="flex items-start justify-between gap-3 py-3.5"
                          data-testid={`post-again-${job.id}`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold" style={{ color: INK }}>
                              {job.title}
                            </p>
                            <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
                              {job.acceptsOffers !== false
                                ? job.budget
                                  ? `$${job.budget} · Open to offers`
                                  : 'Open to offers'
                                : `$${job.budget}`}
                              {' · '}
                              {categoryLabel(job.category, job.categoryCustom)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 text-[14px] font-semibold"
                            style={{ color: LINK }}
                            onClick={() => onPostAgain(job)}
                          >
                            Post again
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {step === 'review' && !aiPending ? (
          <form
            id="post-request-form"
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"
            onSubmit={onSubmit}
            data-testid="post-request-form"
            noValidate
          >
            <div>
              <p
                className="text-[13px] font-medium"
                style={{ color: MUTED }}
                data-testid="post-step-label"
              >
                Step 2 of 2
              </p>
              <h1
                className="mt-1 text-[28px] font-bold tracking-tight sm:text-[32px]"
                style={{ color: INK }}
              >
                Review and post
              </h1>
              <p className="mt-1 text-[15px]" style={{ color: MUTED }}>
                Everything is filled in. Tap a row to edit before you post.
              </p>

              {aiBlocked ? (
                <p
                  className="mt-4 flex items-start gap-2 rounded-lg border border-[#D7E0EC] px-3 py-2 text-[13px] leading-snug text-[#071330]"
                  style={{ backgroundColor: NOTICE_BG }}
                  role="alert"
                  data-testid="post-ai-notice"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]" aria-hidden />
                  <span>{aiBlocked}</span>
                </p>
              ) : null}

              <div className="mt-6 border-y border-[#E3E8EF]" data-testid="post-review-rows">
                <ReviewRow
                  label="Category"
                  value={categorySummary}
                  editing={editingRow === 'category'}
                  onToggle={() => toggleRow('category')}
                  testId="post-row-category"
                >
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
                </ReviewRow>

                <ReviewRow
                  label="Title"
                  value={title.trim() || 'Add a title'}
                  editing={editingRow === 'title'}
                  onToggle={() => toggleRow('title')}
                  testId="post-row-title"
                >
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
                </ReviewRow>

                <ReviewRow
                  label="Details"
                  value={details.trim() || 'Optional'}
                  editing={editingRow === 'details'}
                  onToggle={() => toggleRow('details')}
                  testId="post-row-details"
                >
                  <Field
                    label="Details"
                    hint={`${details.length}/${DETAILS_MAX}`}
                    errorId="post-details-error"
                  >
                    <TextArea
                      ref={detailsInputRef}
                      id="post-details"
                      value={details}
                      maxLength={DETAILS_MAX}
                      onChange={(e) => setDetails(e.target.value.slice(0, DETAILS_MAX))}
                      placeholder="A few sentences helpers can trust…"
                      rows={5}
                      data-testid="post-details"
                    />
                  </Field>
                </ReviewRow>

                <ReviewRow
                  label="When"
                  value={computedWhenLabel}
                  editing={editingRow === 'when'}
                  onToggle={() => toggleRow('when')}
                  testId="post-when-section"
                >
                  <div
                    role="radiogroup"
                    aria-label="When"
                    className="grid grid-cols-2 gap-2"
                    data-testid="post-when-mode-group"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={when === 'asap'}
                      data-testid="post-when-asap"
                      onClick={() => selectWhenMode('asap')}
                      className={`rounded-lg border px-3 py-2.5 text-[14px] font-semibold transition ${
                        when === 'asap'
                          ? 'border-[#1D5CE5] bg-[#EEF4FF] text-[#1D5CE5]'
                          : 'border-[#D7E0EC] bg-white text-[#071330]'
                      }`}
                    >
                      ASAP
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={when === 'scheduled'}
                      data-testid="post-when-scheduled"
                      onClick={() => selectWhenMode('scheduled')}
                      className={`rounded-lg border px-3 py-2.5 text-[14px] font-semibold transition ${
                        when === 'scheduled'
                          ? 'border-[#1D5CE5] bg-[#EEF4FF] text-[#1D5CE5]'
                          : 'border-[#D7E0EC] bg-white text-[#071330]'
                      }`}
                    >
                      Pick a time
                    </button>
                  </div>
                  {when === 'scheduled' ? (
                    <div className="mt-3 space-y-3" data-testid="post-time-window">
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
                      <Field label="Start time" hint="Local time">
                        <TextInput
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          required
                          data-testid="post-start-time"
                        />
                      </Field>
                      <p className="text-[13px]" style={{ color: MUTED }} data-testid="post-when-preview">
                        Shows as{' '}
                        <span className="font-semibold" style={{ color: INK }}>
                          {computedWhenLabel}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p
                      className="mt-3 text-[13px]"
                      style={{ color: MUTED }}
                      data-testid="post-needs-help-now"
                    >
                      {ASAP_WHEN_LABEL}. We will text helpers near you who turned on urgent job
                      alerts.
                    </p>
                  )}
                </ReviewRow>

                <ReviewRow
                  label="Location"
                  value={locationSummary}
                  editing={editingRow === 'location'}
                  onToggle={() => {
                    toggleRow('location')
                    setShowZipEditor(true)
                  }}
                  testId="post-row-location"
                >
                  <div className="space-y-1.5">
                    <span className="type-meta text-beam-muted">ZIP code</span>
                    <div className="relative max-w-[220px]">
                      <MapPin
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                        style={{ color: MUTED }}
                        aria-hidden
                      />
                      <TextInput
                        ref={zipInputRef}
                        value={zipInput}
                        onChange={(e) => {
                          const next = e.target.value.replace(/\D/g, '').slice(0, 5)
                          setZipInput(next)
                          setZipLookupError('')
                          setZipFieldError('')
                          if (next.length !== 5) {
                            setZipPlace(null)
                            setZipResolving(false)
                          }
                        }}
                        placeholder="Enter ZIP"
                        className="pl-10"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
                        aria-invalid={
                          resolvedZipError || zipFieldError ? true : undefined
                        }
                        aria-describedby={
                          resolvedZipError || zipFieldError
                            ? 'post-zip-error'
                            : undefined
                        }
                        data-testid="post-zip"
                      />
                    </div>
                    {resolvedZipError || zipFieldError ? (
                      <FieldInlineError id="post-zip-error" testId="post-zip-error">
                        {zipFieldError || resolvedZipError}
                      </FieldInlineError>
                    ) : resolvedZipPlace ? (
                      <span
                        className="block text-[13px]"
                        style={{ color: MUTED }}
                        data-testid="post-zip-resolved"
                      >
                        {formatZipPlaceLabel(resolvedZipPlace)}
                      </span>
                    ) : (
                      <span className="block text-[13px]" style={{ color: MUTED }}>
                        {zipResolving
                          ? 'Looking up ZIP…'
                          : '5-digit US ZIP. Helpers see the area, not your street.'}
                      </span>
                    )}
                  </div>
                </ReviewRow>

                <ReviewRow
                  label="Price"
                  value={priceSummary}
                  editing={editingRow === 'price'}
                  onToggle={() => toggleRow('price')}
                  testId="post-price-section"
                >
                  <Field
                    label="Your price (USD)"
                    error={budgetError || undefined}
                    errorId="post-budget-error"
                  >
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold"
                        style={{ color: MUTED }}
                      >
                        $
                      </span>
                      <TextInput
                        ref={budgetInputRef}
                        type="number"
                        min={10}
                        step={5}
                        value={budget || ''}
                        onChange={(e) => {
                          setBudget(Number(e.target.value) || 0)
                          setBudgetFromAi(false)
                          if (budgetError) setBudgetError('')
                        }}
                        className="pl-8 tabular-nums"
                        aria-invalid={budgetError ? true : undefined}
                        aria-describedby={
                          budgetError ? 'post-budget-error' : undefined
                        }
                        data-testid="post-price-input"
                      />
                    </div>
                  </Field>
                  {budgetFromAi ? (
                    <p className="mt-2 text-[13px]" style={{ color: MUTED }} data-testid="post-price-hint">
                      Suggested for {categoryLabel(category)} jobs nearby
                    </p>
                  ) : null}
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
                        Helpers can suggest a different price. Leave unchecked if your price is
                        firm.
                      </span>
                    </span>
                  </label>
                </ReviewRow>
              </div>

              <div className="mt-4" data-testid="post-photos-section">
                {!showPhotos ? (
                  <button
                    type="button"
                    className="text-[14px] font-semibold"
                    style={{ color: LINK }}
                    onClick={() => setShowPhotos(true)}
                    data-testid="post-add-photos-link"
                  >
                    + Add photos (optional)
                  </button>
                ) : (
                  <>
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
                      <span
                        className="text-[13px]"
                        style={{ color: MUTED }}
                        data-testid="post-photo-count"
                      >
                        {photoUrls.length}/{LISTING_PHOTO_MAX}
                      </span>
                    </div>
                    {photoError ? (
                      <p
                        className="mt-2 flex items-start gap-2 rounded-lg border border-[#D7E0EC] bg-white px-3 py-2 text-[13px] font-medium text-[#071330]"
                        role="alert"
                        data-testid="post-photo-error"
                      >
                        <AlertCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]"
                          aria-hidden
                        />
                        <span>{photoError}</span>
                      </p>
                    ) : null}
                    {photoUrls.length ? (
                      <ul
                        className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5"
                        data-testid="post-photo-thumbs"
                      >
                        {photoUrls.map((url, i) => (
                          <li
                            key={`${url}-${i}`}
                            className="relative aspect-square overflow-hidden rounded-lg bg-[#EEF2F7]"
                          >
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
                  </>
                )}
              </div>

              {error ? (
                <FormErrorAlert
                  ref={formErrorAlertRef}
                  className="mt-4"
                  message={error}
                  testId="post-error"
                />
              ) : null}

              <div className="mt-6 hidden lg:block space-y-3">
                <Button
                  type="submit"
                  variant="brand"
                  size="lg"
                  className="w-full"
                  loading={pending}
                  data-testid="post-submit"
                >
                  Post task
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-[14px] font-semibold"
                  style={{ color: MUTED }}
                  onClick={() => {
                    setStep('describe')
                    setEditingRow(null)
                  }}
                  data-testid="post-back"
                >
                  Back
                </button>
              </div>
              <div className="mt-4 lg:hidden">
                <button
                  type="button"
                  className="text-[14px] font-semibold"
                  style={{ color: MUTED }}
                  onClick={() => {
                    setStep('describe')
                    setEditingRow(null)
                  }}
                  data-testid="post-back"
                >
                  Back
                </button>
              </div>
            </div>

            <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
              <p className="mb-3 text-[13px] font-medium" style={{ color: MUTED }}>
                Preview
              </p>
              <div className="pointer-events-none select-none" aria-hidden>
                <RequestCard request={draft} />
              </div>
              <div
                className="mt-4 rounded-lg border px-4 py-3.5"
                style={{ borderColor: OUTLINE }}
              >
                <p className="text-[14px] font-semibold" style={{ color: INK }}>
                  {matchCount} helper{matchCount === 1 ? '' : 's'} nearby
                </p>
                <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
                  Based on category, timing, and job location. Helpers choose their own travel
                  distance when browsing.
                </p>
              </div>
              <p className="mt-3 text-[13px]" style={{ color: MUTED }}>
                Preview updates as you edit. Nothing posts until you confirm.
              </p>
            </aside>
          </form>
        ) : null}
      </div>
      {stickyBar}
    </div>
  )
}
