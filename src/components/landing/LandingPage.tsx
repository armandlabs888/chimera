import { LandingNav } from './LandingNav'
import { LandingHero } from './LandingHero'
import { LandingProof } from './LandingProof'
import { LandingCategories } from './LandingCategories'
import { LandingPaths } from './LandingPaths'
import { LandingTrustFaq } from './LandingTrustFaq'
import { LandingFinalCta } from './LandingFinalCta'
import { LandingFooter } from './LandingFooter'

export function LandingPage() {
  return (
    <div className="landing-root relative min-h-dvh bg-beam-base text-beam-cream">
      <div className="pointer-events-none fixed inset-0 grain opacity-25" aria-hidden />
      <LandingNav />
      {/* beam-stack ancestors must stay overflow:visible so position:sticky works */}
      <main className="beam-stack">
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
