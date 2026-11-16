import { Suspense } from 'react'
import { LandingHero } from './LandingHero'
import { LandingNav } from './LandingNav'
import { LandingCategories } from './LandingCategories'
import { LandingHowItWorks } from './LandingHowItWorks'
import { LandingWhyBeam } from './LandingWhyBeam'
import { LandingClosingCta } from './LandingClosingCta'
import { LandingFooter } from './LandingFooter'
import { AccountDeletedNotice } from './AccountDeletedNotice'
import { MessagesDrawerHost } from '@/components/messages/MessagesDrawerHost'
import './landing-v2.css'

/** Landing v2 — flat overlay nav on full-bleed photo hero, Popular services first. */
export function LandingPage() {
  return (
    <div className="landing-root relative min-h-dvh bg-white text-[#071330]">
      <Suspense fallback={null}>
        <AccountDeletedNotice />
      </Suspense>
      {/* Outside the hero so absolute overlay is not trapped by isolate stacking. */}
      <LandingNav variant="overlay" />
      <main>
        <LandingHero />
        <LandingCategories />
        <LandingHowItWorks />
        <LandingWhyBeam />
        <LandingClosingCta />
      </main>
      <LandingFooter />
      {/* Account menu Messages on landing opens the same URL-backed drawer. */}
      <Suspense fallback={null}>
        <MessagesDrawerHost />
      </Suspense>
    </div>
  )
}
