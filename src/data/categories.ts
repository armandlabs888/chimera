import type { Category, CategoryId } from '../types'

const unsplash = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

export const CATEGORIES: Category[] = [
  {
    id: 'moving',
    label: 'Moving & lifting',
    shortLabel: 'Moving',
    description: 'Furniture, boxes, loading, unloading',
    image: unsplash('photo-1600518464441-9154a4dea21b'),
    tintBg: '#DBEAFE',
    typicalRange: '$45–$120',
    arrival: 'Often same day',
    tintFg: '#1D4ED8',
    templates: [
      {
        title: 'Help move a couch upstairs',
        details:
          'Need two strong people to carry a sectional from a U-Haul into a second-floor walk-up. Stairs only, no elevator. Should take about 45 minutes.',
        budgetHint: 85,
      },
      {
        title: 'Load boxes into a truck',
        details:
          'About 20 medium boxes stacked in the living room. Need help loading into a pickup parked out front this afternoon.',
        budgetHint: 45,
      },
    ],
  },
  {
    id: 'cleaning',
    label: 'Home cleaning',
    shortLabel: 'Cleaning',
    description: 'Deep cleans, turnover resets, kitchen & bath',
    image: unsplash('photo-1581578731548-c64695cc6952'),
    tintBg: '#E0F2FE',
    typicalRange: '$60–$140',
    arrival: 'Same day or next',
    tintFg: '#0369A1',
    templates: [
      {
        title: 'Post-brunch kitchen reset',
        details:
          'Kitchen and dining area after a small brunch. Dishes, counters, floors. Supplies are here — just need an extra pair of hands for ~90 minutes.',
        budgetHint: 65,
      },
      {
        title: 'Move-out tidy before keys',
        details:
          'Studio apartment needs a solid clean before walkthrough tomorrow. Bathrooms, kitchen, floors, wipe surfaces. I have cleaning supplies.',
        budgetHint: 110,
      },
    ],
  },
  {
    id: 'handyman',
    label: 'Handyman & assembly',
    shortLabel: 'Handyman',
    description: 'Assembly, mounting, small fixes — non-licensed',
    image: unsplash('photo-1504148455328-c376907d081c'),
    tintBg: '#FFEDD5',
    typicalRange: '$45–$110',
    arrival: 'Often same day',
    tintFg: '#C2410C',
    templates: [
      {
        title: 'Mount a TV on drywall',
        details:
          '55" TV and fixed mount already purchased. Stud finder available. Prefer someone who has done this before. Living room, second floor.',
        budgetHint: 70,
      },
      {
        title: 'Assemble IKEA bookshelf',
        details:
          'KALLAX 4x4 unit still in the box. Tools on site. Looking for someone methodical — about 90 minutes of assembly.',
        budgetHint: 50,
      },
    ],
  },
  {
    id: 'petcare',
    label: 'Pet care',
    shortLabel: 'Pets',
    description: 'Walks, sitting, drop-ins',
    image: unsplash('photo-1548199973-03cce0bbc87b'),
    tintBg: '#FFE4E6',
    typicalRange: '$25–$65',
    arrival: 'Walks within hours',
    tintFg: '#BE123C',
    templates: [
      {
        title: 'Afternoon dog walk (friendly lab)',
        details:
          'Need someone to walk our 3-year-old lab for 30–40 minutes. Friendly with people and dogs. Leash and bags ready by the door.',
        budgetHint: 30,
      },
      {
        title: 'Cat drop-in while at a wedding',
        details:
          'Two chill indoor cats. Need a 20-minute drop-in this evening: fresh water, food, litter scoop, quick play.',
        budgetHint: 35,
      },
    ],
  },
  {
    id: 'tutoring',
    label: 'Tutoring & tech help',
    shortLabel: 'Tutoring',
    description: 'Homework help, language practice, Wi-Fi/laptop setup',
    image: unsplash('photo-1503676260728-1c00da094a0b'),
    tintBg: '#D1FAE5',
    typicalRange: '$35–$85',
    arrival: 'Tonight or this week',
    tintFg: '#047857',
    templates: [
      {
        title: 'Algebra II homework help tonight',
        details:
          'High school junior stuck on quadratic equations and word problems. Prefer someone patient who can explain step-by-step. About 1 hour.',
        budgetHint: 45,
      },
      {
        title: 'Spanish conversation practice',
        details:
          'Looking for a conversational Spanish partner for 60 minutes — intermediate level. Coffee shop near me or outdoors.',
        budgetHint: 40,
      },
    ],
  },
  {
    id: 'events',
    label: 'Events & photo',
    shortLabel: 'Events',
    description: 'Setup help, candid photos, teardown',
    image: unsplash('photo-1511795409834-ef04bbd61622'),
    tintBg: '#CCFBF1',
    typicalRange: '$50–$150',
    arrival: 'Book ahead',
    tintFg: '#0F766E',
    templates: [
      {
        title: 'Candid photos at backyard birthday',
        details:
          'Small backyard birthday, ~20 people. Need someone with a good phone or camera for 90 minutes of candid shots. Golden hour start.',
        budgetHint: 90,
      },
      {
        title: 'Help set up a patio dinner',
        details:
          'Need an extra person to hang string lights, set tables, and stage flowers before guests arrive. 2 hours, starting mid-afternoon.',
        budgetHint: 65,
      },
    ],
  },
]

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
}

export const WHEN_OPTIONS = [
  { id: 'asap' as const, label: 'ASAP', detail: 'Within the next few hours' },
  { id: 'today' as const, label: 'Today', detail: 'Sometime today' },
  { id: 'tomorrow' as const, label: 'Tomorrow', detail: 'Anytime tomorrow' },
  { id: 'this-week' as const, label: 'This week', detail: 'Flexible this week' },
]

export function whenLabel(id: (typeof WHEN_OPTIONS)[number]['id']): string {
  return WHEN_OPTIONS.find((w) => w.id === id)?.label ?? id
}
