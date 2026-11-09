import { LandingHero } from './LandingHero'
import { LandingCategories } from './LandingCategories'
import { LandingHowItWorks } from './LandingHowItWorks'
import { LandingAvailableServices } from './LandingAvailableServices'
import { LandingWhyBeam } from './LandingWhyBeam'
import { LandingClosingCta } from './LandingClosingCta'
import { LandingFooter } from './LandingFooter'

/** Landing v2 — floating glass nav, atmospheric hero, stacked Browse preview. */
export function LandingPage() {
  return (
    <div className="landing-root relative min-h-dvh bg-white text-[#071330]">
      <main>
        <LandingHero />
        <LandingCategories />
        <LandingHowItWorks />
        <LandingAvailableServices />
        <LandingWhyBeam />
        <LandingClosingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
