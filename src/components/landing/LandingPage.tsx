import { LandingHero } from './LandingHero'
import { LandingCategories } from './LandingCategories'
import { LandingHowItWorks } from './LandingHowItWorks'
import { LandingWhyBeam } from './LandingWhyBeam'
import { LandingHelpers } from './LandingHelpers'
import { LandingFooter } from './LandingFooter'

/** Daylight Home Services marketplace landing — Dribbble shot 27708245. */
export function LandingPage() {
  return (
    <div className="landing-root relative min-h-dvh bg-white text-[#071330]">
      <main>
        <LandingHero />
        <LandingCategories />
        <LandingHowItWorks />
        <LandingWhyBeam />
        <LandingHelpers />
      </main>
      <LandingFooter />
    </div>
  )
}
