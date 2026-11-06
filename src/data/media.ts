/** Verified daylight photography — Unsplash + local public assets.
 *  All remote URLs return HTTP 200 at w≥1200 (naturalWidth ≥ 800).
 *  Hero fan: smiling human portraits only (object-cover object-top).
 *  Lifestyle: real photography — no cartoons, masks/goggles, drills, or alphabet blocks.
 */

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

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
    src: u('photo-1580489944761-15a19d654956', 1200),
  },
  {
    name: 'Devon',
    specialty: 'Moving',
    rotate: -4,
    src: u('photo-1507003211169-0a1dd7228f2d', 1200),
  },
  {
    name: 'Mateo',
    specialty: 'Assembly',
    rotate: 0,
    src: u('photo-1539571696357-5a69c17a67c6', 1200),
    hero: true,
  },
  {
    name: 'Chloe',
    specialty: 'Pet Care',
    rotate: 4,
    src: u('photo-1548142813-c348350df52b', 1200),
  },
  {
    name: 'Liam',
    specialty: 'Events',
    rotate: 8,
    src: u('photo-1492562080023-ab3db95bfbce', 1200),
  },
]

/** Category / lifestyle photography. */
export const LIFESTYLE = {
  /** Smiling helpers loading cardboard boxes at an apartment */
  moving: '/images/beam-lifestyle-moving.jpg',
  /** Friendly person in a tidy sunlit kitchen (no mask/goggles) */
  cleaning: u('photo-1556911220-e15b29be8c8f'),
  /** Neighbors assembling / placing a bookshelf in a bright modern room */
  handyman: '/images/beam-lifestyle-handyman.jpg',
  /** Adult/college peers with laptops & notebooks */
  tutoring: u('photo-1522202176988-66273c2fd55f'),
  /** Pet care lifestyle */
  petcare: u('photo-1548199973-03cce0bbc87b'),
  /** Events & photo lifestyle */
  events: u('photo-1511795409834-ef04bbd61622'),
  /** Auth left showcase — welcoming helper in bright kitchen */
  authShowcase: u('photo-1556911220-e15b29be8c8f', 900),
  /** Auth mobile strip portrait */
  authMobile: u('photo-1580489944761-15a19d654956', 900),
  /** Book-in-3-steps step 1 — neighbors helping with a move/assembly */
  stepPost: '/images/beam-lifestyle-moving.jpg',
  /** Book-in-3-steps step 2 */
  stepOffers: u('photo-1516321318423-f06f85e504b3', 900),
  /** Book-in-3-steps step 3 */
  stepDone: u('photo-1556911220-bff31c812dba', 900),
} as const
