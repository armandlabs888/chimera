import type { Metadata, Viewport } from 'next'
import { Fraunces, Outfit } from 'next/font/google'
import type { ReactNode } from 'react'
import { BeamProvider } from '@/context/BeamContext'
import { AppShell } from '@/components/Layout'
import { AuthGate } from '@/components/AuthGate'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['500', '600', '700'],
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Beam — Help nearby. Done today.',
  description: 'Beam — Help nearby. Done today. Hyper-local same-day help marketplace.',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0c0c0e',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${outfit.variable}`}>
      <body>
        <BeamProvider>
          <AuthGate>
            <AppShell>{children}</AppShell>
          </AuthGate>
        </BeamProvider>
      </body>
    </html>
  )
}
