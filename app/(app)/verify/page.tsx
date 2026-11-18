import type { Metadata } from 'next'
import { MobileAppBackBar } from '@/components/MobileAppBackBar'
import { HelperVerification } from '@/screens/verification/HelperVerification'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Verify',
  description: 'Complete your Bunk helper location verification.',
  path: '/verify',
  noindex: true,
})

export default function VerifyPage() {
  return (
    <>
      <MobileAppBackBar href="/settings" title="Get verified" testId="verify-back" />
      <HelperVerification />
    </>
  )
}
