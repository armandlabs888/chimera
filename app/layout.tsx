import type { Metadata, Viewport } from 'next'
import { Geist, Newsreader } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal'],
  axes: ['opsz'],
  variable: '--font-serif',
  display: 'swap',
})

const title = 'Beam — Help nearby. Done today.'
const description =
  'Beam connects Austin neighbors for practical same-day help — post a task, compare priced offers with arrival windows, and coordinate in thread. Payments arranged peer-to-peer.'

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
  themeColor: '#0C0C0E',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${newsreader.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  )
}
