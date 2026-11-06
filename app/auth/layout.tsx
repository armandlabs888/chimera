import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { BeamProvider } from '@/context/BeamContext'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <BeamProvider>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-beam-base text-beam-cream">
            <p className="text-[22px] font-semibold tracking-tight text-[#FAF8F4]">Beam</p>
          </div>
        }
      >
        {children}
      </Suspense>
    </BeamProvider>
  )
}
