import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'
import { pageMetadata } from '@/lib/seo/site'

const landingTitle = 'Bunk. Trusted help, right next door'
const landingDescription =
  'Describe the job, compare priced offers, and choose local help that fits: home, auto, junk removal, pets, and other everyday tasks.'

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Bunk',
    description: landingDescription,
    path: '/',
  }),
  // Landing keeps the absolute default title (template would become "Bunk | Bunk").
  title: {
    absolute: landingTitle,
  },
  openGraph: {
    title: landingTitle,
    description: landingDescription,
  },
  twitter: {
    title: landingTitle,
    description: landingDescription,
  },
}

export default function HomePage() {
  return <LandingPage />
}
