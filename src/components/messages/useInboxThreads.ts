'use client'

import { useMemo } from 'react'
import { useBeam } from '@/context/BeamContext'
import { isUnreadMessageNotification, notificationTargetsThread } from '@/lib/messagesDrawer'
import type { HelpRequest, Message, MessageThread, Person } from '@/types'

export type InboxThreadRow = {
  thread: MessageThread
  other?: Person
  otherId?: string
  request?: HelpRequest
  last?: Message
  unread: boolean
  jobTitle: string
}

export function useInboxThreads() {
  const { state, currentUser, getPerson, getRequest, mode } = useBeam()
  const demo = mode === 'demo'
  const notifications = state.notifications ?? []

  const rows = useMemo<InboxThreadRow[]>(() => {
    return state.threads
      .filter((thread) => thread.participantIds.includes(currentUser.id))
      .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
      .map((thread) => {
        const otherId = thread.participantIds.find((id) => id !== currentUser.id)
        const other = otherId ? getPerson(otherId) : undefined
        const request = thread.requestId ? getRequest(thread.requestId) : undefined
        const last = state.messages
          .filter((message) => message.threadId === thread.id)
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]
        const unread = (state.notifications ?? []).some(
          (notification) =>
            isUnreadMessageNotification(notification, currentUser.id, demo) &&
            notificationTargetsThread(notification, thread.id, thread.requestId),
        )
        return {
          thread,
          other,
          otherId,
          request,
          last,
          unread,
          jobTitle: request?.title?.trim() || (thread.requestId ? 'Request' : 'Direct message'),
        }
      })
  }, [
    state.threads,
    state.messages,
    state.notifications,
    currentUser.id,
    demo,
    getPerson,
    getRequest,
  ])

  const unreadThreadCount = rows.filter((row) => row.unread).length
  const unreadNotificationCount = notifications.filter((notification) =>
    isUnreadMessageNotification(notification, currentUser.id, demo),
  ).length

  return { rows, unreadThreadCount, unreadNotificationCount }
}
