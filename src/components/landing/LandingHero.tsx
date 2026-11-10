'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, MapPin, Search } from 'lucide-react'
import { LandingNav } from './LandingNav'
import { LandingBrowsePreview } from './LandingBrowsePreview'
import { useBeam } from '@/context/BeamContext'
import { NEIGHBORHOODS } from '@/data/neighborhoods'
import { ALL_CATEGORY_ICON, PARENT_ICONS } from '@/lib/categoryIcons'
import { BROWSE_PARENTS, type BrowseParentId } from '@/lib/taxonomy'
import type { NeighborhoodId } from '@/types'
import './landing-v2.css'

/**
 * Landing v2 hero — atmospheric Beam-blue field, search-first, stacked Browse preview.
 * Guests: category picker. Signed-in: neighborhood picker.
 */
export function LandingHero() {
  const router = useRouter()
  const { authUser } = useBeam()
  const isGuest = !authUser
  const [query, setQuery] = useState('')
  const [neighborhood, setNeighborhood] = useState<NeighborhoodId | 'all'>('all')
  const [category, setCategory] = useState<BrowseParentId | 'all'>('all')
  const [locOpen, setLocOpen] = useState(false)
  const locRef = useRef<HTMLDivElement>(null)

  const neighborhoodLabel =
    neighborhood === 'all'
      ? 'Select neighborhood'
      : NEIGHBORHOODS.find((n) => n.id === neighborhood)?.name ?? 'Select neighborhood'

  const CategoryIcon =
    category === 'all' ? ALL_CATEGORY_ICON : PARENT_ICONS[category] ?? ALL_CATEGORY_ICON
  const categoryLabel =
    category === 'all'
      ? 'All categories'
      : BROWSE_PARENTS.find((p) => p.id === category)?.label ?? 'All categories'

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!locRef.current?.contains(e.target as Node)) setLocOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLocOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    const q = query.trim()
    if (q) params.set('q', q)
    if (isGuest) {
      if (category !== 'all') params.set('category', category)
    } else if (neighborhood !== 'all') {
      params.set('neighborhood', neighborhood)
    }
    const qs = params.toString()
    router.push(qs ? `/browse?${qs}` : '/browse')
  }

  return (
    <section className="landing-hero-atmosphere relative isolate overflow-x-clip pb-0 pt-0">
      <LandingNav variant="float" />

      <div
        className="landing-hero-content relative z-20 overflow-x-clip pb-0"
        data-testid="landing-hero"
      >
        <div className="landing-hero-noise absolute inset-0" aria-hidden="true" />
        <div className="landing-hero-grid absolute inset-0" aria-hidden="true" />
        <div
          className="landing-cloud -left-24 top-16 h-80 w-80 bg-sky-400/50 md:h-[28rem] md:w-[28rem]"
          aria-hidden="true"
        />
        <div
          className="landing-cloud -right-16 top-0 h-96 w-96 bg-[#1D5CE5]/35 md:h-[32rem] md:w-[32rem]"
          aria-hidden="true"
        />
        <div
          className="landing-cloud bottom-24 left-[20%] h-64 w-64 bg-[#7DD3FC]/35"
          aria-hidden="true"
        />
        <div
          className="landing-cloud bottom-40 right-[18%] h-72 w-72 bg-[#071330]/15"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-[1200px] px-5 text-center md:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1D5CE5]">
            Local services · Real everyday help
          </p>

          <h1 className="landing-headline-grad mx-auto mt-5 max-w-[15ch] text-[44px] font-extrabold leading-[1.02] tracking-[-0.045em] md:text-[72px]">
            Local help, made easy.
          </h1>

          <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-6 text-[#475569] md:text-[17px] md:leading-7">
            Describe the job, compare offers, and choose the help that fits — for your neighborhood.
          </p>

          <form
            onSubmit={onSearch}
            className="relative z-40 mx-auto mt-9 w-full max-w-[740px] text-left"
            data-testid="hero-search-pill"
          >
            <div className="flex flex-col gap-2 rounded-[10px] border border-white/80 bg-white/95 p-1.5 shadow-[0_16px_40px_rgba(12,42,102,0.14)] backdrop-blur sm:flex-row sm:items-center sm:gap-0 sm:p-2">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-3 py-2.5">
                <Search className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
                <span className="sr-only">What help do you need?</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What help do you need?"
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-[#071330] outline-none placeholder:text-[#94A3B8]"
                />
              </label>

              <span className="mx-1 hidden h-7 w-px bg-[#D7E0EC] sm:block" aria-hidden />

              <div className="relative min-w-0 flex-1" ref={locRef}>
                {isGuest ? (
                  <>
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-left"
                      aria-expanded={locOpen}
                      aria-haspopup="listbox"
                      aria-controls="hero-category-listbox"
                      data-testid="hero-category-trigger"
                      onClick={() => setLocOpen((v) => !v)}
                    >
                      <CategoryIcon className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
                      <span
                        className={`min-w-0 flex-1 truncate text-[15px] ${
                          category === 'all' ? 'text-[#94A3B8]' : 'text-[#071330]'
                        }`}
                      >
                        {categoryLabel}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform ${
                          locOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {locOpen ? (
                      <ul
                        id="hero-category-listbox"
                        role="listbox"
                        data-testid="hero-category-listbox"
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(16rem,45vh)] overflow-y-auto overscroll-contain rounded-[10px] border border-[rgba(7,19,48,0.12)] bg-white py-1.5 shadow-[0_18px_40px_-12px_rgba(12,42,102,0.35)] sm:min-w-[16rem]"
                      >
                        <li>
                          <button
                            type="button"
                            role="option"
                            aria-selected={category === 'all'}
                            className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#F4F8FD] ${
                              category === 'all'
                                ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                                : 'text-[#071330]'
                            }`}
                            onClick={() => {
                              setCategory('all')
                              setLocOpen(false)
                            }}
                          >
                            All categories
                            {category === 'all' ? (
                              <Check className="h-4 w-4 shrink-0" aria-hidden />
                            ) : null}
                          </button>
                        </li>
                        {BROWSE_PARENTS.map((p) => {
                          const Icon = PARENT_ICONS[p.id]
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={category === p.id}
                                className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#F4F8FD] ${
                                  category === p.id
                                    ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                                    : 'text-[#475569]'
                                }`}
                                onClick={() => {
                                  setCategory(p.id)
                                  setLocOpen(false)
                                }}
                              >
                                <span className="inline-flex min-w-0 items-center gap-2.5">
                                  <Icon className="h-4 w-4 shrink-0 text-[#1D5CE5]" aria-hidden />
                                  <span className="truncate">{p.label}</span>
                                </span>
                                {category === p.id ? (
                                  <Check className="h-4 w-4 shrink-0" aria-hidden />
                                ) : null}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-left"
                      aria-expanded={locOpen}
                      aria-haspopup="listbox"
                      aria-controls="hero-neighborhood-listbox"
                      data-testid="hero-neighborhood-trigger"
                      onClick={() => setLocOpen((v) => !v)}
                    >
                      <MapPin className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
                      <span
                        className={`min-w-0 flex-1 truncate text-[15px] ${
                          neighborhood === 'all' ? 'text-[#94A3B8]' : 'text-[#071330]'
                        }`}
                      >
                        {neighborhoodLabel}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform ${
                          locOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {locOpen ? (
                      <ul
                        id="hero-neighborhood-listbox"
                        role="listbox"
                        data-testid="hero-neighborhood-listbox"
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(16rem,45vh)] overflow-y-auto overscroll-contain rounded-[10px] border border-[rgba(7,19,48,0.12)] bg-white py-1.5 shadow-[0_18px_40px_-12px_rgba(12,42,102,0.35)] sm:min-w-[16rem]"
                      >
                        <li>
                          <button
                            type="button"
                            role="option"
                            aria-selected={neighborhood === 'all'}
                            className={`min-h-11 w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#F4F8FD] ${
                              neighborhood === 'all'
                                ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                                : 'text-[#071330]'
                            }`}
                            onClick={() => {
                              setNeighborhood('all')
                              setLocOpen(false)
                            }}
                          >
                            All neighborhoods
                          </button>
                        </li>
                        {NEIGHBORHOODS.map((n) => (
                          <li key={n.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={neighborhood === n.id}
                              className={`min-h-11 w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#F4F8FD] ${
                                neighborhood === n.id
                                  ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                                  : 'text-[#475569]'
                              }`}
                              onClick={() => {
                                setNeighborhood(n.id)
                                setLocOpen(false)
                              }}
                            >
                              {n.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-[10px] bg-[#1D5CE5] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 sm:ml-1"
              >
                Find help
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 pb-2 md:pb-0">
            <Link
              href="/post"
              className="inline-flex h-10 items-center rounded-[10px] bg-[#071330] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
            >
              Post a task
            </Link>
            <a
              href="#categories"
              className="inline-flex h-10 items-center rounded-[10px] border border-[#D7E0EC] bg-white/85 px-5 text-[14px] font-semibold text-[#071330] backdrop-blur transition-colors hover:border-[#1D5CE5] hover:text-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
            >
              Browse services
            </a>
          </div>
        </div>
      </div>

      <LandingBrowsePreview />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent via-white/40 to-white"
        aria-hidden="true"
      />
    </section>
  )
}
