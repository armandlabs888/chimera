import { LandingHero } from './LandingHero'
import { LandingTrustStrip } from './LandingTrustStrip'
import { LandingWorkflow } from './LandingWorkflow'
import { LandingBento } from './LandingBento'
import { LandingCategories } from './LandingCategories'
import { LandingNeighborhoods } from './LandingNeighborhoods'
import { LandingPaths } from './LandingPaths'
import { LandingTrustFaq } from './LandingTrustFaq'
import { LandingFinalCta } from './LandingFinalCta'
import { LandingFooter } from './LandingFooter'

/** Warm-obsidian editorial marketing page. */
export function LandingPage() {
  return (
    <div className="landing-root relative min-h-dvh bg-[#0E0F12] text-[#F7F4EE]">
      <main>
        <LandingHero />
        <LandingTrustStrip />
        <LandingWorkflow />
        <LandingBento />
        <LandingCategories />
        <LandingNeighborhoods />
        <LandingPaths />
        <LandingTrustFaq />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
