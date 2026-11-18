import type { Metadata } from 'next'
import { MessagesInbox } from '@/screens/MessagesInbox'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Messages',
  description: 'Your Bunk conversations with neighbors and helpers.',
  path: '/messages',
  noindex: true,
})

/** Full-page messages workspace for direct links. Phone tab destination. */
export default function MessagesPage() {
  return (
    <div className="bunk-push-in beam-page py-0 md:py-4 lg:py-6">
      <MessagesInbox />
    </div>
  )
}
