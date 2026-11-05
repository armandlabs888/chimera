import { Suspense } from 'react'
import { PostRequest } from '@/screens/PostRequest'

export default function PostPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-beam-muted">Loading…</div>}>
      <PostRequest />
    </Suspense>
  )
}
