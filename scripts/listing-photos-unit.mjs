/**
 * Unit + constraint checks for listing photos / schedule / URL ownership.
 * No production rows. Labels DEMO vs DB-read-only.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function runTsx(source) {
  const out = execFileSync(
    'npx',
    ['--yes', 'tsx', '-e', source],
    { cwd: root, encoding: 'utf8' },
  )
  return JSON.parse(out.trim().split('\n').filter(Boolean).pop())
}

const photo = runTsx(`
import {
  LISTING_PHOTO_MAX,
  LISTING_PHOTO_MAX_BYTES,
  validateListingPhotoFile,
  assertOwnedListingPhotoUrls,
  isOwnedListingPhotoUrl,
  normalizeListingImages,
} from './src/lib/listingPhotos.ts'

function fakeFile(type, size) {
  return { type, size, name: 'x' }
}

const zero = validateListingPhotoFile(fakeFile('image/jpeg', 100), 0)
const atMax = validateListingPhotoFile(fakeFile('image/jpeg', 100), 5)
const sixth = validateListingPhotoFile(fakeFile('image/jpeg', 100), 5)
const badType = validateListingPhotoFile(fakeFile('application/pdf', 100), 0)
const tooBig = validateListingPhotoFile(fakeFile('image/jpeg', LISTING_PHOTO_MAX_BYTES + 1), 0)
const uid = '11111111-1111-1111-1111-111111111111'
const owned = \`https://example.supabase.co/storage/v1/object/public/beam-media/\${uid}/listings/a.jpg\`
const other = \`https://example.supabase.co/storage/v1/object/public/beam-media/22222222-2222-2222-2222-222222222222/listings/a.jpg\`
const third = 'https://evil.example/photo.jpg'
const assertOk = assertOwnedListingPhotoUrls([owned], uid)
const assertOther = assertOwnedListingPhotoUrls([other], uid)
const assertThird = assertOwnedListingPhotoUrls([third], uid)
const assertSix = assertOwnedListingPhotoUrls([owned,owned,owned,owned,owned,owned], uid)
const legacy = normalizeListingImages([], 'https://legacy.example/cover.jpg')

console.log(JSON.stringify({
  max: LISTING_PHOTO_MAX,
  zeroOk: zero.ok,
  atMaxOk: atMax.ok,
  sixthOk: sixth.ok,
  badTypeOk: badType.ok,
  tooBigOk: tooBig.ok,
  ownedOk: assertOk.ok && isOwnedListingPhotoUrl(owned, uid),
  otherRejected: !assertOther.ok,
  thirdRejected: !assertThird.ok,
  sixRejected: !assertSix.ok,
  legacyLen: legacy.length,
}))
`)

assert.equal(photo.max, 5)
assert.equal(photo.zeroOk, true)
assert.equal(photo.atMaxOk, false)
assert.equal(photo.sixthOk, false)
assert.equal(photo.badTypeOk, false)
assert.equal(photo.tooBigOk, false)
assert.equal(photo.ownedOk, true)
assert.equal(photo.otherRejected, true)
assert.equal(photo.thirdRejected, true)
assert.equal(photo.sixRejected, true)
assert.equal(photo.legacyLen, 1)
console.log('listing-photos-unit (client validators): OK', photo)

const schedule = runTsx(`
import {
  buildWhenLabel,
  combineLocalDateTime,
  localDateISO,
  parseTimeInput,
  validateTimeWindow,
  addLocalDays,
  formatShortDate,
} from './src/lib/listingSchedule.ts'

const today = '2026-11-08'
const tomorrow = addLocalDays(today, 1)
const start = parseTimeInput('14:00')
const end = parseTimeInput('16:00')
const endBefore = validateTimeWindow({
  when: 'today', dateISO: today, start, end: parseTimeInput('13:00'),
  now: combineLocalDateTime(today, { hours: 10, minutes: 0 }),
})
const past = validateTimeWindow({
  when: 'today', dateISO: today, start: parseTimeInput('09:00'), end: null,
  now: combineLocalDateTime(today, { hours: 12, minutes: 0 }),
})
const okTomorrow = validateTimeWindow({
  when: 'tomorrow', dateISO: tomorrow, start: parseTimeInput('09:00'), end: null,
  now: combineLocalDateTime(today, { hours: 23, minutes: 50 }),
})
// Midnight-local tomorrow: combining local date+time must not shift calendar day via UTC
const localTomorrowMorning = combineLocalDateTime(tomorrow, { hours: 0, minutes: 30 })
const stillTomorrowLocal = localDateISO(localTomorrowMorning) === tomorrow
const label = buildWhenLabel({ when: 'today', dateISO: today, start, end })
const hasDate = label.includes(formatShortDate(today))

console.log(JSON.stringify({
  endBeforeOk: !endBefore.ok,
  pastOk: !past.ok,
  tomorrowMorningOk: okTomorrow.ok,
  stillTomorrowLocal,
  label,
  hasDate,
  scheduledForIso: combineLocalDateTime(today, start).toISOString(),
  scheduledEndIso: combineLocalDateTime(today, end).toISOString(),
}))
`)

assert.equal(schedule.endBeforeOk, true)
assert.equal(schedule.pastOk, true)
assert.equal(schedule.tomorrowMorningOk, true)
assert.equal(schedule.stillTomorrowLocal, true)
assert.equal(schedule.hasDate, true)
assert.ok(schedule.scheduledForIso.endsWith('Z'))
console.log('listing-photos-unit (schedule): OK', schedule)

// Matching: helper travel distance must not be expanded by default request radius 5
const matching = runTsx(`
import { rankHelpersForRequest } from './src/lib/matching.ts'

const request = {
  id: 'r1', title: 't', details: 'd', category: 'house_cleaning', neighborhood: '',
  when: 'today', whenLabel: 'Today', budget: 40, budgetType: 'fixed', status: 'open',
  requesterId: 'req', image: '', createdAt: new Date().toISOString(),
  lat: 30.27, lng: -97.74, radiusMiles: 5,
}
const nearHelper = {
  id: 'h1', name: 'Near', avatar: '', neighborhood: '', bio: '',
  skills: ['house_cleaning'], availability: ['afternoons'], rating: 4.8, reviewCount: 3,
  jobsCompleted: 4, hourlyRate: 40, rateType: 'hourly', isHelper: true,
  serviceRadiusMiles: 3, lat: 30.30, lng: -97.74, // ~2.1 mi-ish
}
const farSkilled = {
  ...nearHelper, id: 'h2', name: 'FarSkilled', serviceRadiusMiles: 3,
  lat: 30.45, lng: -97.74, // ~12mi > helper 3mi; kept only via skillMatch soft bypass
}
const farUnskilled = {
  ...nearHelper, id: 'h3', name: 'FarUnskilled', skills: ['auto_detailing'],
  serviceRadiusMiles: 3, lat: 30.45, lng: -97.74,
}
// 4mi away with helper radius 3 — would pass under old Math.max(requestRadius=5, 3)=5
const midNoSkill = {
  ...nearHelper, id: 'h4', name: 'MidNoSkill', skills: ['junk_removal'],
  serviceRadiusMiles: 3, lat: 30.325, lng: -97.74, // ~3.8mi
}
const ranked = rankHelpersForRequest(request, [nearHelper, farSkilled, farUnskilled, midNoSkill])
const ids = ranked.map((m) => m.person.id)
const near = ranked.find((m) => m.person.id === 'h1')
const mid = ranked.find((m) => m.person.id === 'h4')
console.log(JSON.stringify({
  nearPresent: Boolean(near),
  farSkilledPresent: ids.includes('h2'),
  farUnskilledPresent: ids.includes('h3'),
  midNoSkillPresent: Boolean(mid),
  midMiles: mid?.distanceMiles ?? null,
  nearMiles: near?.distanceMiles ?? null,
  ids,
}))
`)
assert.equal(matching.nearPresent, true)
assert.equal(matching.farUnskilledPresent, false, 'unskilled beyond helper radius excluded')
assert.equal(
  matching.midNoSkillPresent,
  false,
  'default request radius_miles=5 must NOT expand past helper travel distance',
)
console.log('listing-photos-unit (matching helper radius): OK', matching)

console.log('listing-photos-unit: ALL OK')
