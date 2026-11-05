import { LandingNav } from './LandingNav'
import { LandingHero } from './LandingHero'
import { LandingProof } from './LandingProof'
import { LandingCategories } from './LandingCategories'
import { LandingPaths } from './LandingPaths'
import { LandingTrustFaq } from './LandingTrustFaq'
import { LandingFinalCta } from './LandingFinalCta'
import { LandingFooter } from './LandingFooter'

/** Conventional light SaaS marketing page — ordinary vertical document flow. */
export function LandingPage() {
  return (
    <div className="landing-root relative min-h-dvh bg-beam-base text-beam-cream">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingProof />
        <LandingCategories />
        <LandingPaths />
        <LandingTrustFaq />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
