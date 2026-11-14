import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'HouseCall',
    description:
      'Describe the job, compare priced offers, and choose local help that fits: home, auto, junk removal, pets, and other everyday tasks.',
    path: '/',
  }),
  // Landing keeps the absolute default title (template would become "HouseCall | HouseCall").
  title: {
    absolute: 'HouseCall. Trusted help, right next door',
  },
}

export default function HomePage() {
  return <LandingPage />
}
