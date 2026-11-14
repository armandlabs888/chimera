import type { Metadata } from 'next'
import { HelperVerification } from '@/screens/verification/HelperVerification'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Verify',
  description: 'Complete your HouseCall helper location verification.',
  path: '/verify',
  noindex: true,
})

export default function VerifyPage() {
  return <HelperVerification />
}
