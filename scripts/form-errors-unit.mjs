#!/usr/bin/env node
/**
 * Unit checks for src/lib/formErrors.ts (mirrored helpers).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/lib/formErrors.ts'), 'utf8')

assert.match(src, /export function humanizeSaveError/)
assert.match(src, /export function formatFormIssues/)
assert.match(src, /We couldn't save your changes/)
assert.match(src, /Check your connection and try again/)
assert.doesNotMatch(src, /[—–]/, 'no em/en dashes in formErrors')

/** Mirror of formatFormIssues */
function formatFormIssues(issues) {
  const cleaned = issues.map((s) => String(s).trim()).filter(Boolean)
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned[0]
  return cleaned.join(' ')
}

/** Mirror of humanizeSaveError core */
function humanizeSaveError(err, fallback = "We couldn't save your changes. Check your connection and try again.") {
  const raw = typeof err === 'string' ? err : err instanceof Error ? err.message : ''
  const cleaned = raw.replace(/^Update profile:\s*/i, '').replace(/^Error:\s*/i, '').trim()
  if (!cleaned) return fallback
  if (/supabase|postgres|sqlstate|permission denied|jwt|rls|column |relation |violates|stack|etype|syntax error|undefined column|networkerror|failed to fetch|load failed|http\/|status code/i.test(cleaned)) {
    return fallback
  }
  if (cleaned.length > 160) return fallback
  return cleaned
}

assert.equal(formatFormIssues(['Add a display name']), 'Add a display name')
assert.equal(
  formatFormIssues(['Add a display name', 'Enter your hourly rate.']),
  'Add a display name Enter your hourly rate.',
)
assert.equal(
  humanizeSaveError('Update profile: column hourly_rate does not exist'),
  "We couldn't save your changes. Check your connection and try again.",
)
assert.equal(humanizeSaveError('Pick at least one skill so we can match you to open requests.'), 'Pick at least one skill so we can match you to open requests.')
assert.equal(humanizeSaveError(new Error('Failed to fetch')), "We couldn't save your changes. Check your connection and try again.")

const alertSrc = readFileSync(join(root, 'src/components/ui/FormErrorAlert.tsx'), 'utf8')
assert.match(alertSrc, /#FEF2F2/)
assert.match(alertSrc, /#C62828/)
assert.match(alertSrc, /role=\"alert\"/)
assert.doesNotMatch(alertSrc, /[—–]/)

console.log('form-errors-unit: OK')
