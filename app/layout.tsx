import type { Metadata, Viewport } from 'next'
import { DM_Sans, Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

/* Uber Move Text role → UI/body. Inter is the licensed geometric stand-in. */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

/* Uber Move role → display/headlines. DM Sans mirrors circular transit bowls. */
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const title = 'HouseCall. Local help, made easy'
const description =
  'Describe the job, compare priced offers, and choose local help that fits: home, auto, junk removal, pets, and other everyday tasks.'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.yariapp.com'),
  title: {
    default: title,
    template: '%s · HouseCall',
  },
  description,
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title,
    description,
    url: 'https://www.yariapp.com',
    siteName: 'HouseCall',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/beam-hero-moving-v2.jpg',
        width: 2880,
        height: 1926,
        alt: 'Neighbor carrying a moving box. HouseCall same-day help nearby',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/images/beam-hero-moving-v2.jpg'],
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
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  )
}
