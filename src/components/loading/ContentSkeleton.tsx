import { Skeleton } from '@/components/ui'

/** Lightweight content-area placeholder. Never a full-screen takeover. */
export function ContentSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="px-4 py-6" aria-busy="true" aria-label={label} data-testid="content-skeleton">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  )
}
