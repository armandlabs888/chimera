import Image from 'next/image'
import { LIFESTYLE } from '@/data/media'
import { LandingReveal } from './LandingReveal'

/**
 * How it works. Landing v2 tinted band with three compact steps (non-interactive).
 */
const STEPS = [
  {
    n: '1',
    title: 'Post your task',
    body: 'What needs doing, when you need it, and anything a helper should know.',
    src: LIFESTYLE.stepPost,
    alt: 'Woman typing a task on her phone at a kitchen table',
  },
  {
    n: '2',
    title: 'Compare offers',
    body: 'Review proposed price and arrival window before you choose.',
    src: LIFESTYLE.stepOffers,
    alt: 'Man on a porch looking at his phone to compare offers',
  },
  {
    n: '3',
    title: 'Chat, finish & review',
    body: 'Message in-app, complete the job, and leave feedback for others.',
    src: LIFESTYLE.stepDone,
    alt: 'Homeowner and helper shaking hands at the front door',
  },
] as const

export function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="landing-section relative overflow-hidden bg-white"
      data-testid="how-it-works"
    >
      <div className="beam-container relative">
        <LandingReveal>
          <p className="landing-section-eyebrow">How it works</p>
          <h2 className="landing-section-title">From to-do to done.</h2>
        </LandingReveal>
        <div
          className="mt-7 grid items-stretch gap-4 bg-transparent md:grid-cols-3 md:gap-5"
          data-testid="how-it-works-steps"
        >
          {STEPS.map((step, index) => (
            <LandingReveal key={step.n} as="article" className="h-full">
              <div
                className="landing-step-card"
                style={{ transitionDelay: `${index * 60}ms` }}
              >
                <div className="landing-step-media">
                  <Image
                    src={step.src}
                    alt={step.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="landing-step-body">
                  <span className="landing-step-num" aria-hidden="true">
                    {step.n}
                  </span>
                  <h3 className="landing-step-title">{step.title}</h3>
                  <p className="landing-step-copy">{step.body}</p>
                </div>
              </div>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
