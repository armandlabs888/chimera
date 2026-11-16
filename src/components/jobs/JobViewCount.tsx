'use client'

import { Eye } from 'lucide-react'
import { formatViewCountLabel } from '@/lib/helpRequestViews'

/** Muted meta item: eye icon + "12 views". Hidden when count is 0. */
export function JobViewCount({
  count,
  className = '',
  testId,
}: {
  count?: number | null
  className?: string
  testId?: string
}) {
  const label = formatViewCountLabel(count)
  if (!label) return null

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`.trim()}
      data-testid={testId ?? 'job-view-count'}
      style={{ color: 'inherit' }}
    >
      <Eye className="h-[13px] w-[13px] shrink-0" strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </span>
  )
}

/** Dot-separated meta fragment for list rows / captions. */
export function JobViewCountMetaSep({
  count,
  testId,
}: {
  count?: number | null
  testId?: string
}) {
  const label = formatViewCountLabel(count)
  if (!label) return null

  return (
    <>
      <span className="browse-hc-dot" aria-hidden>
        ·
      </span>
      <JobViewCount count={count} testId={testId} />
    </>
  )
}
