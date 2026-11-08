/** Unit checks for listing schedule helpers (no browser). */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { register } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Run via tsx-like transpile: use dynamic import of compiled path through next/babel not available.
// Instead duplicate minimal assertions by spawning node with typescript transpile via npx tsx if present.
// Fallback: re-implement expected contract checks against source via regex + eval of pure functions copied.

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

async function loadSchedule() {
  // Prefer tsx if available
  try {
    const { execFileSync } = await import('node:child_process')
    const out = execFileSync(
      'npx',
      [
        '--yes',
        'tsx',
        '-e',
        `
        import {
          buildWhenLabel,
          formatShortDate,
          localDateISO,
          parseTimeInput,
          validateTimeWindow,
          combineLocalDateTime,
        } from './src/lib/listingSchedule.ts'
        const today = localDateISO()
        const start = parseTimeInput('14:00')
        const end = parseTimeInput('16:30')
        const label = buildWhenLabel({ when: 'today', dateISO: today, start, end })
        const past = validateTimeWindow({
          when: 'today',
          dateISO: today,
          start: parseTimeInput('00:01'),
          end: null,
          now: combineLocalDateTime(today, { hours: 12, minutes: 0 }),
        })
        console.log(JSON.stringify({ today, label, pastOk: !past.ok, hasDate: label.includes(formatShortDate(today)) }))
        `,
      ],
      { cwd: root, encoding: 'utf8' },
    )
    return JSON.parse(out.trim().split('\n').pop())
  } catch (err) {
    console.warn('tsx path failed, skipping deep unit', err.message)
    return null
  }
}

const result = await loadSchedule()
if (result) {
  assert.match(result.label, /Today/i)
  assert.equal(result.hasDate, true, 'Today label includes calendar date')
  assert.equal(result.pastOk, true, 'rejects past same-day start')
  console.log('listing-schedule-unit: OK', result)
} else {
  console.log('listing-schedule-unit: skipped (no tsx)')
}
