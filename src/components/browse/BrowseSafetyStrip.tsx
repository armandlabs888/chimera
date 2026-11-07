'use client'

import Link from 'next/link'
import { ExternalLink, ShieldCheck } from 'lucide-react'

/**
 * Honest safety strip — mirrors Safety page commitments (scoped categories,
 * report unsafe requests). Does not claim unverifiable live moderation.
 */
export function BrowseSafetyStrip() {
  return (
    <div
      className="mt-6 flex flex-col gap-3 rounded-lg bg-[#071330] px-4 py-3.5 text-white sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      data-testid="browse-safety-strip"
      role="note"
    >
      <p className="flex min-w-0 items-start gap-2.5 text-[12.5px] leading-[1.45] text-white/90 sm:items-center">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400 sm:mt-0"
          strokeWidth={1.85}
          aria-hidden
        />
        <span>
          Protected marketplace. Six everyday categories, clear safety rules, and zero tolerance for
          unsafe requests.
        </span>
      </p>
      <Link
        href="/safety"
        className="inline-flex shrink-0 items-center gap-1.5 self-start text-[12.5px] font-semibold text-white transition hover:text-white/85 sm:self-auto"
      >
        Safety guidelines
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </Link>
    </div>
  )
}
