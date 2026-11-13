#!/usr/bin/env node
/**
 * Unit checks for popular gigs ranking / formatting / city filter.
 * Run: npx tsx scripts/popular-gigs-unit.mjs
 */
import assert from 'node:assert/strict'
import {
  selectPopularGigs,
  formatGigBudget,
  shortCityLabel,
  popularGigsCopy,
  hasBrowseCity,
  gigNeighborhood,
  requestMatchesCityState,
  resolveRequestCityState,
} from '../src/lib/popularGigs.ts'

assert.equal(formatGigBudget({ budget: 75, budgetType: 'fixed' }), '$75')
assert.equal(formatGigBudget({ budget: 35, budgetType: 'hourly' }), '$35/hr')
assert.equal(formatGigBudget({ budget: 0, budgetType: 'open' }), 'Open')
assert.equal(shortCityLabel('San Jose, CA', 'San Jose'), 'San Jose')
assert.equal(shortCityLabel('', ''), 'Nearby')

const unsetCopy = popularGigsCopy({ source: 'none', city: '', stateCode: '', locationLabel: 'Nearby' })
assert.equal(unsetCopy.hasCity, false)
assert.equal(unsetCopy.heading, 'Popular gigs near you')
assert.equal(unsetCopy.mobileSeeAll, 'See all jobs near you')
assert.equal(unsetCopy.subtext, 'Open jobs will show up here once your city is set.')
assert.doesNotMatch(unsetCopy.heading, /near Nearby/i)
assert.doesNotMatch(unsetCopy.mobileSeeAll, /near Nearby/i)
assert.doesNotMatch(unsetCopy.emptyBody, /wider area/i)

const cityCopy = popularGigsCopy({
  source: 'preference',
  city: 'San Jose',
  stateCode: 'CA',
  locationLabel: 'San Jose, CA',
})
assert.equal(cityCopy.hasCity, true)
assert.equal(cityCopy.heading, 'Popular gigs in San Jose, CA')
assert.equal(cityCopy.mobileSeeAll, 'See all jobs in San Jose')
assert.equal(cityCopy.subtext, 'All open jobs neighbors have posted in San Jose, California.')
assert.equal(cityCopy.emptyTitle, 'No open gigs in San Jose yet')
assert.equal(cityCopy.emptyBody, 'Be the first to post a task.')
assert.equal(hasBrowseCity({ source: 'none', city: '', stateCode: '', locationLabel: '' }), false)
assert.equal(
  hasBrowseCity({ source: 'profile', city: 'Austin', stateCode: 'TX', locationLabel: 'Austin, TX' }),
  true,
)
assert.equal(
  hasBrowseCity({ source: 'profile', city: 'Austin', stateCode: '', locationLabel: 'Austin, TX' }),
  false,
  'city without state is not a scoped city',
)

assert.deepEqual(resolveRequestCityState({ locationLabel: 'San Jose, CA' }), {
  city: 'San Jose',
  stateCode: 'CA',
})
assert.deepEqual(resolveRequestCityState({ locationLabel: 'Alum Rock, San Jose, CA' }), {
  city: 'San Jose',
  stateCode: 'CA',
})
assert.deepEqual(
  resolveRequestCityState({ city: 'Milpitas', stateCode: 'CA', locationLabel: 'Milpitas, CA' }),
  { city: 'Milpitas', stateCode: 'CA' },
)
assert.equal(resolveRequestCityState({ locationLabel: 'Somewhere nearby' }), null)

assert.equal(
  requestMatchesCityState({ locationLabel: 'Willow Glen, San Jose, CA' }, 'San Jose', 'CA'),
  true,
)
assert.equal(
  requestMatchesCityState({ city: 'Milpitas', stateCode: 'CA', locationLabel: 'Milpitas, CA' }, 'San Jose', 'CA'),
  false,
  'neighboring city must not match',
)
assert.equal(
  requestMatchesCityState({ locationLabel: 'Cupertino, CA' }, 'San Jose', 'CA'),
  false,
)
assert.equal(
  requestMatchesCityState({ locationLabel: 'No state here' }, 'San Jose', 'CA'),
  false,
  'jobs without usable city/state must not sneak in',
)

const origin = { city: 'Austin', stateCode: 'TX', lat: 30.2672, lng: -97.7431 }
const near = { lat: 30.27, lng: -97.74 }
const far = { lat: 37.3382, lng: -121.8863 }

