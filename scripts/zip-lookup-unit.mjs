#!/usr/bin/env node
/**
 * Unit tests for ZIP validation/lookup and urgent ZIP matching rules.
 * Mirrors src/lib/zip/* without the Next @/ path alias.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rows = JSON.parse(readFileSync(join(root, 'src/data/us-zips.v1.json'), 'utf8'))

function haversineMiles(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(a)))
}

const byZip = new Map()
for (const row of rows) {
  const zip = String(row[0]).padStart(5, '0')
  byZip.set(zip, {
    zip,
    lat: Number(row[1]),
    lng: Number(row[2]),
    city: String(row[3] ?? ''),
    stateCode: String(row[4] ?? '').toUpperCase(),
  })
}

function normalizeZipInput(raw) {
  const digits = String(raw ?? '')
    .trim()
    .replace(/\s+/g, '')
  const m = digits.match(/^(\d{5})(?:-\d{4})?$/)
  return m ? m[1] : null
}

function lookupZip(raw) {
  const zip = normalizeZipInput(raw)
  if (!zip) return null
  return byZip.get(zip) ?? null
}

function formatZipPlaceLabel(place) {
  const cityState = [place.city, place.stateCode].filter(Boolean).join(', ')
  return cityState ? `${cityState} ${place.zip}` : place.zip
}

function nearestZip(lat, lng) {
  let best = null
  let bestMiles = Number.POSITIVE_INFINITY
  for (const place of byZip.values()) {
    const miles = haversineMiles(lat, lng, place.lat, place.lng)
    if (miles < bestMiles) {
      bestMiles = miles
      best = place
    }
  }
  return best
}

function deriveZipForNewVerification(input) {
  const fromZip = lookupZip(String(input.zip ?? ''))
  if (fromZip) return fromZip
  if (Number.isFinite(input.lat) && Number.isFinite(input.lng)) {
    return nearestZip(input.lat, input.lng)
  }
  return null
}

function zip5(raw) {
  const m = String(raw ?? '')
    .trim()
    .match(/^(\d{5})/)
  return m ? m[1] : null
}

function helperMatchesUrgentJob(job, helper, radiusMiles) {
  if (!(radiusMiles > 0)) return { matches: false, distanceMiles: null }
  const jobZip = zip5(job.zip)
  const helperZip = zip5(helper.zip)
  const sameZip = Boolean(jobZip && helperZip && jobZip === helperZip)
  const hasJobPoint = Number.isFinite(job.lat) && Number.isFinite(job.lng)
  const hasHelperPoint =
    Number.isFinite(helper.addressLat) && Number.isFinite(helper.addressLng)

  let distanceMiles = null
  if (hasJobPoint && hasHelperPoint) {
    distanceMiles = haversineMiles(job.lat, job.lng, helper.addressLat, helper.addressLng)
  } else if (sameZip) {
    distanceMiles = 0
  }

  const withinRadius =
    distanceMiles != null && hasHelperPoint && distanceMiles <= radiusMiles

  if (!sameZip && !withinRadius) return { matches: false, distanceMiles }
  if (!sameZip && !hasJobPoint) return { matches: false, distanceMiles }
  return { matches: true, distanceMiles }
}

// Contract: source modules export the expected symbols / radii.
const lookupSrc = readFileSync(join(root, 'src/lib/zip/lookup.ts'), 'utf8')
const matchSrc = readFileSync(join(root, 'src/lib/zip/match.ts'), 'utf8')
const constantsSrc = readFileSync(join(root, 'src/lib/urgent/constants.ts'), 'utf8')
assert.match(lookupSrc, /export function lookupZip/)
assert.match(lookupSrc, /export function normalizeZipInput/)
assert.match(lookupSrc, /export function nearestZip/)
assert.match(lookupSrc, /export function deriveZipForNewVerification/)
assert.match(matchSrc, /export function helperMatchesUrgentJob/)
assert.match(constantsSrc, /URGENT_MATCH_RADIUS_MILES = 5/)
assert.match(constantsSrc, /URGENT_ESCALATION_RADIUS_MILES = 8/)

const URGENT_ZIP_MATCH_RADIUS_MILES = 5
const URGENT_ZIP_ESCALATION_RADIUS_MILES = 8

assert.equal(normalizeZipInput('95124'), '95124')
assert.equal(normalizeZipInput('95124-1234'), '95124')
assert.equal(normalizeZipInput('9512'), null)
assert.equal(normalizeZipInput('abcde'), null)
assert.equal(normalizeZipInput(''), null)

const sj = lookupZip('95124')
assert.ok(sj)
assert.equal(sj.zip, '95124')
assert.equal(sj.city, 'San Jose')
assert.equal(sj.stateCode, 'CA')
assert.ok(Number.isFinite(sj.lat) && Number.isFinite(sj.lng))
assert.equal(formatZipPlaceLabel(sj), 'San Jose, CA 95124')
assert.equal(lookupZip('00000'), null)

const near = nearestZip(37.256831, -121.922815)
assert.ok(near)
assert.equal(near.zip, '95124')

assert.equal(
  deriveZipForNewVerification({ zip: '', lat: 37.256831, lng: -121.922815 }).zip,
  '95124',
)
assert.equal(deriveZipForNewVerification({ zip: '95125', lat: 0, lng: 0 }).zip, '95125')

const job = { zip: '95124', lat: sj.lat, lng: sj.lng }

const sameZipFar = helperMatchesUrgentJob(
  job,
  { id: 'h1', zip: '95124', addressLat: sj.lat + 0.5, addressLng: sj.lng },
  URGENT_ZIP_MATCH_RADIUS_MILES,
)
assert.equal(sameZipFar.matches, true)
assert.ok(sameZipFar.distanceMiles > URGENT_ZIP_MATCH_RADIUS_MILES)

const nearbyOtherZip = helperMatchesUrgentJob(
  job,
  { id: 'h2', zip: '95125', addressLat: sj.lat + 0.01, addressLng: sj.lng + 0.01 },
  URGENT_ZIP_MATCH_RADIUS_MILES,
)
assert.equal(nearbyOtherZip.matches, true)
assert.ok(nearbyOtherZip.distanceMiles <= URGENT_ZIP_MATCH_RADIUS_MILES)

const farOtherZip = helperMatchesUrgentJob(
  job,
  { id: 'h3', zip: '94107', addressLat: sj.lat + 0.5, addressLng: sj.lng + 0.5 },
  URGENT_ZIP_MATCH_RADIUS_MILES,
)
assert.equal(farOtherZip.matches, false)
assert.ok(farOtherZip.distanceMiles > URGENT_ZIP_MATCH_RADIUS_MILES)

const midHelper = {
  id: 'h4',
  zip: '95008',
  addressLat: sj.lat + 0.094,
  addressLng: sj.lng,
}
assert.equal(
  helperMatchesUrgentJob(job, midHelper, URGENT_ZIP_MATCH_RADIUS_MILES).matches,
  false,
)
assert.equal(
  helperMatchesUrgentJob(job, midHelper, URGENT_ZIP_ESCALATION_RADIUS_MILES).matches,
  true,
)

console.log('zip-lookup-unit PASS')
