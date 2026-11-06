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
      <p className="text-[22px] font-semibold tracking-tight text-beam-charcoal">Beam</p>
      <h1 className="mt-4 type-h2 text-beam-cream">Something went wrong</h1>
      <p className="mt-2 max-w-md type-sec text-beam-muted">
        The page hit an unexpected error. You can try again or return to a safe route.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="touch-target inline-flex items-center rounded-[10px] bg-beam-charcoal px-4 text-[14px] font-semibold text-white"
        >
          Try again
        </button>
        <Link
          href="/home"
          className="touch-target inline-flex items-center rounded-[10px] border border-beam-line px-4 text-[14px] font-medium text-beam-cream"
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
