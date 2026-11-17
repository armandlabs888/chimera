import type { Metadata } from 'next'
import { Safety } from '@/screens/Safety'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Safety',
  description:
    'Safety tips for neighbors and helpers on BlockSide, from meeting up for a job to reporting concerns and staying verified.',
  path: '/safety',
})

export default function SafetyPage() {
  return <Safety />
}
