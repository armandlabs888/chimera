import type { Metadata } from 'next'
import { Help } from '@/screens/Help'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Help and contact',
  description:
    'Search common questions, contact Bunk support, or share feedback about jobs, your account, or verification.',
  path: '/help',
})

export default function HelpPage() {
  return <Help />
}
