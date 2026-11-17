import type { Metadata } from 'next'
import { HomeDashboard } from '@/screens/HomeDashboard'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'My activity',
  description: 'Track your Bunk tasks, offers, and bookings.',
  path: '/home',
  noindex: true,
})

export default function HomePage() {
  return <HomeDashboard />
}
