import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PostRequest } from '@/screens/PostRequest'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Post a task',
  description: 'Post a task on HouseCall and get priced offers from local helpers.',
  path: '/post',
  noindex: true,
})

export default function PostPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-beam-muted">Loading…</div>}>
      <PostRequest />
    </Suspense>
  )
}
