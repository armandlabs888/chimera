/** Daylight photography — unique local public assets for the Beam landing page.
 *  Hero fan: smiling human portraits (object-cover object-top).
 *  Lifestyle: real photography — no cartoons, masks/goggles, drills, or alphabet blocks.
 */

export type HeroHelper = {
  name: string
  specialty: string
  rotate: number
  src: string
  hero?: boolean
}

/** Hero fan — smiling human portraits of friendly local helpers. */
export const HERO_HELPERS: HeroHelper[] = [
  {
    name: 'Maya',
    specialty: 'Cleaning',
    rotate: -8,
    src: '/images/landing/hero-maya-cleaning.jpg',
  },
  {
    name: 'Devon',
    specialty: 'Moving',
    rotate: -4,
    src: '/images/landing/hero-devon-moving.jpg',
  },
  {
    name: 'Mateo',
    specialty: 'Assembly',
    rotate: 0,
    src: '/images/landing/hero-mateo-assembly.jpg',
    hero: true,
  },
  {
    name: 'Chloe',
    specialty: 'Pet Care',
    rotate: 4,
    src: '/images/landing/hero-chloe-petcare.jpg',
  },
  {
    name: 'Liam',
    specialty: 'Events',
    rotate: 8,
    src: '/images/landing/hero-liam-events.jpg',
  },
]

/** Category / lifestyle photography — every path is unique. */
export const LIFESTYLE = {
  /** Helper wiping a sunlit kitchen counter */
  cleaning: '/images/landing/service-cleaning.jpg',
  /** Neighbors carrying boxes at an apartment entry */
  moving: '/images/landing/service-moving.jpg',
  /** Non-licensed furniture/shelf assembly in a bright living room */
  handyman: '/images/landing/service-handyman.jpg',
  /** Neighbor walking a dog on a tree-lined sidewalk */
  petcare: '/images/landing/service-petcare.jpg',
  /** Adult tutoring session with laptop and notebook */
  tutoring: '/images/landing/service-tutoring.jpg',
  /** Event setup / photo lifestyle outdoors */
  events: '/images/landing/service-events.jpg',
  /** Auth left showcase — welcoming helper ready to help */
  authShowcase: '/images/landing/auth-showcase.jpg',
  /** Book-in-3-steps step 1 — posting a move task on a phone */
  stepPost: '/images/landing/step-01-post.jpg',
  /** Book-in-3-steps step 2 — reviewing arrival-time offers */
  stepOffers: '/images/landing/step-02-offers.jpg',
  /** Book-in-3-steps step 3 — handshake after finishing the job */
  stepDone: '/images/landing/step-03-finish.jpg',
} as const
