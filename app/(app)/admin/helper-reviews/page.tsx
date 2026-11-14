import type { Metadata } from 'next'
import { HelperReviewsAdmin } from '@/screens/verification/HelperReviewsAdmin'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Helper reviews',
  description: 'Staff helper verification reviews for HouseCall.',
  path: '/admin/helper-reviews',
  noindex: true,
})

export default function HelperReviewsPage() {
  return <HelperReviewsAdmin />
}