const requests = [
  {
    id: 'a',
    title: 'Near popular',
    details: '',
    category: 'house-cleaning',
    neighborhood: 'east-austin',
    when: 'asap',
    whenLabel: 'ASAP',
    budget: 60,
    budgetType: 'fixed',
    status: 'open',
    requesterId: 'u1',
    image: '',
    createdAt: new Date().toISOString(),
    locationLabel: 'East Austin, Austin, TX',
    city: 'Austin',
    stateCode: 'TX',
    lat: near.lat,
    lng: near.lng,
    publicOfferCount: 4,
  },
  {
    id: 'b',
    title: 'Near quiet',
    details: '',
    category: 'pet-sitting',
    neighborhood: 'zilker',
    when: 'today',
    whenLabel: 'Today',
    budget: 40,
    budgetType: 'fixed',
    status: 'open',
    requesterId: 'u2',
    image: '',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    locationLabel: 'Zilker, Austin, TX',
    city: 'Austin',
    stateCode: 'TX',
    lat: near.lat + 0.01,
    lng: near.lng,
    publicOfferCount: 0,
  },
  {
    id: 'c',
    title: 'Far away',
    details: '',
    category: 'other',
    categoryCustom: 'Tutoring',
    neighborhood: '',
    when: 'this-week',
    whenLabel: 'This week',
    budget: 35,
    budgetType: 'hourly',
    status: 'open',
    requesterId: 'u3',
    image: '',
    createdAt: new Date().toISOString(),
    locationLabel: 'Willow Glen, San Jose, CA',
    city: 'San Jose',
    stateCode: 'CA',
    lat: far.lat,
    lng: far.lng,
    publicOfferCount: 9,
  },
  {
    id: 'd',
    title: 'Closed',
    details: '',
    category: 'house-cleaning',
    neighborhood: 'east-austin',
    when: 'asap',
    whenLabel: 'ASAP',
    budget: 50,
    budgetType: 'fixed',
    status: 'completed',
    requesterId: 'u4',
    image: '',
    createdAt: new Date().toISOString(),
    locationLabel: 'East Austin, Austin, TX',
    city: 'Austin',
    stateCode: 'TX',
    lat: near.lat,
    lng: near.lng,
    publicOfferCount: 20,
  },
  {
    id: 'e',
    title: 'Neighbor city inside old radius',
    details: '',
    category: 'junk-removal',
    neighborhood: '',
    when: 'asap',
    whenLabel: 'ASAP',
    budget: 80,
    budgetType: 'fixed',
    status: 'open',
    requesterId: 'u5',
    image: '',
    createdAt: new Date().toISOString(),
    locationLabel: 'Milpitas, CA',
    city: 'Milpitas',
    stateCode: 'CA',
    // Same lat/lng as Austin origin so a radius filter would have included it.
    lat: near.lat,
    lng: near.lng,
    publicOfferCount: 12,
  },
]

const rows = selectPopularGigs({
  requests,
  offers: [],
  origin,
})
assert.equal(rows.length, 2, 'only Austin TX open jobs')
assert.equal(rows[0].request.id, 'a', 'higher engagement ranks first')
assert.equal(rows[0].asap, true)
assert.equal(rows[0].budgetLabel, '$60')
assert.equal(gigNeighborhood(requests[0]), 'East Austin')
assert.ok(rows.every((r) => r.request.status === 'open'))
assert.ok(rows.every((r) => r.request.city === 'Austin' && r.request.stateCode === 'TX'))

const sj = selectPopularGigs({
  requests,
  offers: [],
  origin: { city: 'San Jose', stateCode: 'CA', lat: far.lat, lng: far.lng },
})
assert.equal(sj.length, 1)
assert.equal(sj[0].request.id, 'c')
assert.ok(!sj.some((r) => r.request.city === 'Milpitas'), 'Milpitas excluded for San Jose')

const sparse = selectPopularGigs({
  requests: requests.filter((r) => r.id === 'b'),
  offers: [],
  origin,
})
assert.equal(sparse.length, 1, 'sparse: show the one real job')

const empty = selectPopularGigs({ requests: [], offers: [], origin })
assert.equal(empty.length, 0, 'empty: no padding')

const noCity = selectPopularGigs({
  requests,
  offers: [],
  origin: { city: '', stateCode: '', lat: null, lng: null },
})
assert.equal(noCity.length, 0, 'no city: show nothing until city is set')

const many = Array.from({ length: 15 }, (_, i) => ({
  ...requests[0],
  id: `n${i}`,
  publicOfferCount: 15 - i,
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}))
const uncapped = selectPopularGigs({ requests: many, offers: [], origin })
assert.equal(uncapped.length, 15, 'no 10-item display cap')

console.log('popular-gigs-unit passed')
