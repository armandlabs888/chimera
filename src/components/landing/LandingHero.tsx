'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, MapPin, Search } from 'lucide-react'
import { LandingNav } from './LandingNav'
import { useBeam } from '@/context/BeamContext'
import { NEIGHBORHOODS } from '@/data/neighborhoods'
import { ALL_CATEGORY_ICON, PARENT_ICONS } from '@/lib/categoryIcons'
import { BROWSE_PARENTS, type BrowseParentId } from '@/lib/taxonomy'
import type { NeighborhoodId } from '@/types'

/**
 * Image-free, search-first hero (Paper-locked).
 * Guests: category picker. Signed-in: neighborhood picker + all reset.
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
    <section
      className="relative isolate overflow-x-clip bg-gradient-to-b from-[#F4F8FD] to-white pb-10 pt-0 sm:pb-14"
      data-testid="landing-hero"
    >
      <LandingNav variant="light" />

      <div className="beam-container relative z-20 flex flex-col items-center px-4 pb-2 pt-10 text-center sm:pt-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1D5CE5]">
          Local services · Real everyday help
        </p>

        <h1 className="mt-4 max-w-[14ch] font-sans text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[#071330] text-balance">
          Local help, made easy.
        </h1>

        <p className="mt-4 max-w-[42ch] text-[16px] leading-[1.55] text-[#475569] sm:text-[17px]">
          From a cleaner home to a lighter load. Describe the job, compare offers, and choose the
          help that fits.
        </p>

        <form
          onSubmit={onSearch}
          className="relative z-40 mt-8 w-full max-w-[720px]"
          data-testid="hero-search-pill"
        >
          <div className="flex flex-col gap-2 rounded-[10px] border border-[#E2E8F0] bg-white p-2 shadow-[0_16px_40px_-18px_rgba(7,19,48,0.22)] sm:flex-row sm:items-center sm:gap-0 sm:p-1.5 sm:pl-2">
            <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-3 py-3 sm:py-2.5">
              <Search className="h-5 w-5 shrink-0 text-[#1D5CE5]" aria-hidden />
              <span className="sr-only">What help do you need?</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What help do you need?"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-[#071330] outline-none placeholder:text-[#94A3B8]"
              />
            </label>

            <span className="hidden h-8 w-px bg-[#E2E8F0] sm:block" aria-hidden />

            <div className="relative min-w-0 flex-1" ref={locRef}>
              {isGuest ? (
                <>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-3 py-3 text-left sm:py-2.5"
                    aria-expanded={locOpen}
                    aria-haspopup="listbox"
                    aria-controls="hero-category-listbox"
                    data-testid="hero-category-trigger"
                    onClick={() => setLocOpen((v) => !v)}
                  >
                    <CategoryIcon className="h-5 w-5 shrink-0 text-[#1D5CE5]" aria-hidden />
                    <span
                      className={`min-w-0 flex-1 truncate text-[15px] ${
                        category === 'all' ? 'text-[#94A3B8]' : 'text-[#071330]'
                      }`}
                    >
                      {categoryLabel}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${
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
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-3 py-3 text-left sm:py-2.5"
                    aria-expanded={locOpen}
                    aria-haspopup="listbox"
                    aria-controls="hero-neighborhood-listbox"
                    data-testid="hero-neighborhood-trigger"
                    onClick={() => setLocOpen((v) => !v)}
                  >
                    <MapPin className="h-5 w-5 shrink-0 text-[#1D5CE5]" aria-hidden />
                    <span
                      className={`min-w-0 flex-1 truncate text-[15px] ${
                        neighborhood === 'all' ? 'text-[#94A3B8]' : 'text-[#071330]'
                      }`}
                    >
                      {neighborhoodLabel}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${
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
              className="inline-flex h-12 min-h-11 shrink-0 items-center justify-center rounded-[10px] bg-[#1D5CE5] px-7 text-[15px] font-semibold text-white transition hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 sm:ml-1"
            >
              Find help
            </button>
          </div>
        </form>

        <p className="mt-5 text-[14px] text-[#475569]">
          Or{' '}
          <Link
            href="/post"
            className="font-semibold text-[#1D5CE5] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
          >
            post a task
          </Link>{' '}
          directly — takes about a minute.
        </p>
      </div>
    </section>
  )
}
