#!/usr/bin/env node
/**
 * Unit checks for the full profile availability line copy:
 * "Available now · Works 8:00 AM to 5:00 PM PST"
 * (no en/em dashes; timezone abbreviation included).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Load TS via experimental strip-types by dynamic import of the source file.
const {
  getWorkingHoursStatus,
  formatTimeZoneAbbreviation,
  hasWorkingHours,
} = await import(join(root, 'src/lib/workingHours.ts'))

const available = getWorkingHoursStatus(
  {
    workStart: '08:00',
    workEnd: '17:00',
    timezone: 'America/Los_Angeles',
    stateCode: 'CA',
  },
  new Date('2026-01-15T18:00:00Z'), // 10:00 AM PST
)
assert.ok(available)
assert.equal(available.status, 'available')
assert.equal(available.statusWord, 'Available now')
assert.equal(available.hoursLabel, 'Works 8:00 AM to 5:00 PM PST')
assert.equal(available.label, 'Available')
assert.doesNotMatch(available.hoursLabel, /[—–]/)
assert.doesNotMatch(available.statusWord, /[—–]/)

const unavailable = getWorkingHoursStatus(
  {
    workStart: '08:00',
    workEnd: '17:00',
    timezone: 'America/Los_Angeles',
    stateCode: 'CA',
  },
  new Date('2026-01-16T02:00:00Z'), // 6:00 PM PST
)
assert.ok(unavailable)
assert.equal(unavailable.status, 'unavailable')
assert.equal(unavailable.statusWord, 'Unavailable now')
assert.equal(unavailable.hoursLabel, 'Works 8:00 AM to 5:00 PM PST')

assert.equal(
  formatTimeZoneAbbreviation('America/Los_Angeles', new Date('2026-01-15T18:00:00Z')),
  'PST',
)
assert.equal(
  formatTimeZoneAbbreviation('America/Los_Angeles', new Date('2026-07-15T18:00:00Z')),
  'PDT',
)

assert.equal(hasWorkingHours({ workStart: null, workEnd: null }), false)
assert.equal(getWorkingHoursStatus({ workStart: null, workEnd: null, timezone: 'UTC' }), null)

// Component + header wiring: full line under meta, not beside the name.
const statusSrc = readFileSync(join(root, 'src/components/HelperAvailabilityStatus.tsx'), 'utf8')
assert.match(statusSrc, /variant === 'line'/)
assert.match(statusSrc, /statusWord/)
assert.match(statusSrc, /hoursLabel/)
assert.match(statusSrc, /Clock/)
assert.doesNotMatch(statusSrc, /showDetail/)

const headerSrc = readFileSync(join(root, 'src/components/profile/ProfileHeader.tsx'), 'utf8')
assert.match(headerSrc, /variant="line"/)
assert.match(headerSrc, /profile-header-availability/)
// Availability must not sit inside the name flex row.
const nameBlock = headerSrc.slice(
  headerSrc.indexOf('font-display text-[32px]'),
  headerSrc.indexOf('profile-header-availability') + 80,
)
assert.doesNotMatch(
  nameBlock.slice(0, nameBlock.indexOf('</h1>')),
  /HelperAvailabilityStatus/,
)
assert.match(headerSrc, /metaRow \? 'mt-1\.5'/)

console.log('helper-availability-line-unit: OK')
