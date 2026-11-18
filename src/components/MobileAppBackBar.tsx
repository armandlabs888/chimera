'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

/**
 * Compact phone-only top bar with back control for detail hubs
 * (settings account, verify, help, activity). Hidden from md up.
 */
export function MobileAppBackBar({
  href,
  title,
  testId = 'mobile-app-back',
}: {
  href: string
  title: string
  testId?: string
}) {
  return (
    <div
      className="sticky top-0 z-30 flex h-12 items-center gap-1 border-b border-[#E3E8EF] bg-white px-1 md:hidden"
      data-testid={testId}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <Link
        href={href}
        aria-label="Back"
        className="touch-press grid h-11 w-11 place-items-center rounded-lg text-[#071330]"
        data-testid={`${testId}-link`}
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
      </Link>
      <h1 className="min-w-0 flex-1 truncate pr-3 text-[17px] font-bold tracking-[-0.02em] text-[#071330]">
        {title}
      </h1>
    </div>
  )
}
