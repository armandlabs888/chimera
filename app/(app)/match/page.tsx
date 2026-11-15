import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Match } from '@/screens/Match'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Match',
  description:
    'Describe what you need on HouseCall and match with nearby helpers or open jobs.',
  path: '/match',
})

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-[#4A5568]">Loading matches…</div>}>
      <Match />
    </Suspense>
  )
}
