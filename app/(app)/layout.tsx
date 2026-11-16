import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { BeamProvider } from '@/context/BeamContext'
import { AppShell } from '@/components/Layout'
import { AuthGate } from '@/components/AuthGate'
import { ContentSkeleton } from '@/components/loading/ContentSkeleton'
import { RouteProgressBar } from '@/components/loading/RouteProgressBar'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <BeamProvider>
      <Suspense
        fallback={
          <div className="app-shell relative flex min-h-dvh flex-col bg-white text-[#071330]">
            <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] bg-[#1D5CE5]" />
            <main className="relative flex-1">
              <ContentSkeleton />
            </main>
          </div>
        }
      >
        <RouteProgressBar />
        <AppShell>
          <AuthGate>{children}</AuthGate>
        </AppShell>
      </Suspense>
    </BeamProvider>
  )
}
