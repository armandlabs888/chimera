import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { RouteProgressBar } from '@/components/loading/RouteProgressBar'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Sign in',
  description: 'Sign in or create a HouseCall account to post tasks and help neighbors.',
  path: '/auth',
  noindex: true,
})

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-dvh bg-white">
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] bg-[#1D5CE5]" />
        </div>
      }
    >
      <RouteProgressBar />
      {children}
    </Suspense>
  )
}
