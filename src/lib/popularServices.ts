import { LIFESTYLE } from '@/data/media'

/**
 * Popular services shown on the landing tiles and the site footer Services column.
 * Keep labels in sentence case and in sync across both surfaces.
 */
export const POPULAR_SERVICES = [
  {
    id: 'cleaning',
    label: 'House cleaning',
    href: '/browse?category=home',
    src: LIFESTYLE.cleaningCrew,
    alt: 'Cleaning crew with equipment in a living room',
    testId: 'categories-tile-cleaning',
  },
  {
    id: 'auto',
    label: 'Auto detailing',
    href: '/browse?category=auto',
    src: '/images/landing/avail-auto-detailing.jpg',
    alt: 'Person washing a car with soap suds',
    testId: 'categories-tile-auto',
  },
  {
    id: 'moving',
    label: 'Moving',
    href: '/browse?category=moving',
    src: '/images/landing/avail-moving.jpg',
    alt: 'Neighbors carrying a sofa outdoors',
    testId: 'categories-tile-moving',
  },
  {
    id: 'junk',
    label: 'Junk removal',
    href: '/browse?category=junk-removal',
    src: '/images/landing/avail-junk-garage.jpg',
    alt: 'Neighbors hauling junk from a garage into a pickup',
    testId: 'categories-tile-junk',
  },
  {
    id: 'pets',
    label: 'Pet care',
    href: '/browse?category=pets',
    src: '/images/landing/avail-pet-sitting.jpg',
    alt: 'Person walking dogs on a path',
    testId: 'categories-tile-pets',
  },
] as const

export type PopularService = (typeof POPULAR_SERVICES)[number]
