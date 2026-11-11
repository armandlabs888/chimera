'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useBeam } from '@/context/BeamContext'
import { isMessagesDrawerOpen, threadIdFromSearch } from '@/lib/messagesDrawer'

/**
 * URL-backed messages drawer. Opening preserves the current route and its
 * other query params, and drops `job` so the browse detail drawer does not
 * stack a second focus trap on top of messages.
 */
export function useMessagesDrawer() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { mode, authUser } = useBeam()
  const isGuest = mode === 'live' && !authUser
  const open = isMessagesDrawerOpen(searchParams)
  const threadId = threadIdFromSearch(searchParams)

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
    const next = new URLSearchParams(searchParams.toString())
    next.delete('job')
    next.set('messages', '1')
    next.delete('thread')
    write(next, 'push')
  }, [searchParams, write])

  const openThread = useCallback(
    (id: string) => {
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
    const next = new URLSearchParams(searchParams.toString())
    next.delete('messages')
    next.delete('thread')
    write(next, 'replace')
  }, [searchParams, write])

  const toggle = useCallback(() => {
    if (open) closeAll()
    else openList()
  }, [closeAll, open, openList])

  return {
    open,
    threadId,
    isGuest,
    openList,
    openThread,
    closeThread,
    closeAll,
    toggle,
  }
}
