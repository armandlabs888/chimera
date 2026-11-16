import type { Metadata } from 'next'
import { SettingsAccount } from '@/screens/SettingsAccount'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Settings',
  description: 'Manage your Bunk account, notifications, and preferences.',
  path: '/settings/account',
  noindex: true,
})

export default function SettingsAccountPage() {
  return <SettingsAccount />
}
