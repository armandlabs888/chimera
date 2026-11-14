import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Onboarding } from '@/screens/Onboarding'
import { pageMetadata } from '@/lib/seo/site'

export const metadata: Metadata = pageMetadata({
  title: 'Get started',
  description: 'Finish setting up your HouseCall account.',
  path: '/onboarding',
  noindex: true,
})

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#F4F8FD]">
          <p className="text-[22px] font-semibold tracking-tight text-[#071330]">HouseCall</p>
        </div>
      }
    >
      <Onboarding />
    </Suspense>
  )
}
