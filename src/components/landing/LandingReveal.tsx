'use client'

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react'

type RevealTag = 'div' | 'section' | 'article' | 'li' | 'ul'

/**
 * Subtle once-only entrance reveal. Content stays fully visible without JS
 * (and until mount) so there is no hydration flicker. After mount, marks the
 * node ready and reveals on first intersection unless reduced motion is on.
 */
export function LandingReveal({
  children,
  className = '',
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: RevealTag
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      el.setAttribute('data-reveal-ready', '')
      el.setAttribute('data-reveal-visible', '')
      return
    }

    const rect = el.getBoundingClientRect()
    const alreadyInView =
      rect.top < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.08
    if (alreadyInView) {
      el.setAttribute('data-reveal-ready', '')
      el.setAttribute('data-reveal-visible', '')
      return
    }

    el.setAttribute('data-reveal-ready', '')

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          el.setAttribute('data-reveal-visible', '')
          io.disconnect()
          break
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag ref={ref as never} className={`landing-reveal ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  )
}
