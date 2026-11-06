import { Skeleton } from '@/components/ui'

export default function AppLoading() {
  return (
    <div className="px-4 py-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-56 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    </div>
  )
}
