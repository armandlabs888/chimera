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
  Shield,
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
    <section className="relative isolate grid min-h-[max(100svh,720px)] grid-rows-[auto_1fr_auto] overflow-hidden bg-[#0C0C0E]">
      {/* Photo + lighting layers */}
      <div className="landing-hero-media absolute inset-0">
        <Image
          src="/images/beam-hero-moving-v2.jpg"
          alt="Neighbor in a cap carrying a cardboard box through a warmly lit room"
          fill
          priority
          sizes="(max-width:640px) 200vw, 100vw"
          className="object-cover"
          style={{ objectPosition: '72% 40%' }}
        />
      </div>

      {/* Left blend — do not darken x > 64% */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #0C0C0E 0%, rgba(12,12,14,0.88) 32%, rgba(12,12,14,0.28) 50%, rgba(12,12,14,0) 64%)',
        }}
        aria-hidden
      />
      {/* Top-left amber cone from logo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(70% 75% at 2% 0%, rgba(214,150,64,0.36) 0%, rgba(170,108,44,0.15) 38%, transparent 68%)',
            'linear-gradient(118deg, rgba(240,180,100,0.11) 0%, transparent 34%)',
          ].join(', '),
        }}
        aria-hidden
      />
      {/* Bottom-left warm glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(40% 30% at 8% 100%, rgba(200,130,60,0.20), transparent 70%)',
        }}
        aria-hidden
      />
      {/* Bottom trust-bar fade */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, transparent 82%, rgba(12,12,14,0.62) 100%)',
        }}
        aria-hidden
      />

      <LandingNav />

      <div className="beam-container relative z-20 flex min-h-0 items-center self-stretch pt-[min(12vh,108px)]">
        <div className="w-full max-w-[600px] animate-fade-up">
          <p className="eyebrow text-[13px] font-medium uppercase tracking-[0.16em] text-[#D6B06C]">
            PEER-TO-PEER HELP. LOCALLY.
          </p>

          <h1
            className="mt-[18px] font-serif text-[clamp(3.25rem,6.55vw,6rem)] font-normal leading-none tracking-[-0.022em] text-[#F6F3EE] max-md:text-[clamp(3.25rem,13.5vw,3.75rem)]"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            Help nearby.
            <br />
            Done today.
          </h1>

          <p className="mt-[22px] max-w-[30ch] text-[19px] font-normal leading-[1.55] text-[#B7B2AA] sm:text-[20px]">
            From moving help to yard work to tech setup— real people. real quick. right in Austin.
          </p>

          <form onSubmit={onSearch} className="mt-9 w-full max-w-[580px]">
            <label className="sr-only" htmlFor="hero-search">
              What do you need help with?
            </label>
            <div className="flex h-16 w-full items-center rounded-2xl border border-white/[0.14] bg-[rgba(28,29,33,0.78)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-[14px] transition focus-within:border-[#D6B06C]/65">
              <Search className="h-[22px] w-[22px] shrink-0 text-[#9A968E]" aria-hidden />
              <input
                id="hero-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you need help with?"
                className="min-w-0 flex-1 bg-transparent px-3 text-[17px] text-[#F5F2EC] outline-none placeholder:text-[#8F8A83]"
              />
              <span className="mx-3 h-7 w-px bg-white/[0.13]" aria-hidden />
              <Link href="/post" aria-label="Post a request" className="shrink-0">
                <Camera className="h-[22px] w-[22px] text-[#B5B0A8] transition hover:text-white" />
              </Link>
            </div>
          </form>

          <div className="landing-cta-row mt-[22px] flex flex-wrap items-center gap-4 max-sm:flex-col max-sm:items-stretch">
            <Link href={postHref} className="cta-primary max-sm:w-full">
              Post a request
              <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
            <Link href={browseHref} className="cta-ghost max-sm:w-full">
              Browse nearby help
              <Users className="h-5 w-5 text-[#CFCBC2]" />
            </Link>
          </div>

          <div className="relative mt-[18px] inline-block" ref={locRef}>
            <button
              type="button"
              className="inline-flex h-[46px] items-center gap-2 rounded-[14px] border border-white/[0.14] bg-[rgba(18,19,22,0.72)] px-[18px] text-[16px] font-medium text-[#F6F3EE] transition hover:border-white/[0.25]"
              aria-expanded={locOpen}
              aria-haspopup="listbox"
              onClick={() => setLocOpen((v) => !v)}
            >
              <MapPin className="h-[18px] w-[18px]" />
              {neighborhoodLabel}
              <ChevronDown className="h-4 w-4 text-[#85817A]" />
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
                    className="w-full px-4 py-2.5 text-left text-[14px] text-[#F6F3EE] hover:bg-white/[0.06]"
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
                      className="w-full px-4 py-2.5 text-left text-[14px] text-[#B7B2AA] hover:bg-white/[0.06] hover:text-white"
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

      {/* Trust bar */}
      <div className="beam-container relative z-20 flex flex-col gap-5 pb-[52px] pt-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-[14.5px] text-[#85817A]">Built for neighbors across Austin</span>
          <div className="flex items-center gap-0.5">
            {AVATARS.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
                loading="lazy"
              />
            ))}
          </div>
          <span className="text-[14.5px] text-[#B7B2AA]">8 central neighborhoods</span>
        </div>

        <div className="flex gap-12 overflow-x-auto hide-scrollbar max-lg:pb-1 xl:gap-12">
          <TrustBadge
            icon={<Shield className="h-6 w-6 text-[#D6B06C]" strokeWidth={1.5} />}
            title="Scoped & local"
            body="Community safety rules"
          />
          <TrustBadge
            icon={<Star className="h-6 w-6 text-[#D6B06C]" strokeWidth={1.5} />}
            title="Fair & transparent"
            body="No hidden fees"
          />
          <TrustBadge
            icon={<Zap className="h-6 w-6 text-[#D6B06C]" strokeWidth={1.5} />}
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
    <div className="flex shrink-0 items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[14.5px] font-medium text-[#F6F3EE]">{title}</p>
        <p className="text-[13px] text-[#85817A]">{body}</p>
      </div>
    </div>
  )
}
