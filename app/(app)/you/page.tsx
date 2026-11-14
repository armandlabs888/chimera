import type { Metadata } from 'next'
import { You } from '@/screens/You'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Profile',
  description: 'Your HouseCall profile and helper details.',
  path: '/you',
  noindex: true,
})

export default function YouPage() {
  return <You />
}
