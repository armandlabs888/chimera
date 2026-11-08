/**
 * Unit tests for two-choice When (asap | scheduled): labels, clearing, future/midnight,
 * end-before-start, legacy labels.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function run(source) {
  const out = execFileSync('npx', ['--yes', 'tsx', '-e', source], {
    cwd: root,
    encoding: 'utf8',
  })
  return JSON.parse(out.trim().split('\n').filter(Boolean).pop())
}

const r = run(`
import {
  ASAP_ARRIVAL_NOTE,
  ASAP_WHEN_LABEL,
  addLocalDays,
  buildWhenLabel,
  combineLocalDateTime,
  localDateISO,
  parseTimeInput,
  validateTimeWindow,
  isPostWhenMode,
} from './src/lib/listingSchedule.ts'

const today = '2026-11-08'
const tomorrow = addLocalDays(today, 1)
const noon = combineLocalDateTime(today, { hours: 12, minutes: 0 })

const asapLabel = buildWhenLabel({ when: 'asap', dateISO: today, start: parseTimeInput('14:00'), end: null })
const scheduledLabel = buildWhenLabel({
  when: 'scheduled',
  dateISO: tomorrow,
  start: parseTimeInput('09:30'),
  end: parseTimeInput('11:00'),
})
const legacyToday = buildWhenLabel({
  when: 'today',
  dateISO: today,
  start: parseTimeInput('14:00'),
  end: null,
})

const past = validateTimeWindow({
  when: 'scheduled',
  dateISO: today,
  start: parseTimeInput('09:00'),
  end: null,
  now: noon,
})
const endBefore = validateTimeWindow({
  when: 'scheduled',
  dateISO: tomorrow,
  start: parseTimeInput('16:00'),
  end: parseTimeInput('15:00'),
  now: noon,
})
const okFuture = validateTimeWindow({
  when: 'scheduled',
  dateISO: tomorrow,
  start: parseTimeInput('00:30'),
  end: null,
  now: noon,
})
const asapOk = validateTimeWindow({
  when: 'asap',
  dateISO: null,
  start: null,
  end: null,
  now: noon,
})

// Midnight local tomorrow must stay on tomorrow calendar day
const midnightish = combineLocalDateTime(tomorrow, { hours: 0, minutes: 15 })
const stillTomorrow = localDateISO(midnightish) === tomorrow

// ASAP submit shape: schedule fields must be treated as null when mode is asap
const submitAsap = {
  when: 'asap',
  whenLabel: ASAP_WHEN_LABEL,
  scheduledFor: null,
  scheduledEnd: null,
}

console.log(JSON.stringify({
  note: ASAP_ARRIVAL_NOTE,
  asapLabel,
  scheduledLabel,
  legacyToday,
  pastOk: !past.ok,
  endBeforeOk: !endBefore.ok,
  okFuture: okFuture.ok,
  asapOk: asapOk.ok,
  stillTomorrow,
  isPostAsap: isPostWhenMode('asap'),
  isPostScheduled: isPostWhenMode('scheduled'),
  isPostToday: isPostWhenMode('today'),
  submitAsap,
}))
`)

assert.equal(r.note, 'Arrival time confirmed with your helper.')
assert.equal(r.asapLabel, 'As soon as possible')
assert.match(r.scheduledLabel, /Nov 9/)
assert.match(r.scheduledLabel, /9:30/)
assert.match(r.legacyToday, /Today/)
assert.equal(r.pastOk, true)
assert.equal(r.endBeforeOk, true)
assert.equal(r.okFuture, true)
assert.equal(r.asapOk, true)
assert.equal(r.stillTomorrow, true)
assert.equal(r.isPostAsap, true)
assert.equal(r.isPostScheduled, true)
assert.equal(r.isPostToday, false)
assert.equal(r.submitAsap.scheduledFor, null)
assert.equal(r.submitAsap.scheduledEnd, null)
console.log('listing-when-unit: OK', r)
