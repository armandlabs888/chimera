import type { Metadata, Viewport } from 'next'
import { Open_Sans, Poppins } from 'next/font/google'
import type { ReactNode } from 'react'
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo/site'
import './globals.css'

/* Yelp-style body: Open Sans (humanist, dense list scanning). */
const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-open-sans',
  display: 'swap',
})

/* Yelp Cookbook display: Poppins for headers, biz names, buttons. */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

const title = 'HouseCall. Trusted help, right next door'
const description = DEFAULT_DESCRIPTION

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s | ${SITE_NAME}`,
  },
  description,
  applicationName: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title,
    description,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'Neighbor carrying a moving box. HouseCall same-day help nearby',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/images/og-default.jpg'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1D5CE5',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${openSans.variable} ${poppins.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  )
}
