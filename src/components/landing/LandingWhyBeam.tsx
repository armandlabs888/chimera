'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { CalendarClock, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { CATEGORIES } from '@/data/categories'
import { NEIGHBORHOODS } from '@/data/neighborhoods'
import type { NeighborhoodId } from '@/types'

const VALUES = [
  {
    icon: Sparkles,
    title: 'Upfront local pricing',
    body: 'See exact offer amounts before you accept.',
    tint: '#DBEAFE',
    fg: '#1D5CE5',
  },
  {
    icon: CalendarClock,
    title: 'Same-day arrival windows',
    body: 'Helpers share real arrival times in your neighborhood.',
    tint: '#FFEDD5',
    fg: '#C2410C',
  },
  {
    icon: ShieldCheck,
    title: 'Verified two-way reviews',
    body: 'Every completed task builds transparent neighborhood trust.',
    tint: '#D1FAE5',
    fg: '#059669',
  },
]

const CHIP_LINKS = [
  { label: 'Couch Moving', category: 'moving', tint: '#DBEAFE' },
  { label: 'Deep Cleaning', category: 'cleaning', tint: '#E0F2FE' },
  { label: 'Furniture Assembly', category: 'handyman', tint: '#FFEDD5' },
  { label: 'TV Mounting', category: 'handyman', tint: '#FEF3C7' },
  { label: 'Dog Walking', category: 'petcare', tint: '#FFE4E6' },
  { label: 'Yard Cleanup', category: 'handyman', tint: '#D1FAE5' },
  { label: 'Event Setup', category: 'events', tint: '#CCFBF1' },
  { label: 'Tech & Tutoring', category: 'tutoring', tint: '#EDE9FE' },
]

export function LandingWhyBeam() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [neighborhood, setNeighborhood] = useState<NeighborhoodId | 'all'>('all')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('title', query.trim())
    if (neighborhood !== 'all') params.set('neighborhood', neighborhood)
    const qs = params.toString()
    router.push(qs ? `/post?${qs}` : '/post')
  }

  return (
    <section className="bg-white pb-4 pt-16 sm:pt-20">
      <div className="beam-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-full border border-[rgba(7,19,48,0.1)] bg-[#FFF8D6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#071330]">
            03 Why Beam
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[#071330]">
            Why choose Beam
          </h2>
          <p className="mt-3 text-[16px] text-[#64748B]">
            Local professionals, right where you need them.
          </p>
        </div>

        <div className="mt-12 grid items-center gap-6 lg:grid-cols-[1fr_minmax(280px,340px)_1fr] lg:gap-8">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-[26px] max-lg:order-2">
            <img
              src="https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=800&q=80"
              alt="Neighbor helping tidy a bright living room"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-[28px] border border-[#FDE68A] bg-white p-5 shadow-[0_16px_40px_-12px_rgba(15,41,92,0.1)] sm:p-6 max-lg:order-1"
          >
            <label className="flex items-center gap-3 rounded-2xl border border-[rgba(7,19,48,0.1)] bg-[#F4F8FD] px-4 py-3.5">
              <Search className="h-5 w-5 shrink-0 text-[#1D5CE5]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What service do you need?"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-[#071330] outline-none placeholder:text-[#94A3B8]"
              />
            </label>
            <label className="mt-3 flex items-center gap-3 rounded-2xl border border-[rgba(7,19,48,0.1)] bg-[#F4F8FD] px-4 py-3.5">
              <MapPin className="h-5 w-5 shrink-0 text-[#1D5CE5]" />
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value as NeighborhoodId | 'all')}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-[#071330] outline-none"
              >
                <option value="all">Select your location</option>
                {NEIGHBORHOODS.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-[#1D5CE5] text-[15px] font-semibold text-white transition hover:bg-[#1649BD]"
            >
              Post a request
            </button>
          </form>

          <div className="space-y-6 max-lg:order-3">
            {VALUES.map((v) => {
              const Icon = v.icon
              return (
                <div key={v.title} className="flex items-start gap-3.5">
                  <span
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: v.tint, color: v.fg }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#071330]">{v.title}</h3>
                    <p className="mt-0.5 text-[14.5px] text-[#64748B]">{v.body}</p>
                  </div>
                </div>
              )
            })}
            <div className="relative aspect-[5/4] overflow-hidden rounded-[26px]">
              <img
                src="https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?auto=format&fit=crop&w=800&q=80"
                alt="Friendly helper assisting a neighbor at home"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scalloped warm-yellow category band */}
      <div className="scallop-band mt-20 py-10 sm:mt-24 sm:py-12" id="neighborhoods">
        <div className="beam-container">
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {CHIP_LINKS.map((chip) => (
              <Link
                key={chip.label}
                href={`/browse?category=${chip.category}`}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold text-[#071330] shadow-sm transition hover:-translate-y-0.5"
                style={{ background: chip.tint }}
              >
                <span
                  className="h-2 w-2 rounded-full bg-[#1D5CE5]/50"
                  aria-hidden
                />
                {chip.label}
              </Link>
            ))}
            {CATEGORIES.slice(0, 2).map((c) => (
              <Link
                key={c.id}
                href={`/browse?category=${c.id}`}
                className="inline-flex items-center rounded-full bg-white/80 px-4 py-2.5 text-[13.5px] font-semibold text-[#071330] shadow-sm"
              >
                {c.shortLabel}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
