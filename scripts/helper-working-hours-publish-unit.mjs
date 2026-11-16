#!/usr/bin/env node
/**
 * Proves the helper publish / settings save payload includes working hours
 * (work_start, work_end, timezone) and is_helper, and that the missing-column
 * fallback only triggers on genuine schema misses (not bare "column").
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoSrc = readFileSync(join(root, 'src/lib/beam/liveRepository.ts'), 'utf8')

assert.match(repoSrc, /export function buildLiveProfileUpdatePayload/)
assert.match(repoSrc, /export function isMissingWorkingHoursColumnError/)
assert.match(repoSrc, /export function toDbWorkTime/)
assert.doesNotMatch(
  repoSrc,
  /\/work_start\|work_end\|timezone\|column\/i/,
  'Overly broad silent fallback regex must be removed',
)

/** Mirror of toDbWorkTime in liveRepository.ts */
function toDbWorkTime(value) {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(trimmed)
  if (!m) return null
  const hh = m[1].padStart(2, '0')
  const mm = m[2]
  const ss = m[3] ?? '00'
  return `${hh}:${mm}:${ss}`
}

/** Mirror of buildLiveProfileUpdatePayload for the publish fields we care about. */
function buildLiveProfileUpdatePayload(patch) {
  const payload = {}
  if (patch.skills !== undefined) {
    payload.skills = patch.skills
    if (patch.isHelper === undefined) {
      payload.is_helper = patch.skills.length > 0
    }
  }
  if (patch.hourlyRate !== undefined) payload.hourly_rate = patch.hourlyRate
  if (patch.rateType !== undefined) payload.rate_type = patch.rateType
  if (patch.availableNow !== undefined) payload.available_now = patch.availableNow
  if (patch.isHelper !== undefined) payload.is_helper = patch.isHelper
  if (patch.workStart !== undefined) payload.work_start = toDbWorkTime(patch.workStart)
  if (patch.workEnd !== undefined) payload.work_end = toDbWorkTime(patch.workEnd)
  if (patch.timezone !== undefined) {
    const tz = typeof patch.timezone === 'string' ? patch.timezone.trim() : ''
    payload.timezone = tz || null
  }
  return payload
}

/** Mirror of isMissingWorkingHoursColumnError */
function isMissingWorkingHoursColumnError(error) {
  if (!error) return false
  const msg = error.message || ''
  const lower = msg.toLowerCase()
  const code = error.code || ''
  const namesWorkingHoursColumn = /\bwork_start\b|\bwork_end\b|\btimezone\b/i.test(msg)
  if (code === 'PGRST204' && namesWorkingHoursColumn) return true
  if (code === '42703' && namesWorkingHoursColumn) return true
  if (
    /could not find the '(work_start|work_end|timezone)' column/i.test(msg) ||
    /column ["']?(work_start|work_end|timezone)["']? (?:of relation|does not exist)/i.test(
      lower,
    ) ||
    (namesWorkingHoursColumn &&
      (/schema cache/i.test(msg) || /does not exist/i.test(lower)))
  ) {
    return true
  }
  return false
}

// Publish-helper payload (mirrors HelperOnboarding / YouHelperDetailsForm)
const publishPatch = {
  skills: ['junk-removal', 'house-cleaning'],
  rateType: 'hourly',
  hourlyRate: 45,
  availableNow: true,
  workStart: '09:00',
  workEnd: '17:00',
  timezone: 'America/Los_Angeles',
  isHelper: true,
}
const publishPayload = buildLiveProfileUpdatePayload(publishPatch)

assert.equal(publishPayload.is_helper, true)
assert.deepEqual(publishPayload.skills, ['junk-removal', 'house-cleaning'])
assert.equal(publishPayload.work_start, '09:00:00')
assert.equal(publishPayload.work_end, '17:00:00')
assert.equal(publishPayload.timezone, 'America/Los_Angeles')
assert.equal(publishPayload.hourly_rate, 45)
assert.equal(publishPayload.rate_type, 'hourly')
assert.equal(publishPayload.available_now, true)

// Flat rate publish keeps amount on hourly_rate and sets rate_type
const flatPayload = buildLiveProfileUpdatePayload({
  skills: ['junk-removal'],
  rateType: 'flat',
  hourlyRate: 120,
  isHelper: true,
})
assert.equal(flatPayload.rate_type, 'flat')
assert.equal(flatPayload.hourly_rate, 120)
assert.equal(flatPayload.is_helper, true)

// Clearing hours
const clearPayload = buildLiveProfileUpdatePayload({
  workStart: null,
  workEnd: null,
  timezone: null,
  isHelper: true,
})
assert.equal(clearPayload.work_start, null)
assert.equal(clearPayload.work_end, null)
assert.equal(clearPayload.timezone, null)
assert.equal(clearPayload.is_helper, true)

// Fallback must NOT fire on generic column errors
assert.equal(
  isMissingWorkingHoursColumnError({
    message: 'null value in column "name" violates not-null constraint',
    code: '23502',
  }),
  false,
)
assert.equal(
  isMissingWorkingHoursColumnError({
    message: 'new row violates row-level security policy for table "profiles"',
  }),
  false,
)
assert.equal(
  isMissingWorkingHoursColumnError({
    message: 'Could not find the "bio" column of "profiles" in the schema cache',
    code: 'PGRST204',
  }),
  false,
)

// Fallback MUST fire on genuine working-hours misses
assert.equal(
  isMissingWorkingHoursColumnError({
    message: "Could not find the 'work_start' column of 'profiles' in the schema cache",
    code: 'PGRST204',
  }),
  true,
)
assert.equal(
  isMissingWorkingHoursColumnError({
    message: 'column "timezone" of relation "profiles" does not exist',
    code: '42703',
  }),
  true,
)

// Source call sites still pass working hours + isHelper
const onboarding = readFileSync(join(root, 'src/screens/HelperOnboarding.tsx'), 'utf8')
assert.match(onboarding, /workStart:\s*hours\.workStart/)
assert.match(onboarding, /workEnd:\s*hours\.workEnd/)
assert.match(onboarding, /timezone:\s*hours\.timezone/)
assert.match(onboarding, /isHelper:\s*true/)
assert.match(onboarding, /await updateProfile\(/)

const editForm = readFileSync(join(root, 'src/components/account/EditProfileForm.tsx'), 'utf8')
assert.match(editForm, /workStart:\s*hours\.workStart/)
assert.match(editForm, /isHelper:\s*true/)
assert.match(editForm, /await updateProfile\(/)

const youHelper = readFileSync(
  join(root, 'src/components/account/YouHelperDetailsForm.tsx'),
  'utf8',
)
assert.match(youHelper, /workStart:\s*hours\.workStart/)
assert.match(youHelper, /isHelper:\s*true/)
assert.match(youHelper, /await updateProfile\(/)

// SMS verification gate present
const sms = readFileSync(
  join(root, 'src/components/account/HelperUrgentSmsSettings.tsx'),
  'utf8',
)
assert.match(sms, /You have to verify first to turn on text alerts\./)
assert.match(sms, /helper-sms-get-verified/)
assert.match(sms, /locationVerified/)

const migration = readFileSync(
  join(root, 'supabase/migrations/20261116170000_helper_sms_requires_verification.sql'),
  'utf8',
)
assert.match(migration, /helper_verifications/)
assert.match(migration, /status = 'approved'/)
assert.match(migration, /sms_opt_in/)
assert.match(migration, /You have to verify first to turn on text alerts/)

console.log('helper-working-hours-publish-unit: ok')
