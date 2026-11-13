'use client'

import { useEffect } from 'react'
import Link from 'next/link'

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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-beam-base px-4 text-center">
      <p className="text-[22px] font-semibold tracking-tight text-[#071330]">HouseCall</p>
      <h1 className="mt-4 type-h2 text-beam-cream">Something went wrong</h1>
      <p className="mt-2 max-w-md type-sec text-beam-muted">
        The page hit an unexpected error. You can try again or return to a safe route.
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
          href="/home"
          className="touch-target inline-flex items-center rounded-lg border border-beam-line bg-white px-5 text-[14px] font-semibold text-beam-cream"
        >
          App home
        </Link>
        <Link
          href="/"
          className="touch-target inline-flex items-center px-3 text-[14px] font-medium text-beam-muted hover:underline"
        >
          Marketing
        </Link>
      </div>
    </div>
  )
}
