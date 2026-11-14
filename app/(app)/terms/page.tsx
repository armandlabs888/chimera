import type { Metadata } from 'next'
import { PolicyPlaceholder } from '@/screens/PolicyPlaceholder'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Service',
  description: 'HouseCall terms of service for neighbors and helpers.',
  path: '/terms',
})

export default function TermsPage() {
  return <PolicyPlaceholder title="Terms of Service" testId="terms-page" />
}
