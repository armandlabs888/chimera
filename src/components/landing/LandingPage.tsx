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

/** Landing v2 — solid white sticky header above a contained rounded photo hero. */
export function LandingPage() {
  return (
    <div className="landing-root relative min-h-dvh bg-white text-[#071330]">
      <Suspense fallback={null}>
        <AccountDeletedNotice />
      </Suspense>
      <LandingNav variant="light" />
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
