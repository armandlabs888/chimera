'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Camera,
  ChevronDown,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Users,
  Zap,
} from 'lucide-react'
import { LandingNav } from './LandingNav'
import { NEIGHBORHOODS } from '@/data/neighborhoods'
import type { NeighborhoodId } from '@/types'

const AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=96&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&q=80',
]

export function LandingHero() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [neighborhood, setNeighborhood] = useState<NeighborhoodId | 'all'>('all')
  const [locOpen, setLocOpen] = useState(false)
  const locRef = useRef<HTMLDivElement>(null)

  const neighborhoodLabel =
    neighborhood === 'all'
      ? 'Austin'
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

  const postHref =
    neighborhood !== 'all' ? `/post?neighborhood=${neighborhood}` : '/post'
  const browseHref =
    neighborhood !== 'all' ? `/browse?neighborhood=${neighborhood}` : '/browse'

  return (
    <section className="relative flex min-h-[100svh] min-h-[780px] flex-col justify-between overflow-hidden bg-[#0E0F12]">
      {/* Full-bleed photography */}
      <div className="landing-hero-media absolute inset-0">
        <Image
          src="/images/beam-hero-moving-bg.jpg"
          alt="Neighbor carrying a moving box through a warmly lit interior"
          fill
          priority
          sizes="100vw"
          className="object-cover object-right"
        />
      </div>

      {/* Lighting overlays */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(520px 340px at 4% 5%, rgba(213, 152, 72, 0.30) 0%, rgba(180, 120, 48, 0.10) 42%, transparent 75%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #0E0F12 0%, #0E0F12 36%, rgba(14,15,18,0.80) 52%, rgba(14,15,18,0.12) 74%, rgba(14,15,18,0.25) 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(14,15,18,0.28) 0%, transparent 16%, transparent 80%, rgba(12,13,16,0.88) 100%)',
        }}
        aria-hidden
      />

      <LandingNav />

      {/* Left column stack */}
      <div className="relative z-20 mx-auto w-full max-w-[82rem] flex-1 px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
        <div className="max-w-[35rem] animate-fade-up">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.17em] text-[#DDA352] sm:text-[12px]">
            PEER-TO-PEER HELP. LOCALLY.
          </p>

          <h1 className="mt-4 font-serif text-[clamp(3.35rem,6vw,5.35rem)] font-normal leading-[1.03] tracking-[-0.02em] text-[#FAF8F4]">
            Help nearby.
            <br />
            Done today.
          </h1>

          <p className="mt-5 text-[17px] font-normal leading-[1.55] text-[#A7A39C] sm:text-[18.5px]">
            From moving help to yard work to tech setup—
            <br className="hidden sm:inline" /> real people. real quick. right in Austin.
          </p>

          <form onSubmit={onSearch} className="mt-8 max-w-[31rem]">
            <label className="sr-only" htmlFor="hero-search">
              What do you need help with?
            </label>
            <div className="flex h-[56px] w-full items-center rounded-[14px] border border-white/[0.14] bg-[#212225]/90 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md transition focus-within:border-[#DDA352]/65">
              <Search className="h-5 w-5 shrink-0 text-[#9A968E]" aria-hidden />
              <input
                id="hero-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you need help with?"
                className="min-w-0 flex-1 bg-transparent px-3 text-[15.5px] text-[#F5F2EC] outline-none placeholder:text-[#8E8A83]"
              />
              <span className="mx-3 h-6 w-px bg-white/[0.13]" aria-hidden />
              <Link href="/post" aria-label="Post a request" className="shrink-0">
                <Camera className="h-5 w-5 text-[#B5B0A8] transition hover:text-white" />
              </Link>
            </div>
          </form>

          <div className="landing-cta-row mt-4 flex flex-wrap items-center gap-3.5">
            <Link
              href={postHref}
              className="inline-flex h-[50px] items-center justify-center gap-3 rounded-[13px] bg-gradient-to-b from-[#D5A455] via-[#C6944B] to-[#B88842] px-7 text-[15.5px] font-medium text-[#FDFBF7] shadow-[0_8px_28px_rgba(198,148,75,0.26),inset_0_1px_0_rgba(255,235,195,0.36)] transition hover:brightness-105"
            >
              Post a request
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={browseHref}
              className="inline-flex h-[50px] items-center justify-center gap-2.5 rounded-[13px] border border-white/[0.15] bg-[#131416]/90 px-6 text-[15.5px] font-medium text-[#ECE8E1] transition hover:border-white/[0.24] hover:bg-white/[0.06]"
            >
              Browse nearby help
              <Users className="h-4 w-4 text-[#CFCBC2]" />
            </Link>
          </div>

          <div className="relative mt-4 inline-block" ref={locRef}>
            <button
              type="button"
              className="inline-flex h-[40px] items-center gap-2 rounded-[11px] border border-white/[0.14] bg-[#16171A]/90 px-4 text-[14px] font-medium text-[#EDE9E2] transition hover:border-white/[0.25]"
              aria-expanded={locOpen}
              aria-haspopup="listbox"
              onClick={() => setLocOpen((v) => !v)}
            >
              <MapPin className="h-4 w-4 text-[#EDE9E2]" />
              {neighborhoodLabel}
              <ChevronDown className="h-3.5 w-3.5 text-[#A7A39C]" />
            </button>
            {locOpen ? (
              <ul
                role="listbox"
                className="obsidian-popover absolute left-0 top-[calc(100%+8px)] z-40 max-h-64 min-w-[14rem] overflow-y-auto py-2"
              >
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={neighborhood === 'all'}
                    className="w-full px-4 py-2.5 text-left text-[14px] text-[#EDE9E2] hover:bg-white/[0.06]"
                    onClick={() => {
                      setNeighborhood('all')
                      setLocOpen(false)
                    }}
                  >
                    Austin (All areas)
                  </button>
                </li>
                {NEIGHBORHOODS.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={neighborhood === n.id}
                      className="w-full px-4 py-2.5 text-left text-[14px] text-[#D4D0C8] hover:bg-white/[0.06] hover:text-white"
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
        </div>
      </div>

      {/* Bottom trust bar */}
      <div className="relative z-20 mx-auto flex w-full max-w-[82rem] flex-col gap-5 px-6 pb-7 pt-6 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-[13.5px] text-[#9E9A93]">Built for neighbors across Austin</span>
          <div className="flex -space-x-2.5">
            {AVATARS.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-2 ring-[#111215]"
                loading="lazy"
              />
            ))}
          </div>
          <span className="text-[13.5px] text-[#B8B3AB]">8 central neighborhoods</span>
        </div>

        <div className="flex flex-wrap items-center gap-8 xl:gap-11">
          <TrustBadge
            icon={<ShieldCheck className="h-5 w-5 text-[#DDA352]" strokeWidth={1.75} />}
            title="Scoped & local"
            body="Community safety rules"
          />
          <TrustBadge
            icon={<Star className="h-5 w-5 text-[#DDA352]" strokeWidth={1.75} />}
            title="Fair & transparent"
            body="No hidden fees"
          />
          <TrustBadge
            icon={<Zap className="h-5 w-5 text-[#DDA352]" strokeWidth={1.75} />}
            title="Fast & local"
            body="Help usually today"
          />
        </div>
      </div>
    </section>
  )
}

function TrustBadge({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[13.5px] font-medium text-[#F3EFE8]">{title}</p>
        <p className="text-[12px] text-[#8E8A83]">{body}</p>
      </div>
    </div>
  )
}
