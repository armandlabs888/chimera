import type { ReactNode } from 'react'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  // Auth/session comes from the root BeamProvider so hero search → /match
  // keeps signed-in header chrome (avatar menu) without a remount flash.
  return children
}
