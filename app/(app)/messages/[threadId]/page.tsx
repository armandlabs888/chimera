import { redirect } from 'next/navigation'

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
