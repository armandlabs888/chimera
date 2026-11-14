#!/usr/bin/env node
import assert from 'node:assert/strict'

// Mirrors src/lib/location.ts formatJobAreaCaption / stripTrailingState
function stripTrailingState(label) {
  return label
    .trim()
    .replace(/,?\s*\b(ca|california|tx|texas)\b\.?\s*$/i, '')
    .replace(/,+\s*$/g, '')
    .trim()
}

function formatJobAreaCaption(entity) {
  const label = (entity.locationLabel ?? '').trim()
  if (label) {
    const stripped = stripTrailingState(label)
    return stripped || label
  }
  const neighborhoodName = (entity.neighborhood ?? '').trim()
  const city = (entity.city ?? '').trim()
  if (
    neighborhoodName &&
    city &&
    neighborhoodName.toLowerCase() !== city.toLowerCase()
  ) {
    return `${neighborhoodName}, ${city}`
  }
  if (neighborhoodName) return neighborhoodName
  if (city) return city
  return 'Nearby'
}

assert.equal(stripTrailingState('Cambrian, San Jose, CA'), 'Cambrian, San Jose')
assert.equal(stripTrailingState('Campbell, CA'), 'Campbell')
assert.equal(stripTrailingState('San Jose, California'), 'San Jose')
assert.equal(
  formatJobAreaCaption({ locationLabel: 'Cambrian, San Jose, CA' }),
  'Cambrian, San Jose',
)
assert.equal(formatJobAreaCaption({ locationLabel: 'Campbell, CA' }), 'Campbell')
assert.equal(
  formatJobAreaCaption({ neighborhood: 'Willow Glen', city: 'San Jose' }),
  'Willow Glen, San Jose',
)
assert.equal(formatJobAreaCaption({}), 'Nearby')
assert.doesNotMatch(
  formatJobAreaCaption({ locationLabel: 'Cambrian, San Jose, CA' }),
  /\byou\b/i,
)
console.log('job-area-caption-unit PASS')
