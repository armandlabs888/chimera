'use client'

import type { ReactNode } from 'react'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'

/** Guest header + footer shell for branded 404 / error pages. */
export function GuestSiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F9FF] text-[#071330]">
      <LandingNav variant="light" />
      <main className="flex flex-1 flex-col">{children}</main>
      <LandingFooter />
    </div>
  )
}
