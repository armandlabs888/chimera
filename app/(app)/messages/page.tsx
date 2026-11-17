import type { Metadata } from 'next'
import { MessagesInbox } from '@/screens/MessagesInbox'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Messages',
  description: 'Your BlockSide conversations with neighbors and helpers.',
  path: '/messages',
  noindex: true,
})

/** Full-page messages workspace for direct links. */
export default function MessagesPage() {
  return (
    <div className="beam-page py-4 sm:py-6">
      <MessagesInbox />
    </div>
  )
}
