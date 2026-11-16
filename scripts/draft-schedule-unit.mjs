/**
 * Source contract for AI draft schedule inference.
 * Runtime schedule shape is also asserted via /api/ai/draft-request in smoke.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/lib/draftSchedule.ts'), 'utf8')
const route = readFileSync(join(root, 'app/api/ai/draft-request/route.ts'), 'utf8')
const post = readFileSync(join(root, 'src/screens/PostRequest.tsx'), 'utf8')

assert.match(src, /export function inferDraftSchedule/)
assert.match(src, /Saturday afternoon|afternoon/)
assert.match(src, /tomorrow/)
assert.match(src, /clock\(13\)/)
assert.match(src, /clock\(9\)/)
assert.match(route, /inferDraftSchedule/)
assert.match(route, /scheduledDate/)
assert.match(route, /startTime/)
assert.match(post, /Step 1 of 2/)
assert.match(post, /Step 2 of 2/)
assert.match(post, /Drafting your task/)
assert.match(post, /Review and post/)
assert.match(post, /From your search/)
assert.match(post, /Post again/)
assert.match(post, /Pick a time/)
assert.doesNotMatch(post, /Draft with AI/)
assert.doesNotMatch(post, /post-needs-help-now-checkbox/)
assert.doesNotMatch(post, /post-end-time/)
assert.match(post, /@\/lib\/zip\/format/)
assert.doesNotMatch(post, /@\/lib\/zip\/server/)
assert.doesNotMatch(post, /\u2013|\u2014/)

console.log('draft-schedule-unit: OK')
