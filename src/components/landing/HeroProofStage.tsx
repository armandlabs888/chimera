'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { LandingHero } from './LandingHero'
import { LandingProofContent } from './LandingProof'

type StageMode = 'stack' | 'horizontal'

function prefersHorizontal(): boolean {
  if (typeof window === 'undefined') return false
  const wide = window.matchMedia('(min-width: 1024px)').matches
  const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  return wide && motionOk
}

/**
 * Bounded hero → proof handoff.
 * Desktop + motion: vertical native scroll drives a sticky track; proof enters from the right.
 * Mobile / reduced-motion / tall proof: ordinary vertical stack (no scroll-linked transforms).
 * No wheel/touch interception.
 */
export function HeroProofStage() {
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const proofMeasureRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<StageMode>('stack')
  const progressRef = useRef(0)

  const evaluateMode = useCallback(() => {
    if (!prefersHorizontal()) {
      setMode('stack')
      return
    }
    const pinH = window.innerHeight
    const proofH = proofMeasureRef.current?.scrollHeight ?? 0
    // Tall panels: stay in normal flow instead of clipping
    if (proofH > pinH - 8) {
      setMode('stack')
      return
    }
    setMode('horizontal')
  }, [])

  const setNavTone = useCallback((overDark: boolean) => {
    document.documentElement.dataset.landingNav = overDark ? 'dark' : 'light'
  }, [])

  const updateProgress = useCallback(() => {
    const stage = stageRef.current
    const track = trackRef.current
    if (!stage || !track || mode !== 'horizontal') {
      if (mode === 'stack') setNavTone(false)
      return
    }

    const rect = stage.getBoundingClientRect()
    const stageTop = window.scrollY + rect.top
    const range = Math.max(1, stage.offsetHeight - window.innerHeight)
    const raw = (window.scrollY - stageTop) / range
    const progress = Math.min(1, Math.max(0, raw))
    progressRef.current = progress
    stage.style.setProperty('--hero-progress', String(progress))
    track.style.transform = `translate3d(${-progress * 50}%, 0, 0)`

    // Dark nav while hero panel dominates; light once proof is majority-visible
    const inStage = rect.top < window.innerHeight && rect.bottom > 0
    setNavTone(inStage && progress < 0.55)

    // Keep #how-it-works focus target meaningful: when focused via hash, ensure progress ~1
  }, [mode, setNavTone])

  useLayoutEffect(() => {
    evaluateMode()
  }, [evaluateMode])

  useEffect(() => {
    const onResize = () => {
      evaluateMode()
      updateProgress()
    }
    const mqWide = window.matchMedia('(min-width: 1024px)')
    const mqMotion = window.matchMedia('(prefers-reduced-motion: no-preference)')
    mqWide.addEventListener('change', onResize)
    mqMotion.addEventListener('change', onResize)
    window.addEventListener('resize', onResize)
    return () => {
      mqWide.removeEventListener('change', onResize)
      mqMotion.removeEventListener('change', onResize)
      window.removeEventListener('resize', onResize)
    }
  }, [evaluateMode, updateProgress])

  useEffect(() => {
    if (mode !== 'horizontal') {
      const stage = stageRef.current
      const track = trackRef.current
      stage?.style.setProperty('--hero-progress', '0')
      if (track) track.style.transform = ''
      // Stack mode: dark only while hero top is in view
      const onScrollStack = () => {
        const hero = document.getElementById('hero')
        if (!hero) {
          setNavTone(false)
          return
        }
        const r = hero.getBoundingClientRect()
        const over = r.top < 56 && r.bottom > 80
        setNavTone(over)
      }
      onScrollStack()
      window.addEventListener('scroll', onScrollStack, { passive: true })
      return () => window.removeEventListener('scroll', onScrollStack)
    }

    const rafRef = { id: 0 }
    const onScroll = () => {
      cancelAnimationFrame(rafRef.id)
      rafRef.id = requestAnimationFrame(updateProgress)
    }
    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(rafRef.id)
      window.removeEventListener('scroll', onScroll)
    }
  }, [mode, updateProgress, setNavTone])

  const scrollStageTo = useCallback((panel: 'hero' | 'proof') => {
    const stage = stageRef.current
    if (!stage) return
    if (mode !== 'horizontal') {
      document.getElementById(panel === 'proof' ? 'how-it-works' : 'hero')?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      })
      return
    }
    const top =
      panel === 'proof'
        ? stage.offsetTop + stage.offsetHeight - window.innerHeight
        : stage.offsetTop
    window.scrollTo({ top, behavior: 'auto' })
  }, [mode])

  // Hash / focus: reveal the intended panel (no off-screen focus traps)
  useEffect(() => {
    const revealProof = () => {
      if (location.hash !== '#how-it-works') return
      scrollStageTo('proof')
    }
    revealProof()
    window.addEventListener('hashchange', revealProof)
    return () => window.removeEventListener('hashchange', revealProof)
  }, [scrollStageTo])

  useEffect(() => {
    if (mode !== 'horizontal') return
    const stage = stageRef.current
    if (!stage) return
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const panel = target.closest<HTMLElement>('[data-panel]')
      if (!panel) return
      const which = panel.dataset.panel
      if (which === 'proof' && progressRef.current < 0.85) scrollStageTo('proof')
      if (which === 'hero' && progressRef.current > 0.15) scrollStageTo('hero')
    }
    stage.addEventListener('focusin', onFocusIn)
    return () => stage.removeEventListener('focusin', onFocusIn)
  }, [mode, scrollStageTo])

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.landingNav
    }
  }, [])

  const proofPanel: ReactNode = (
    <div
      ref={proofMeasureRef}
      className="hero-stage-proof flex h-full w-full flex-col justify-center overflow-y-auto bg-beam-ink"
    >
      <LandingProofContent />
    </div>
  )

  if (mode === 'stack') {
    return (
      <div className="hero-stage hero-stage--stack" data-hero-mode="stack">
        <LandingHero />
        <section
          id="how-it-works"
          className="scroll-mt-16 border-t border-beam-line bg-beam-ink"
        >
          {proofPanel}
        </section>
      </div>
    )
  }

  return (
    <div
      ref={stageRef}
      className="hero-stage hero-stage--horizontal"
      data-hero-mode="horizontal"
      style={{ ['--hero-progress' as string]: 0 }}
    >
      {/* Scroll target: mid-stage so #how-it-works lands on the proof panel */}
      <div
        id="how-it-works"
        className="hero-stage-anchor pointer-events-none absolute left-0 top-1/2 h-px w-px scroll-mt-16"
        aria-hidden
      />
      <div className="hero-stage-pin">
        <div ref={trackRef} className="hero-stage-track">
          <div className="hero-stage-panel" data-panel="hero">
            <LandingHero />
          </div>
          <div
            className="hero-stage-panel"
            data-panel="proof"
            role="region"
            aria-label="How it works"
          >
            {proofPanel}
          </div>
        </div>
      </div>
    </div>
  )
}
