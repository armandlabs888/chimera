import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Browse } from '@/screens/Browse'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Browse',
  description:
    'Browse open local jobs on BlockSide. See nearby tasks for home, auto, junk removal, and pets, then send a priced offer.',
  path: '/browse',
})

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-beam-muted">Loading browse…</div>}>
      <Browse />
    </Suspense>
  )
}
