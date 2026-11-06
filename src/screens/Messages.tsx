'use client'

import { useParams } from 'next/navigation'
import { MessagesInbox } from '@/screens/MessagesInbox'

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

/** Thread route — renders split-pane inbox with the active conversation. */
export function Messages() {
  const params = useParams()
  const threadId = paramId(params.threadId)
  return <MessagesInbox embedThreadId={threadId} />
}
