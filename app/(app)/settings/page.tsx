import type { Metadata } from 'next'
import { Settings } from '@/screens/Settings'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Settings',
  description: 'Manage your HouseCall account, notifications, and preferences.',
  path: '/settings',
  noindex: true,
})

export default function SettingsPage() {
  return <Settings />
}
