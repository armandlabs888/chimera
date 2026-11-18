'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 767px)'

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia(QUERY)
  const handler = () => onChange()
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

function getSnapshot() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  return false
}

/** True below the md breakpoint (phones). Desktop/tablet keep current chrome. */
export function useIsPhone() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
