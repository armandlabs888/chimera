'use client'

import { Suspense, type ReactNode } from 'react'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'
import { MessagesDrawerHost } from '@/components/messages/MessagesDrawerHost'

/** Branded header + footer shell for 404 / error pages (guest or signed-in). */
export function GuestSiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#071330]">
      <LandingNav variant="light" />
      <main className="flex flex-1 flex-col">{children}</main>
      <LandingFooter />
      <Suspense fallback={null}>
        <MessagesDrawerHost />
      </Suspense>
    </div>
  )
}
