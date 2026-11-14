#!/usr/bin/env node
import assert from 'node:assert/strict'
import { resolveAreaCentroid } from '../src/lib/areaCentroids.ts'

assert.deepEqual(
  resolveAreaCentroid({ locationLabel: 'Cambrian, San Jose, CA', lat: null, lng: null }),
  { lat: 37.2552, lng: -121.9284 },
)
assert.deepEqual(resolveAreaCentroid({ locationLabel: 'cambrian, san jose, ca' }), {
  lat: 37.2552,
  lng: -121.9284,
})
assert.deepEqual(resolveAreaCentroid({ locationLabel: 'Willow Glen, San Jose, CA' }), {
  lat: 37.3035,
  lng: -121.8975,
})
assert.deepEqual(resolveAreaCentroid({ locationLabel: 'Campbell, CA' }), {
  lat: 37.2872,
  lng: -121.95,
})
assert.deepEqual(resolveAreaCentroid({ locationLabel: 'San Jose, California' }), {
  lat: 37.3382,
  lng: -121.8863,
})
assert.deepEqual(resolveAreaCentroid({ locationLabel: 'Downtown San Jose, San Jose, CA' }), {
  lat: 37.3352,
  lng: -121.8901,
})
assert.deepEqual(resolveAreaCentroid({ locationLabel: 'North San Jose, San Jose, CA' }), {
  lat: 37.3897,
  lng: -121.928,
})
assert.deepEqual(resolveAreaCentroid({ neighborhood: 'east-austin' }), {
  lat: 30.2672,
  lng: -97.7205,
})
assert.deepEqual(resolveAreaCentroid({ locationLabel: 'East Austin, TX' }), {
  lat: 30.2672,
  lng: -97.7205,
})
assert.deepEqual(
  resolveAreaCentroid({ lat: 1, lng: 2, locationLabel: 'Cambrian, San Jose, CA' }),
  { lat: 1, lng: 2 },
)
assert.equal(resolveAreaCentroid({ locationLabel: 'Unknown Suburb, Nowhere' }), null)
assert.equal(resolveAreaCentroid({ lat: null, lng: null }), null)
console.log('area-centroids-unit PASS')
