import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { BeamProvider } from '@/context/BeamContext'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Sign in',
  description: 'Sign in or create a HouseCall account to post tasks and help neighbors.',
  path: '/auth',
  noindex: true,
})

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <BeamProvider>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-beam-base text-beam-cream">
            <p className="text-[22px] font-semibold tracking-tight text-[#071330]">HouseCall</p>
          </div>
        }
      >
        {children}
      </Suspense>
    </BeamProvider>
  )
}
