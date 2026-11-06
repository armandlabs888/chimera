'use client'

import { ChevronDown, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { CATEGORIES } from '@/data/categories'

export function LandingNav() {
  const [browseOpen, setBrowseOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const browseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!browseRef.current?.contains(e.target as Node)) setBrowseOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setBrowseOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <header className="relative z-30 w-full" data-testid="landing-nav-obsidian">
      <div className="beam-container flex h-24 items-center justify-between">
        <Link href="/" className="relative z-10">
          <BeamWordmark />
        </Link>

        <nav className="hidden items-center gap-11 md:flex" aria-label="Marketing">
          <div className="relative" ref={browseRef}>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[15.5px] font-normal text-[#B7B2AA] transition hover:text-[#F6F3EE]"
              aria-expanded={browseOpen}
              aria-haspopup="menu"
              onClick={() => setBrowseOpen((v) => !v)}
            >
              Browse
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </button>
            {browseOpen ? (
              <div
                role="menu"
                className="obsidian-popover absolute left-0 top-[calc(100%+10px)] z-50 min-w-[15rem] py-2"
              >
                <Link
                  href="/browse"
                  role="menuitem"
                  className="block px-4 py-2.5 text-[14px] text-[#F6F3EE] hover:bg-white/[0.06]"
                  onClick={() => setBrowseOpen(false)}
                >
                  All open requests
                </Link>
                <Link
                  href="/browse?tab=people"
                  role="menuitem"
                  className="block px-4 py-2.5 text-[14px] text-[#F6F3EE] hover:bg-white/[0.06]"
                  onClick={() => setBrowseOpen(false)}
                >
                  Helpers nearby
                </Link>
                <div className="my-1 border-t border-white/[0.08]" />
                {CATEGORIES.map((c) => (
                  <Link
                    key={c.id}
                    href={`/browse?category=${c.id}`}
                    role="menuitem"
                    className="block px-4 py-2.5 text-[14px] text-[#B7B2AA] hover:bg-white/[0.06] hover:text-white"
                    onClick={() => setBrowseOpen(false)}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <a
            href="#how-it-works"
            className="text-[15.5px] font-normal text-[#B7B2AA] transition hover:text-[#F6F3EE]"
          >
            How it works
          </a>
          <Link
            href="/safety"
            className="text-[15.5px] font-normal text-[#B7B2AA] transition hover:text-[#F6F3EE]"
          >
            Safety
          </Link>
        </nav>

        <div className="flex items-center gap-5 sm:gap-7">
          <Link
            href="/auth?mode=signin"
            className="hidden text-[15.5px] font-normal text-[#B7B2AA] transition hover:text-[#F6F3EE] sm:inline"
          >
            Log in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="hidden h-[46px] items-center justify-center rounded-full border border-[rgba(214,176,108,0.55)] bg-transparent px-[26px] text-[15.5px] font-medium text-[#F6F3EE] transition hover:border-[rgba(226,182,106,0.75)] hover:bg-white/[0.05] sm:inline-flex"
          >
            Sign up
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.14] text-[#F6F3EE] md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="obsidian-popover mx-4 mb-3 overflow-hidden md:hidden">
          <div className="flex flex-col py-2">
            <Link href="/browse" className="px-4 py-3 text-[15px] text-[#F6F3EE]" onClick={() => setMobileOpen(false)}>
              Browse
            </Link>
            <a href="#how-it-works" className="px-4 py-3 text-[15px] text-[#F6F3EE]" onClick={() => setMobileOpen(false)}>
              How it works
            </a>
            <Link href="/safety" className="px-4 py-3 text-[15px] text-[#F6F3EE]" onClick={() => setMobileOpen(false)}>
              Safety
            </Link>
            <div className="my-1 border-t border-white/[0.08]" />
            <Link href="/auth?mode=signin" className="px-4 py-3 text-[15px] text-[#F6F3EE]" onClick={() => setMobileOpen(false)}>
              Log in
            </Link>
            <Link href="/auth?mode=signup" className="px-4 py-3 text-[15px] font-medium text-[#D6B06C]" onClick={() => setMobileOpen(false)}>
              Sign up
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
