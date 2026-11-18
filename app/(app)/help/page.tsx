import type { Metadata } from 'next'
import { MobileAppBackBar } from '@/components/MobileAppBackBar'
import { Help } from '@/screens/Help'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Help',
  description:
    'Find answers about posting tasks, offers, verification, and your Bunk account, or contact support for more help.',
  path: '/help',
})

export default function HelpPage() {
  return (
    <>
      <MobileAppBackBar href="/settings" title="Help" testId="help-back" />
      <Help />
    </>
  )
}
