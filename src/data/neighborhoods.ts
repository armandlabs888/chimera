import type { Neighborhood, NeighborhoodId } from '../types'

export const NEIGHBORHOODS: Neighborhood[] = [
  { id: 'east-austin', name: 'East Austin', shortName: 'East Austin' },
  { id: 'hyde-park', name: 'Hyde Park', shortName: 'Hyde Park' },
  { id: 'mueller', name: 'Mueller', shortName: 'Mueller' },
  { id: 'zilker', name: 'Zilker', shortName: 'Zilker' },
  { id: 'south-congress', name: 'South Congress', shortName: 'SoCo' },
  { id: 'travis-heights', name: 'Travis Heights', shortName: 'Travis Hts' },
  { id: 'clarksville', name: 'Clarksville', shortName: 'Clarksville' },
  { id: 'the-domain', name: 'The Domain', shortName: 'Domain' },
]

/** Approximate driving distances in miles between Austin neighborhoods. */
const DISTANCE_MILES: Record<NeighborhoodId, Record<NeighborhoodId, number>> = {
  'east-austin': {
    'east-austin': 0,
    'hyde-park': 2.8,
    mueller: 2.1,
    zilker: 3.4,
    'south-congress': 3.0,
    'travis-heights': 2.6,
    clarksville: 3.8,
    'the-domain': 8.2,
  },
  'hyde-park': {
    'east-austin': 2.8,
    'hyde-park': 0,
    mueller: 1.6,
    zilker: 4.1,
    'south-congress': 4.5,
    'travis-heights': 4.2,
    clarksville: 2.4,
    'the-domain': 6.4,
  },
  mueller: {
    'east-austin': 2.1,
    'hyde-park': 1.6,
    mueller: 0,
    zilker: 5.0,
    'south-congress': 5.2,
    'travis-heights': 4.8,
    clarksville: 3.6,
    'the-domain': 5.8,
  },
  zilker: {
    'east-austin': 3.4,
    'hyde-park': 4.1,
    mueller: 5.0,
    zilker: 0,
    'south-congress': 1.4,
    'travis-heights': 1.8,
    clarksville: 2.2,
    'the-domain': 9.5,
  },
  'south-congress': {
    'east-austin': 3.0,
    'hyde-park': 4.5,
    mueller: 5.2,
    zilker: 1.4,
    'south-congress': 0,
    'travis-heights': 0.9,
    clarksville: 3.1,
    'the-domain': 10.1,
  },
  'travis-heights': {
    'east-austin': 2.6,
    'hyde-park': 4.2,
    mueller: 4.8,
    zilker: 1.8,
    'south-congress': 0.9,
    'travis-heights': 0,
    clarksville: 3.4,
    'the-domain': 9.8,
  },
  clarksville: {
    'east-austin': 3.8,
    'hyde-park': 2.4,
    mueller: 3.6,
    zilker: 2.2,
    'south-congress': 3.1,
    'travis-heights': 3.4,
    clarksville: 0,
    'the-domain': 7.6,
  },
  'the-domain': {
    'east-austin': 8.2,
    'hyde-park': 6.4,
    mueller: 5.8,
    zilker: 9.5,
    'south-congress': 10.1,
    'travis-heights': 9.8,
    clarksville: 7.6,
    'the-domain': 0,
  },
}

export function getNeighborhood(id: NeighborhoodId): Neighborhood {
  return NEIGHBORHOODS.find((n) => n.id === id) ?? NEIGHBORHOODS[0]
}

export function distanceMiles(a: NeighborhoodId, b: NeighborhoodId): number {
  return DISTANCE_MILES[a][b]
}

export function formatDistance(miles: number): string {
  if (miles < 0.2) return 'Same neighborhood'
  if (miles < 1) return `${miles.toFixed(1)} mi`
  return `${miles.toFixed(1)} mi`
}
