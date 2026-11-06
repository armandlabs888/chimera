import { LandingHero } from './LandingHero'
import { LandingCategories } from './LandingCategories'
import { LandingHowItWorks } from './LandingHowItWorks'
import { LandingCoverageSafety } from './LandingCoverageSafety'
import { LandingFooter } from './LandingFooter'

/** Reference-locked 4-section landing. */
export function LandingPage() {
  return (
    <div className="landing-root relative min-h-dvh bg-[#0C0C0E] text-[#F6F3EE]">
      <main>
        <LandingHero />
        <LandingCategories />
        <LandingHowItWorks />
        <LandingCoverageSafety />
      </main>
      <LandingFooter />
    </div>
  )
}
