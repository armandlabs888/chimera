'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useSyncExternalStore } from 'react'
import { isMessagesDrawerOpen, threadIdFromSearch } from '@/lib/messagesDrawer'
import { readMessagesMinimized, writeMessagesMinimized } from '@/lib/messagesPanelSession'
import { useBeam } from '@/context/BeamContext'

const MINIMIZED_EVENT = 'bunk-messages-minimized'

function subscribeMinimized(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'bunk.messages.minimized') onStoreChange()
  }
  window.addEventListener(MINIMIZED_EVENT, onStoreChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(MINIMIZED_EVENT, onStoreChange)
    window.removeEventListener('storage', onStorage)
  }
}

function getMinimizedSnapshot() {
  return readMessagesMinimized()
}

function getMinimizedServerSnapshot() {
  return false
}

function setMinimized(next: boolean) {
  writeMessagesMinimized(next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MINIMIZED_EVENT))
  }
}

/**
 * URL-backed floating messages panel. Opening preserves the current route and
 * its other query params, and drops `job` so the browse detail drawer does not
 * stack on top of messages. Minimize state lives in sessionStorage so it
 * survives in-app navigation.
 */
export function useMessagesDrawer() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { mode, authUser } = useBeam()
  const isGuest = mode === 'live' && !authUser
  const open = isMessagesDrawerOpen(searchParams)
  const threadId = threadIdFromSearch(searchParams)
  const storedMinimized = useSyncExternalStore(
    subscribeMinimized,
    getMinimizedSnapshot,
    getMinimizedServerSnapshot,
  )
  const minimized = open && storedMinimized

  const write = useCallback(
    (next: URLSearchParams, history: 'push' | 'replace') => {
      const qs = next.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      if (history === 'push') router.push(href, { scroll: false })
      else router.replace(href, { scroll: false })
    },
    [pathname, router],
  )

  const openList = useCallback(() => {
    setMinimized(false)
    const next = new URLSearchParams(searchParams.toString())
    next.delete('job')
    next.set('messages', '1')
    next.delete('thread')
    write(next, 'push')
  }, [searchParams, write])

  const openThread = useCallback(
    (id: string) => {
      setMinimized(false)
      const next = new URLSearchParams(searchParams.toString())
      next.delete('job')
      next.set('messages', '1')
      next.set('thread', id)
      write(next, 'push')
    },
    [searchParams, write],
  )

  const closeThread = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString())
    next.set('messages', '1')
    next.delete('thread')
    write(next, 'replace')
  }, [searchParams, write])

  const closeAll = useCallback(() => {
    setMinimized(false)
    const next = new URLSearchParams(searchParams.toString())
    next.delete('messages')
    next.delete('thread')
    write(next, 'replace')
  }, [searchParams, write])

  const minimize = useCallback(() => {
    setMinimized(true)
    if (!open) {
      const next = new URLSearchParams(searchParams.toString())
      next.delete('job')
      next.set('messages', '1')
      write(next, 'replace')
    }
  }, [open, searchParams, write])

  const restore = useCallback(() => {
    setMinimized(false)
    if (!open) {
      const next = new URLSearchParams(searchParams.toString())
      next.delete('job')
      next.set('messages', '1')
      write(next, 'push')
    }
  }, [open, searchParams, write])

  const toggle = useCallback(() => {
    if (open && !minimized) closeAll()
    else if (open && minimized) restore()
    else openList()
  }, [closeAll, minimized, open, openList, restore])

  return {
    open,
    threadId,
    isGuest,
    minimized,
    openList,
    openThread,
    closeThread,
    closeAll,
    minimize,
    restore,
    toggle,
  }
}
