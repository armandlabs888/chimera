import { Suspense } from 'react'
import { Browse } from '@/screens/Browse'

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-beam-muted">Loading browse…</div>}>
      <Browse />
    </Suspense>
  )
}
