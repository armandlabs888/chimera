import type { Metadata } from 'next'
import { Help } from '@/screens/Help'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Help',
  description:
    'Find answers about posting tasks, offers, verification, and your BlockSide account, or contact support for more help.',
  path: '/help',
})

export default function HelpPage() {
  return <Help />
}
