'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { BeamProvider } from '@/context/BeamContext'
import { GuestSiteChrome } from '@/components/marketing/GuestSiteChrome'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <BeamProvider nonBlocking>
      <GuestSiteChrome>
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
          <p className="font-display text-[22px] font-bold tracking-tight text-[#071330]">HouseCall</p>
          <h1 className="mt-4 type-h2 text-[#071330]">Something went wrong</h1>
          <p className="mt-2 max-w-md type-sec text-beam-muted">
            The page hit an unexpected error. You can try again or return to HouseCall home.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="touch-target inline-flex items-center rounded-lg bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white hover:bg-[#1649BD]"
            >
              Try again
            </button>
            <Link
              href="/browse"
              className="touch-target inline-flex items-center rounded-lg border border-beam-line bg-white px-5 text-[14px] font-semibold text-[#071330]"
            >
              Browse jobs
            </Link>
            <Link
              href="/"
              className="touch-target inline-flex items-center px-3 text-[14px] font-medium text-beam-muted hover:underline"
            >
              HouseCall home
            </Link>
          </div>
        </div>
      </GuestSiteChrome>
    </BeamProvider>
  )
}
