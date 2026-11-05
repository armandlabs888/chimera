import type { ReactNode } from 'react'
import { BeamProvider } from '@/context/BeamContext'
import { AppShell } from '@/components/Layout'
import { AuthGate } from '@/components/AuthGate'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <BeamProvider>
      <AuthGate>
        <AppShell>{children}</AppShell>
      </AuthGate>
    </BeamProvider>
  )
}
