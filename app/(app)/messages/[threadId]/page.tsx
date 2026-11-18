import type { Metadata } from 'next'
import { MessagesInbox } from '@/screens/MessagesInbox'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Messages',
  description: 'Your Bunk conversation.',
  path: '/messages',
  noindex: true,
})

/** Full-page thread view for deep links. */
export default async function MessagesThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params
  return (
    <div className="bunk-push-in beam-page py-0 md:py-4 lg:py-6">
      <MessagesInbox embedThreadId={threadId} />
    </div>
  )
}
