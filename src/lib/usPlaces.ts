import { haversineMiles } from '@/lib/location'

/** One US Census place from `/data/us-cities.v1.json`. */
export type UsCity = {
  name: string
  stateCode: string
  lat: number
  lng: number
  population: number
  label: string
}

export const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  PR: 'Puerto Rico',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
}

const STATE_NAME_TO_CODE = Object.fromEntries(
  Object.entries(US_STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
) as Record<string, string>

type RawPlace = [string, string, number, number, number]

type IndexedCity = UsCity & {
  nameLower: string
  words: string[]
}

type PlacesIndex = {
  cities: IndexedCity[]
  topByPopulation: IndexedCity[]
}

let loadPromise: Promise<PlacesIndex> | null = null
let cachedIndex: PlacesIndex | null = null

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseCityStateQuery(q: string): { city: string; stateCode: string | null } | null {
  const comma = q.match(/^(.+?),\s*([a-z]{2})$/i)
  if (comma) return { city: comma[1].trim(), stateCode: comma[2].toUpperCase() }
  const spaced = q.match(/^(.+?)\s+([a-z]{2})$/i)
  if (spaced) {
    const maybeState = spaced[2].toUpperCase()
    if (US_STATE_NAMES[maybeState]) {
      return { city: spaced[1].trim(), stateCode: maybeState }
    }
  }
  return null
}

function toUsCity(raw: RawPlace): IndexedCity {
  const [name, stateCode, lat, lng, population] = raw
  const nameLower = name.toLowerCase()
  return {
    name,
    stateCode,
    lat,
    lng,
    population: population || 0,
    label: `${name}, ${stateCode}`,
    nameLower,
    words: nameLower.split(/[\s'-]+/).filter(Boolean),
  }
}

async function buildIndex(): Promise<PlacesIndex> {
  const res = await fetch('/data/us-cities.v1.json')
  if (!res.ok) throw new Error('Could not load US cities')
  const raw = (await res.json()) as RawPlace[]
  const cities = raw.map(toUsCity)
  const topByPopulation = [...cities]
    .sort((a, b) => b.population - a.population)
    .slice(0, 10)
  return { cities, topByPopulation }
}

export function loadUsPlacesIndex(): Promise<PlacesIndex> {
  if (cachedIndex) return Promise.resolve(cachedIndex)
  if (!loadPromise) {
    loadPromise = buildIndex()
      .then((idx) => {
        cachedIndex = idx
        return idx
      })
      .catch((err) => {
        loadPromise = null
        throw err
      })
  }
  return loadPromise
}

export function stateDisplayName(stateCode: string): string {
  return US_STATE_NAMES[stateCode] ?? stateCode
}

type Ranked = { city: IndexedCity; tier: number }

/**
 * Ranked US city search. Typical filter finishes well under 5ms for 32k places.
 * Tiers: exact name → name prefix → word prefix → "City ST" → state name/code.
 */
export function searchUsCities(query: string, limit = 10): UsCity[] {
  const index = cachedIndex
  if (!index) return []

  const q = normalizeQuery(query)
  if (!q) {
    return index.topByPopulation.slice(0, limit)
  }

  const cityState = parseCityStateQuery(q)
  const stateFromName = STATE_NAME_TO_CODE[q]
  const stateFromCode = q.length === 2 && US_STATE_NAMES[q.toUpperCase()] ? q.toUpperCase() : null
  const stateFilter = cityState?.stateCode ?? stateFromName ?? stateFromCode
  const cityQuery = cityState?.city ?? (stateFromName || stateFromCode ? '' : q)

  const ranked: Ranked[] = []

  for (const city of index.cities) {
    if (stateFilter && city.stateCode !== stateFilter) continue

    let tier = 99
    if (cityQuery) {
      if (city.nameLower === cityQuery) tier = 0
      else if (city.nameLower.startsWith(cityQuery)) tier = 1
      else if (city.words.some((w) => w.startsWith(cityQuery))) tier = 2
      else if (cityState && city.nameLower.startsWith(cityState.city.toLowerCase())) tier = 3
      else continue
    } else if (stateFilter) {
      // Pure state browse — keep population order via tier 4
      tier = 4
    } else {
      continue
    }

    ranked.push({ city, tier })
  }

  ranked.sort((a, b) => a.tier - b.tier || b.city.population - a.city.population)
  return ranked.slice(0, limit).map((r) => {
    const { nameLower: _n, words: _w, ...city } = r.city
    void _n
    void _w
    return city
  })
}

export function nearestUsCity(lat: number, lng: number): UsCity | null {
  const index = cachedIndex
  if (!index?.cities.length) return null

  let best: IndexedCity | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const city of index.cities) {
    const d = haversineMiles(lat, lng, city.lat, city.lng)
    if (d < bestDist) {
      bestDist = d
      best = city
    }
  }
  if (!best) return null
  const { nameLower: _n, words: _w, ...city } = best
  void _n
  void _w
  return city
}

export function citiesReady(): boolean {
  return Boolean(cachedIndex)
}
