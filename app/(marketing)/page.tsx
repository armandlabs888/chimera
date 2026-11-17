import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  pageMetadata,
} from '@/lib/seo/site'

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'BlockSide',
    description: DEFAULT_DESCRIPTION,
    path: '/',
  }),
  // Landing keeps the absolute default title (template would become "BlockSide | BlockSide").
  title: {
    absolute: DEFAULT_TITLE,
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
}

export default function HomePage() {
  return <LandingPage />
}
