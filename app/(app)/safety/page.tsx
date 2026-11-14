import type { Metadata } from 'next'
import { Safety } from '@/screens/Safety'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Safety',
  description: 'Safety tips and guidelines for neighbors and helpers on HouseCall.',
  path: '/safety',
})

export default function SafetyPage() {
  return <Safety />
}
