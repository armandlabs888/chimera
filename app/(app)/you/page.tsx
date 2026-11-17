import type { Metadata } from 'next'
import { You } from '@/screens/You'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Your profile',
  description: 'How neighbors see your Bunk profile.',
  path: '/you',
  noindex: true,
})

export default function YouPage() {
  return <You />
}
