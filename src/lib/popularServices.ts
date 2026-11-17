import { LIFESTYLE } from '@/data/media'

/**
 * Popular services shown on the landing bento.
 * Keep labels in sentence case. Do not invent prices or helper counts.
 */
export const POPULAR_SERVICES = [
  {
    id: 'moving',
    label: 'Moving & Hauling',
    href: '/browse?category=moving',
    src: '/images/landing/avail-moving.jpg',
    alt: 'Neighbors carrying a sofa outdoors',
    testId: 'categories-tile-moving',
    description: 'Furniture, trucks, and heavy lifting with neighbors nearby.',
    layout: 'photo-large' as const,
  },
  {
    id: 'cleaning',
    label: 'House cleaning',
    href: '/browse?category=home',
    src: LIFESTYLE.cleaningCrew,
    alt: 'Cleaning crew with equipment in a living room',
    testId: 'categories-tile-cleaning',
    description: 'Kitchens, baths, and whole-home cleans on your schedule.',
    layout: 'photo' as const,
  },
  {
    id: 'auto',
    label: 'Auto detailing',
    href: '/browse?category=auto',
    src: '/images/landing/avail-auto-detailing.jpg',
    alt: 'Person washing a car with soap suds',
    testId: 'categories-tile-auto',
    description: 'Interior and exterior washes that look freshly detailed.',
    layout: 'photo' as const,
  },
  {
    id: 'pets',
    label: 'Pet care',
    href: '/browse?category=pets',
    src: '/images/landing/avail-pet-sitting.jpg',
    alt: 'Person walking dogs on a path',
    testId: 'categories-tile-pets',
    description: 'Walks, drop-ins, and everyday pet help nearby.',
    layout: 'photo' as const,
  },
  {
    id: 'junk',
    label: 'Yard & Junk Removal',
    href: '/browse?category=junk-removal',
    src: '/images/landing/avail-junk-garage.jpg',
    alt: 'Neighbors hauling junk from a garage into a pickup',
    testId: 'categories-tile-junk',
    description: 'Clear out garages, yards, and leftover clutter.',
    layout: 'light' as const,
  },
] as const

export type PopularService = (typeof POPULAR_SERVICES)[number]
