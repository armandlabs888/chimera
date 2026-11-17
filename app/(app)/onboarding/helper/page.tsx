import type { Metadata } from 'next'
import { HelperOnboarding } from '@/screens/HelperOnboarding'
import { enforceHelperProfileEditorAccess } from '@/lib/helperAccess.server'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Become a helper',
  description: 'Publish your BlockSide helper profile and start getting jobs nearby.',
  path: '/onboarding/helper',
  noindex: true,
})

export default async function Page() {
  await enforceHelperProfileEditorAccess()
  return <HelperOnboarding />
}
