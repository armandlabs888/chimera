import type { BeamNotification } from '@/types'

/** Query flag that opens the messages list drawer on the current route. */
export const MESSAGES_QUERY = 'messages'
/** Query flag for the conversation layer (`?thread=`). */
export const THREAD_QUERY = 'thread'

export function threadIdFromSearch(params: { get: (key: string) => string | null }): string {
  return (params.get(THREAD_QUERY) ?? '').trim()
}

/** Drawer is open when `messages=1` or a thread id is present. */
export function isMessagesDrawerOpen(params: { get: (key: string) => string | null }): boolean {
  if (params.get(MESSAGES_QUERY) === '1') return true
  return threadIdFromSearch(params).length > 0
}

/**
 * `/messages` and `/messages/:threadId` (and the same paths with a query).
 * Returns `''` for the inbox route and `null` when the href is not messaging.
 */
export function threadIdFromMessagesHref(href: string): string | null {
  let url: URL
  try {
    url = new URL(href, 'https://beam.local')
  } catch {
    return null
  }
  const fromQuery = (url.searchParams.get(THREAD_QUERY) ?? '').trim()
  if (url.pathname === '/messages') return fromQuery
  const match = url.pathname.match(/^\/messages\/([^/]+)\/?$/)
  if (!match) {
    if (fromQuery && (url.searchParams.get(MESSAGES_QUERY) === '1' || url.pathname === '/browse')) {
      return fromQuery
    }
    return null
  }
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function isMessagesHref(href: string): boolean {
  return threadIdFromMessagesHref(href) !== null
}

/** Same unread rule the headers already use: `new_message`, unread, for this user (all users in demo). */
export function isUnreadMessageNotification(
  notification: Pick<BeamNotification, 'kind' | 'readAt' | 'userId'>,
  userId: string,
  demo: boolean,
): boolean {
  if (notification.kind !== 'new_message' || notification.readAt) return false
  if (demo) return true
  return notification.userId === userId
}

/**
 * A `new_message` notification belongs to a thread when its href names that thread,
 * or (fallback) names the request without naming a different thread.
 */
export function notificationTargetsThread(
  notification: Pick<BeamNotification, 'href' | 'requestId'>,
  threadId: string,
  requestId?: string | null,
): boolean {
  const href = notification.href || ''
  let url: URL
  try {
    url = new URL(href, 'https://beam.local')
  } catch {
    return false
  }

  const queryThread = (url.searchParams.get(THREAD_QUERY) ?? '').trim()
  if (queryThread && queryThread === threadId) return true

  const pathMatch = url.pathname.match(/^\/messages\/([^/]+)\/?$/)
  if (pathMatch) {
    let named = pathMatch[1]
    try {
      named = decodeURIComponent(pathMatch[1])
    } catch {
      named = pathMatch[1]
    }
    return named === threadId
  }

  if (!requestId) return false
  if (notification.requestId === requestId) return true
  return url.pathname.includes(requestId) || url.search.includes(requestId)
}

export function notificationMatchesThread(
  notification: BeamNotification,
  threadId: string,
  requestId: string | null | undefined,
  userId: string,
  demo: boolean,
): boolean {
  if (!isUnreadMessageNotification(notification, userId, demo)) return false
  return notificationTargetsThread(notification, threadId, requestId)
}
