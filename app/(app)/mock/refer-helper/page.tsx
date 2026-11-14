import { Suspense } from 'react'
import { ReferHelperMockScreens } from '@/screens/mock/ReferHelperMockScreens'

export default function ReferHelperMockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[15px] font-semibold text-[#071330]">
          Loading mock…
        </div>
      }
    >
      <ReferHelperMockScreens />
    </Suspense>
  )
}
