import type { Metadata, Viewport } from 'next'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const title = 'Beam — Local help, made easy'
const description =
  'Post what you need done today and get priced offers with arrival times from vetted neighbors nearby. Peer-to-peer same-day help in your neighborhood.'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.yariapp.com'),
  title: {
    default: title,
    template: '%s · Beam',
  },
  description,
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title,
    description,
    url: 'https://www.yariapp.com',
    siteName: 'Beam',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/beam-hero-moving-v2.jpg',
        width: 2880,
        height: 1926,
        alt: 'Neighbor carrying a moving box — Beam same-day help nearby',
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
    <html lang="en" className={`${plusJakarta.variable} ${fraunces.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  )
}
