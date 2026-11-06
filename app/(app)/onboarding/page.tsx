import { Suspense } from 'react'
import { Onboarding } from '@/screens/Onboarding'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#F4F8FD]">
          <p className="text-[22px] font-semibold tracking-tight text-[#071330]">Beam</p>
        </div>
      }
    >
      <Onboarding />
    </Suspense>
  )
}
