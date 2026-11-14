import type { Metadata } from 'next'
import { HelperOnboarding } from '@/screens/HelperOnboarding'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Become a helper',
  description: 'Publish your HouseCall helper profile and start getting jobs nearby.',
  path: '/onboarding/helper',
  noindex: true,
})

export default function Page() {
  return <HelperOnboarding />
}
