import type { Metadata } from 'next'
import { PolicyPlaceholder } from '@/screens/PolicyPlaceholder'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'How HouseCall collects, uses, and protects your information.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return <PolicyPlaceholder title="Privacy Policy" testId="privacy-page" />
}
