'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useBeam } from '@/context/BeamContext'

/**
 * Thin 2px top progress bar for session boot and client navigations.
 * Never replaces the page with a full-screen splash.
 */
export function RouteProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { ready } = useBeam()
  const [navPending, setNavPending] = useState(false)
  const [width, setWidth] = useState(0)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const key = `${pathname}?${searchParams?.toString() ?? ''}`
  const prevKey = useRef(key)

  useEffect(() => {
    if (prevKey.current === key) return
    prevKey.current = key
    setNavPending(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setNavPending(false), 280)
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [key])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }
      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return
        if (`${url.pathname}${url.search}` === `${window.location.pathname}${window.location.search}`) {
          return
        }
      } catch {
        return
      }
      setNavPending(true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  const active = !ready || navPending

  useEffect(() => {
    if (tickTimer.current) {
      clearInterval(tickTimer.current)
      tickTimer.current = null
    }
    if (!active) {
      setWidth(100)
      const done = setTimeout(() => setWidth(0), 180)
      return () => clearTimeout(done)
    }
    setWidth(12)
    tickTimer.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 88) return w
        return w + Math.max(1, (90 - w) * 0.08)
      })
    }, 120)
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current)
    }
  }, [active])

  if (!active && width === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] overflow-hidden"
      role="progressbar"
      aria-hidden={!active}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
      data-testid="route-progress-bar"
    >
      <div
        className="h-full bg-[#1D5CE5] transition-[width] duration-150 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
