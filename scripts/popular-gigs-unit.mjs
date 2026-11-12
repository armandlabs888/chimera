#!/usr/bin/env node
/**
 * Unit checks for popular gigs ranking / formatting.
 * Run: npx tsx scripts/popular-gigs-unit.mjs
 */
import assert from 'node:assert/strict'
import {
  selectPopularGigs,
  formatGigBudget,
  shortCityLabel,
  POPULAR_GIGS_LIMIT,
  gigNeighborhood,
} from '../src/lib/popularGigs.ts'

assert.equal(formatGigBudget({ budget: 75, budgetType: 'fixed' }), '$75')
assert.equal(formatGigBudget({ budget: 35, budgetType: 'hourly' }), '$35/hr')
assert.equal(formatGigBudget({ budget: 0, budgetType: 'open' }), 'Open')
assert.equal(shortCityLabel('San Jose, CA', 'San Jose'), 'San Jose')
assert.equal(shortCityLabel('', ''), 'Nearby')

const origin = { lat: 30.2672, lng: -97.7431 }
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
    locationLabel: 'East Austin, TX',
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
    locationLabel: 'Zilker, Austin',
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
    locationLabel: 'Willow Glen, San Jose',
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
    locationLabel: 'East Austin, TX',
    lat: near.lat,
    lng: near.lng,
    publicOfferCount: 20,
  },
]

const rows = selectPopularGigs({
  requests,
  offers: [],
  origin,
  radiusMiles: 25,
  limit: 10,
})
assert.equal(rows.length, 2, 'far + closed excluded')
assert.equal(rows[0].request.id, 'a', 'higher engagement ranks first')
assert.equal(rows[0].asap, true)
assert.equal(rows[0].budgetLabel, '$60')
assert.equal(gigNeighborhood(requests[0]), 'East Austin')
assert.ok(rows.every((r) => r.request.status === 'open'))

const sparse = selectPopularGigs({
  requests: requests.filter((r) => r.id === 'b'),
  offers: [],
  origin,
})
assert.equal(sparse.length, 1, 'sparse: show the one real job')

const empty = selectPopularGigs({ requests: [], offers: [], origin })
assert.equal(empty.length, 0, 'empty: no padding')

const many = Array.from({ length: 15 }, (_, i) => ({
  ...requests[0],
  id: `n${i}`,
  publicOfferCount: 15 - i,
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}))
const capped = selectPopularGigs({ requests: many, offers: [], origin })
assert.equal(capped.length, POPULAR_GIGS_LIMIT, 'cap at 10')

console.log('popular-gigs-unit passed')
