/** Daylight photography — unique local public assets for the Beam landing page.
 *  Hero fan: smiling human portraits (object-cover object-top).
 *  Lifestyle: real photography — no cartoons, masks/goggles, drills, or alphabet blocks.
 *  Specialty labels must match the photo subject (or be omitted), never invent a service.
 */

export type HeroHelper = {
  name: string
  specialty: string
  rotate: number
  src: string
  hero?: boolean
}

/**
 * Hero fan — only slots whose photo subject fits casual-launch services.
 * Omitted: assembly portrait (no matching launch service / no detailing photo).
 */
export const HERO_HELPERS: HeroHelper[] = [
  {
    name: 'Maya',
    specialty: 'House Cleaning',
    rotate: -8,
    src: '/images/landing/hero-maya-cleaning.jpg',
  },
  {
    name: 'Devon',
    specialty: 'Junk Removal',
    rotate: -4,
    src: '/images/landing/hero-devon-moving.jpg',
  },
  {
    name: 'Chloe',
    specialty: 'Pet Sitting',
    rotate: 0,
    src: '/images/landing/hero-chloe-petcare.jpg',
    hero: true,
  },
  {
    name: 'Liam',
    specialty: 'Other',
    rotate: 6,
    src: '/images/landing/hero-liam-events.jpg',
  },
]

/** Category / lifestyle photography — every path is unique. */
export const LIFESTYLE = {
  /** Neighbor wiping a sunlit kitchen counter */
  cleaning: '/images/landing/service-cleaning.jpg',
  /** Neighbors carrying a sofa on a sunny driveway — used for junk haul-away */
  moving: '/images/landing/service-moving.jpg',
  /** Furniture/shelf assembly — kept as asset; not used for active Auto marketing */
  handyman: '/images/landing/service-handyman.jpg',
  /** Neighbor walking dogs on a tree-lined sidewalk */
  petcare: '/images/landing/service-petcare.jpg',
  /** Tutor and student with laptop and notebook — not used for active launch marketing */
  tutoring: '/images/landing/service-tutoring.jpg',
  /** Outdoor event / setup — used for Other custom everyday help */
  events: '/images/landing/service-events.jpg',
  /** Auth left showcase — welcoming helper ready to help */
  authShowcase: '/images/landing/auth-showcase.jpg',
  /** Legacy step photos (superseded by UI-preview how-it-works; kept for assets) */
  stepPost: '/images/landing/step-01-post.jpg',
  stepOffers: '/images/landing/step-02-offers.jpg',
  stepDone: '/images/landing/step-03-finish.jpg',
} as const
