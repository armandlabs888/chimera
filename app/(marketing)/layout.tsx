import type { ReactNode } from 'react'
import { BeamProvider } from '@/context/BeamContext'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  // Non-blocking so marketing SSR still emits hero copy for smoke/SEO,
  // while LandingHero can read authUser via useBeam for guest vs signed-in search.
  return <BeamProvider nonBlocking>{children}</BeamProvider>
}
