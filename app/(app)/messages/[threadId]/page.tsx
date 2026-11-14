import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Messages',
  description: 'Your HouseCall conversation.',
  path: '/messages',
  noindex: true,
})

/**
 * Thread deep links (`/messages/:threadId`, including notification hrefs)
 * open that conversation in the drawer over Browse.
 */
export default async function MessagesThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params
  redirect(`/browse?messages=1&thread=${encodeURIComponent(threadId)}`)
}
