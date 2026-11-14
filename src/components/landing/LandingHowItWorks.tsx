import Image from 'next/image'
import { LIFESTYLE } from '@/data/media'

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
      className="relative overflow-hidden bg-[#F4F8FD] py-12 md:py-14"
      data-testid="how-it-works"
    >
      <div className="beam-container relative">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1D5CE5]">
          How it works
        </p>
        <h2 className="mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-[#071330] md:text-[30px]">
          From to-do to done.
        </h2>
        <div
          className="mt-6 grid items-stretch gap-0 overflow-hidden rounded-[12px] border border-[#D7E0EC] bg-white shadow-sm md:grid-cols-3"
          data-testid="how-it-works-steps"
        >
          {STEPS.map((step, i) => (
            <article
              key={step.n}
              className={`flex h-full min-h-0 flex-col ${
                i < STEPS.length - 1 ? 'border-b border-[#D7E0EC] md:border-b-0 md:border-r' : ''
              }`}
            >
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#EEF4FF]">
                <Image
                  src={step.src}
                  alt={step.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF4FF] text-[12px] font-bold text-[#1D5CE5]">
                  {step.n}
                </span>
                <h3 className="mt-2.5 text-[15px] font-semibold text-[#071330]">{step.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-[#475569]">{step.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
