import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { BeamProvider } from '@/context/BeamContext'
import { AppShell } from '@/components/Layout'
import { AuthGate } from '@/components/AuthGate'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <BeamProvider>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-beam-base text-beam-cream">
            <p className="text-[22px] font-semibold tracking-tight text-[#071330]" aria-busy="true">
              Beam
            </p>
          </div>
        }
      >
        <AuthGate>
          <AppShell>{children}</AppShell>
        </AuthGate>
      </Suspense>
    </BeamProvider>
  )
}
