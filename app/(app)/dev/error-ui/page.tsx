'use client'

/**
 * Demo-only preview of the global error UI for responsive audits.
 * Not linked from nav. Live builds without demo mode redirect home.
 */
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HouseCallWordmark } from '@/components/HouseCallWordmark'
import { isExplicitDemoMode } from '@/lib/config'

export default function ErrorUiPreviewPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isExplicitDemoMode()) router.replace('/')
  }, [router])

  if (!isExplicitDemoMode()) {
    return (
      <div className="beam-container py-16 text-center text-[14px] text-[#4A5568]">
        Opening…
      </div>
    )
  }

  return (
    <div
      className="beam-container flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-24"
      data-testid="error-ui-preview"
    >
      <HouseCallWordmark size={22} />
      <h1 className="mt-4 type-h2 text-[#071330]">Something went wrong</h1>
      <p className="mt-2 max-w-md type-sec text-beam-muted">
        The page hit an unexpected error. You can try again or return to HouseCall home.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="touch-target inline-flex items-center rounded-lg bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white hover:bg-[#1649BD]"
        >
          Try again
        </button>
        <Link
          href="/browse"
          className="touch-target inline-flex items-center rounded-lg border border-beam-line bg-white px-5 text-[14px] font-semibold text-[#071330]"
        >
          Back to browse
        </Link>
      </div>
    </div>
  )
}
