import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ContentSkeleton } from '@/components/loading/ContentSkeleton'
import { Onboarding } from '@/screens/Onboarding'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Get started',
  description: 'Finish setting up your BlockSide account.',
  path: '/onboarding',
  noindex: true,
})

export default function Page() {
  return (
    <Suspense fallback={<ContentSkeleton label="Loading onboarding" />}>
      <Onboarding />
    </Suspense>
  )
}
