'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, MapPin, Search } from 'lucide-react'
import { LandingNav } from './LandingNav'
import { HERO_HELPERS } from '@/data/media'
import { NEIGHBORHOODS } from '@/data/neighborhoods'
import type { NeighborhoodId } from '@/types'

const FAN_HELPERS = HERO_HELPERS

export function LandingHero() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [neighborhood, setNeighborhood] = useState<NeighborhoodId | 'all'>('all')
  const [locOpen, setLocOpen] = useState(false)
  const locRef = useRef<HTMLDivElement>(null)

  const neighborhoodLabel =
    neighborhood === 'all'
      ? 'Select Austin neighborhood'
      : NEIGHBORHOODS.find((n) => n.id === neighborhood)?.name ?? 'Austin'

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
    if (neighborhood !== 'all') params.set('neighborhood', neighborhood)
    const qs = params.toString()
    router.push(qs ? `/browse?${qs}` : '/browse')
  }

  return (
    <section className="hero-sky relative isolate overflow-x-clip pb-0 pt-0">
      <div className="hero-clouds" aria-hidden />
      <LandingNav variant="hero" />

      <div className="beam-container relative z-20 flex flex-col items-center px-4 pb-8 pt-10 text-center sm:pb-10 sm:pt-14">
        <p className="animate-fade-up inline-flex items-center gap-2 text-[13px] font-medium text-white/95">
          <LaurelIcon />
          <span>4.9★ Rated · Trusted across Austin neighborhoods</span>
          <LaurelIcon mirror />
        </p>

        <h1 className="landing-headline animate-fade-up mt-5 max-w-[16ch]">
          Local help in Austin, made easy.
        </h1>

        <p className="animate-fade-up-delay mt-5 max-w-[46ch] text-[17px] leading-[1.55] text-white/90 sm:text-[18px]">
          Post what you need done today and get priced offers with arrival times from vetted
          neighbors nearby.
        </p>

        <form
          onSubmit={onSearch}
          className="animate-fade-up-delay mt-8 w-full max-w-[760px]"
          data-testid="hero-search-pill"
        >
          <div className="flex flex-col gap-2 rounded-[28px] bg-white p-2 shadow-[0_20px_50px_rgba(12,42,102,0.18)] sm:flex-row sm:items-center sm:rounded-full sm:gap-0">
            <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full px-4 py-3 sm:py-2.5">
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

            <span className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden />

            <div className="relative min-w-0 flex-1" ref={locRef}>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-full px-4 py-3 text-left sm:py-2.5"
                aria-expanded={locOpen}
                aria-haspopup="listbox"
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
                <ChevronDown className="h-4 w-4 shrink-0 text-[#94A3B8]" />
              </button>
              {locOpen ? (
                <ul
                  role="listbox"
                  className="obsidian-popover absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-64 overflow-y-auto py-2 sm:left-0 sm:right-auto sm:min-w-[16rem]"
                >
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={neighborhood === 'all'}
                      className="w-full px-4 py-2.5 text-left text-[14px] text-[#071330] hover:bg-[#F4F8FD]"
                      onClick={() => {
                        setNeighborhood('all')
                        setLocOpen(false)
                      }}
                    >
                      All Austin
                    </button>
                  </li>
                  {NEIGHBORHOODS.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={neighborhood === n.id}
                        className="w-full px-4 py-2.5 text-left text-[14px] text-[#475569] hover:bg-[#F4F8FD] hover:text-[#071330]"
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
            </div>

            <button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-[#1D5CE5] px-7 text-[15px] font-semibold text-white transition hover:bg-[#1649BD] sm:ml-1"
            >
              Find help
            </button>
          </div>
        </form>

        {/* 5-card fanned helper stack — 3 on mobile to avoid overflow */}
        <div
          className="relative mt-12 flex w-full max-w-[920px] items-end justify-center overflow-visible pb-2 pt-6 sm:mt-14 sm:pb-4"
          data-testid="hero-fan-stack"
        >
          <div className="flex items-end justify-center gap-[-12px] sm:gap-0">
            {FAN_HELPERS.map((helper, i) => {
              const isEdge = i === 0 || i === 4
              const isNear = i === 1 || i === 3
              return (
                <div
                  key={helper.name}
                  className={`relative shrink-0 origin-bottom transition-transform duration-500 ${
                    isEdge ? 'hidden sm:block' : ''
                  } ${helper.hero ? 'z-30 -mx-2 sm:-mx-3' : isNear ? 'z-20 -mx-3 sm:-mx-4' : 'z-10 -mx-4'}`}
                  style={{ transform: `rotate(${helper.rotate}deg)` }}
                >
                  <div
                    className={`overflow-hidden rounded-[26px] border-4 border-white shadow-[0_20px_40px_-12px_rgba(15,41,92,0.28)] ${
                      helper.hero
                        ? 'h-[220px] w-[150px] sm:h-[280px] sm:w-[190px]'
                        : 'h-[190px] w-[130px] sm:h-[240px] sm:w-[164px]'
                    }`}
                  >
                    <img
                      src={helper.src}
                      alt={`${helper.name} · ${helper.specialty}`}
                      className="h-full w-full object-cover object-top"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <span className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#071330] shadow-sm sm:inline-flex">
                    {helper.name} · {helper.specialty}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <p className="mt-2 text-[13px] text-[#1A54D2]/70 sm:mt-0">
          Or{' '}
          <Link href="/post" className="font-semibold text-[#1649BD] underline-offset-2 hover:underline">
            post a task
          </Link>{' '}
          directly — takes about a minute.
        </p>
      </div>
    </section>
  )
}

function LaurelIcon({ mirror = false }: { mirror?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={mirror ? '-scale-x-100' : ''}
      aria-hidden
    >
      <path
        d="M12 20c-3-2.5-5-5.5-5-9 0-2.5 1.2-4.2 3-5.2C8.5 8 8 10.5 8.5 13c1.2-1.8 2.6-3 3.5-3.5.9.5 2.3 1.7 3.5 3.5.5-2.5 0-5-1.5-7.2 1.8 1 3 2.7 3 5.2 0 3.5-2 6.5-5 9z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}
