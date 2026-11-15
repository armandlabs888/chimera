'use client'

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Search } from 'lucide-react'
import { getBrowseCategoryIcon } from '@/lib/categoryIcons'
import {
  detectDescribeIntent,
  formatIntentChip,
  softCategoryLabel,
  type DescribeRoleHint,
  type MatchIntent,
  type MatchedCategory,
} from '@/lib/describeIntent'
import { normalizeZipInput } from '@/lib/zip/format'
import './describe-search.css'

export const DESCRIBE_PLACEHOLDERS = [
  'Looking for a weekly house cleaner',
  'Help moving a couch Saturday',
  'I need to find new jobs',
  'Moving jobs this weekend',
  'Find a dog walker near me',
] as const

export const DESCRIBE_CHIPS = [
  'Weekly house cleaner',
  'Help moving a couch',
  'Find jobs near me',
  'Dog walker this week',
] as const

type MenuPos = { top: number; left: number; width: number; maxHeight: number }

export type DescribeSearchSubmit = {
  q: string
  zip: string
  intent: MatchIntent
  categoryId: string | null
}

export function DescribeSearchForm({
  initialQuery = '',
  initialZip = '',
  initialIntent,
  roleHint = null,
  cityLabel = '',
  variant = 'hero',
  showChips = true,
  autoFocusQuery = false,
  onSubmit,
}: {
  initialQuery?: string
  initialZip?: string
  initialIntent?: MatchIntent | null
  roleHint?: DescribeRoleHint
  cityLabel?: string
  variant?: 'hero' | 'results'
  showChips?: boolean
  autoFocusQuery?: boolean
  onSubmit: (payload: DescribeSearchSubmit) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [zip, setZip] = useState(initialZip)
  const [zipError, setZipError] = useState(false)
  const [intentOverride, setIntentOverride] = useState<MatchIntent | null>(
    initialIntent ?? null,
  )
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [placeholder, setPlaceholder] = useState<string>(DESCRIBE_PLACEHOLDERS[0])
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)

  const formRef = useRef<HTMLFormElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const queryRef = useRef<HTMLInputElement>(null)
  const placeholderIndex = useRef(0)

  const detection = useMemo(
    () =>
      detectDescribeIntent(query, {
        zip: normalizeZipInput(zip) || zip.replace(/\D/g, '').slice(0, 5),
        city: cityLabel,
        roleHint,
        intentOverride,
      }),
    [query, zip, cityLabel, roleHint, intentOverride],
  )

  const zipDigits = zip.replace(/\D/g, '').slice(0, 5)
  const chip = formatIntentChip({
    intent: detection.intent,
    categoryLabel: detection.category
      ? softCategoryLabel(detection.category.label)
      : null,
    zip: zipDigits.length === 5 ? zipDigits : '',
  })

  const options = useMemo(() => {
    const cats: MatchedCategory[] = []
    if (detection.category) cats.push(detection.category)
    for (const r of detection.related) cats.push(r)
    return {
      categories: cats,
      examples: detection.exampleRequests,
    }
  }, [detection])

  const flatOptions = useMemo(() => {
    const rows: Array<
      | { kind: 'category'; cat: MatchedCategory }
      | { kind: 'example'; text: string }
    > = []
    for (const cat of options.categories) rows.push({ kind: 'category', cat })
    for (const text of options.examples) rows.push({ kind: 'example', text })
    return rows
  }, [options])

  const showSuggest = open && query.trim().length > 0 && flatOptions.length > 0
  const showIntentChip = query.trim().length > 0

  // Rotating placeholder (paused while focused or when query has text).
  useEffect(() => {
    if (query.trim() || document.activeElement === queryRef.current) return
    const id = window.setInterval(() => {
      if (document.documentElement.hasAttribute('data-shot')) return
      if (document.activeElement === queryRef.current) return
      placeholderIndex.current =
        (placeholderIndex.current + 1) % DESCRIBE_PLACEHOLDERS.length
      setPlaceholder(DESCRIBE_PLACEHOLDERS[placeholderIndex.current])
    }, 2800)
    return () => window.clearInterval(id)
  }, [query])

  useEffect(() => {
    if (autoFocusQuery && queryRef.current) {
      queryRef.current.focus()
      const len = queryRef.current.value.length
      queryRef.current.setSelectionRange(len, len)
    }
  }, [autoFocusQuery])

  useLayoutEffect(() => {
    if (!showSuggest) {
      setMenuPos(null)
      return
    }

    function placeMenu() {
      // Anchor below the pill + intent chip so the portal does not cover the chip.
      const trigger = anchorRef.current || pillRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(window.innerWidth - 16, rect.width)
      let left = rect.left
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - 8 - width)
      }
      if (left < 8) left = 8

      const gap = 8
      // Prefer below the trigger (matches approved mocks). Only flip above when
      // there is clearly more room above and below cannot fit a usable panel.
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap)
      const spaceAbove = Math.max(0, rect.top - gap)
      const minUsable = 160
      const openUp = spaceBelow < minUsable && spaceAbove > spaceBelow
      const available = openUp ? spaceAbove : spaceBelow
      const maxHeight = Math.max(
        minUsable,
        Math.min(360, 0.55 * window.innerHeight, Math.max(available, minUsable)),
      )
      const top = openUp
        ? Math.max(gap, rect.top - gap - Math.min(maxHeight, spaceAbove))
        : rect.bottom + gap

      setMenuPos({ top, left, width, maxHeight })
    }

    placeMenu()
    window.addEventListener('resize', placeMenu)
    window.addEventListener('scroll', placeMenu, true)
    return () => {
      window.removeEventListener('resize', placeMenu)
      window.removeEventListener('scroll', placeMenu, true)
    }
  }, [showSuggest, query, detection.intent, flatOptions.length])

  useEffect(() => {
    if (!showSuggest) return
    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (formRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [showSuggest])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, detection.intent])

  function submitSearch(next?: Partial<DescribeSearchSubmit>) {
    const q = (next?.q ?? query).trim()
    const digits = (next?.zip ?? zip).replace(/\D/g, '').slice(0, 5)
    if (digits.length > 0 && digits.length !== 5) {
      setZipError(true)
      return
    }
    setZipError(false)
    const intent =
      next?.intent ??
      detectDescribeIntent(q, {
        zip: digits,
        city: cityLabel,
        roleHint,
        intentOverride: next?.intent ?? intentOverride,
      }).intent
    const cat =
      next?.categoryId !== undefined
        ? next.categoryId
        : detectDescribeIntent(q, {
            zip: digits,
            city: cityLabel,
            roleHint,
            intentOverride: intent,
          }).category?.id ?? null
    onSubmit({ q, zip: digits, intent, categoryId: cat })
    setOpen(false)
  }

  function onFormSubmit(e: FormEvent) {
    e.preventDefault()
    submitSearch()
  }

  function applyChip(text: string) {
    setQuery(text)
    setOpen(true)
    queryRef.current?.focus()
    const detected = detectDescribeIntent(text, {
      zip: zipDigits,
      city: cityLabel,
      roleHint,
      intentOverride: null,
    })
    setIntentOverride(null)
    // Chips that are clearly job-seeking submit immediately with jobs intent.
    if (detected.intent === 'jobs' && !detected.ambiguous) {
      submitSearch({ q: text, intent: 'jobs' })
    }
  }

  function toggleIntent() {
    const next: MatchIntent = detection.intent === 'helpers' ? 'jobs' : 'helpers'
    setIntentOverride(next)
    setOpen(true)
  }

  function selectOption(index: number) {
    const row = flatOptions[index]
    if (!row) return
    if (row.kind === 'category') {
      setQuery((prev) => prev || row.cat.label)
      submitSearch({
        q: query.trim() || row.cat.label,
        categoryId: row.cat.id,
        intent: detection.intent,
      })
      return
    }
    setQuery(row.text)
    submitSearch({ q: row.text, intent: detection.intent })
  }

  function onQueryKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggest) {
      if (e.key === 'ArrowDown' && query.trim()) {
        setOpen(true)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(flatOptions.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && flatOptions[activeIndex]) {
      // Allow Enter to pick the highlighted suggestion when navigating.
      if (activeIndex > 0 || e.metaKey || e.ctrlKey) {
        e.preventDefault()
        selectOption(activeIndex)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  const suggestPortal =
    showSuggest && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id="describe-suggest-listbox"
            role="listbox"
            aria-label="Suggestions"
            data-testid="describe-suggest-listbox"
            className="describe-suggest fixed"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
            }}
          >
            <div className="describe-suggest-intent">
              <span>
                We understood this as a{' '}
                {detection.intent === 'jobs' ? 'helper looking for work' : 'neighbor request'}
                {detection.category ? (
                  <>
                    {' '}
                    for <b>{softCategoryLabel(detection.category.label)}</b>
                  </>
                ) : null}
                {zipDigits.length === 5 ? (
                  <>
                    {' '}
                    near <b>{zipDigits}</b>
                  </>
                ) : null}
                .
              </span>
              <button type="button" className="switch" onClick={toggleIntent}>
                {chip.toggleLabel}
              </button>
            </div>

            {options.categories.length > 0 ? (
              <>
                <p className="describe-suggest-label">Matching categories</p>
                {options.categories.map((cat, i) => {
                  const Icon = getBrowseCategoryIcon(cat.id)
                  const index = i
                  return (
                    <button
                      key={`cat-${cat.id}`}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === index}
                      className={`describe-suggest-item${activeIndex === index ? ' is-active' : ''}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectOption(index)}
                    >
                      <Icon width={16} height={16} aria-hidden />
                      {cat.label}
                      <span className="meta">{cat.meta}</span>
                    </button>
                  )
                })}
              </>
            ) : null}

            {options.examples.length > 0 ? (
              <>
                <p className="describe-suggest-label">Try a request</p>
                {options.examples.map((text, ei) => {
                  const index = options.categories.length + ei
                  return (
                    <button
                      key={`ex-${text}`}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === index}
                      className={`describe-suggest-item${activeIndex === index ? ' is-active' : ''}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectOption(index)}
                    >
                      <Search width={18} height={18} aria-hidden />
                      {text}
                    </button>
                  )
                })}
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <form
      ref={formRef}
      onSubmit={onFormSubmit}
      className={`describe-search${variant === 'results' ? ' describe-search--results' : ''}`}
      data-testid={variant === 'hero' ? 'hero-search' : 'match-search'}
    >
      <div ref={anchorRef}>
        <div ref={pillRef} className="describe-search-pill" data-testid="hero-search-pill">
          <label className="describe-search-field query">
            <Search width={18} height={18} aria-hidden />
            <span className="sr-only">Describe what you need</span>
            <input
              ref={queryRef}
              type="text"
              name="q"
              value={query}
              autoComplete="off"
              placeholder={placeholder}
              aria-autocomplete="list"
              aria-controls={showSuggest ? 'describe-suggest-listbox' : undefined}
              aria-expanded={showSuggest}
              data-testid="describe-query-input"
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
                if (intentOverride) setIntentOverride(null)
              }}
              onFocus={() => {
                if (query.trim()) setOpen(true)
              }}
              onKeyDown={onQueryKeyDown}
            />
          </label>
          <span className="describe-search-div" aria-hidden />
          <div className="min-w-0">
            <label className="describe-search-field zip">
              <MapPin width={18} height={18} aria-hidden />
              <span className="sr-only">ZIP code</span>
              <input
                type="text"
                name="zip"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={zip}
                placeholder="ZIP code"
                aria-invalid={zipError || undefined}
                aria-describedby={zipError ? 'describe-zip-error' : undefined}
                data-testid="hero-zip-input"
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, '').slice(0, 5)
                  setZip(next)
                  if (zipError) setZipError(false)
                }}
              />
            </label>
            {zipError ? (
              <p
                id="describe-zip-error"
                role="alert"
                data-testid="hero-zip-error"
                className="describe-zip-error"
              >
                Enter a 5-digit ZIP
              </p>
            ) : null}
          </div>
          <button type="submit" className="describe-search-btn" data-testid="describe-search-submit">
            Search
          </button>
        </div>

        {showIntentChip ? (
          <div
            className={`describe-intent-chip${variant === 'results' ? ' on-light' : ''}`}
            data-testid="intent-chip"
          >
            <span className="understood">
              {detection.intent === 'jobs' ? (
                <>
                  Showing new jobs near{' '}
                  <b>{zipDigits.length === 5 ? zipDigits : 'your area'}</b>
                </>
              ) : detection.category ? (
                <>
                  Finding helpers for <b>{softCategoryLabel(detection.category.label)}</b> near{' '}
                  <b>{zipDigits.length === 5 ? zipDigits : 'your area'}</b>
                </>
              ) : (
                <>
                  Finding helpers near{' '}
                  <b>{zipDigits.length === 5 ? zipDigits : 'your area'}</b>
                </>
              )}
            </span>
            <button
              type="button"
              className="switch"
              data-testid="intent-toggle"
              onClick={toggleIntent}
            >
              {chip.toggleLabel}
            </button>
          </div>
        ) : null}
      </div>

      {showChips && !showIntentChip ? (
        <div className="describe-chips" aria-label="Try a request">
          {DESCRIBE_CHIPS.map((label) => (
            <button
              key={label}
              type="button"
              className={`describe-chip${variant === 'results' ? ' on-light' : ''}`}
              data-testid="describe-chip"
              onClick={() => applyChip(label)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {suggestPortal}
    </form>
  )
}
