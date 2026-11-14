import { Suspense } from 'react'
import { LandingHero } from './LandingHero'
import { LandingCategories } from './LandingCategories'
import { LandingHowItWorks } from './LandingHowItWorks'
import { LandingWhyBeam } from './LandingWhyBeam'
import { LandingClosingCta } from './LandingClosingCta'
import { LandingFooter } from './LandingFooter'
import { AccountDeletedNotice } from './AccountDeletedNotice'

/** Landing v2 — floating glass nav, full-bleed photo hero, Popular services first. */
export function LandingPage() {
  return (
    <div className="landing-root relative min-h-dvh bg-white text-[#071330]">
      <Suspense fallback={null}>
        <AccountDeletedNotice />
      </Suspense>
      <main>
        <LandingHero />
        <LandingCategories />
        <LandingHowItWorks />
        <LandingWhyBeam />
        <LandingClosingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
