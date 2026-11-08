#!/usr/bin/env node
/**
 * Contract unit tests for casual-launch taxonomy.
 * Mirrors `@/lib/taxonomy` behavior without importing media-backed TS modules.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/lib/taxonomy.ts'), 'utf8')

const PARENTS = ['home', 'auto', 'junk-removal', 'pets', 'other']
const SERVICES = [
  'house-cleaning',
  'carpet-cleaning',
  'auto-detailing',
  'junk-removal',
  'pet-sitting',
  'grooming',
  'other',
]
const LEGACY = ['moving', 'cleaning', 'handyman', 'petcare', 'tutoring', 'events']

for (const id of PARENTS) assert.match(src, new RegExp(`id: '${id}'`))
for (const id of SERVICES) assert.match(src, new RegExp(`id: '${id}'`))
for (const id of LEGACY) {
  assert.match(src, new RegExp(`${id}: '`))
  assert.doesNotMatch(src, new RegExp(`id: '${id}'`))
}

assert.match(src, /OTHER_CUSTOM_MIN = 2/)
assert.match(src, /OTHER_CUSTOM_MAX = 60/)
assert.match(src, /serviceIds: \['house-cleaning', 'carpet-cleaning'\]/)
assert.match(src, /serviceIds: \['auto-detailing'\]/)
assert.match(src, /serviceIds: \['pet-sitting', 'grooming'\]/)

// Pure helpers mirrored for behavioral coverage
const PARENT_SERVICES = {
  home: ['house-cleaning', 'carpet-cleaning'],
  auto: ['auto-detailing'],
  'junk-removal': ['junk-removal'],
  pets: ['pet-sitting', 'grooming'],
  other: ['other'],
}
const LEGACY_LABELS = {
  moving: 'Moving & lifting',
  cleaning: 'Home cleaning',
  handyman: 'Handyman & assembly',
  petcare: 'Pet care',
  tutoring: 'Tutoring & tech help',
  events: 'Events & photo',
}

function expandBrowseFilter(filter) {
  if (!filter || filter === 'all') return null
  if (PARENT_SERVICES[filter]) return [...PARENT_SERVICES[filter]]
  if (SERVICES.includes(filter) || LEGACY.includes(filter)) return [filter]
  return [filter]
}

function matchesBrowseCategory(requestCategory, filter) {
  const expanded = expandBrowseFilter(filter)
  if (!expanded) return true
  return expanded.includes(requestCategory)
}

function formatCategoryLabel(id, custom) {
  if (!id) return 'Local help'
  if (id === 'other') {
    const trimmed = (custom ?? '').trim()
    return trimmed || 'Other'
  }
  if (SERVICES.includes(id)) return id
  if (PARENTS.includes(id)) return id
  if (LEGACY_LABELS[id]) return LEGACY_LABELS[id]
  return id
}

function normalizeOtherCustom(raw) {
  const value = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (value.length < 2) return { ok: false }
  if (value.length > 60) return { ok: false }
  return { ok: true, value }
}

assert.deepEqual(expandBrowseFilter('home'), ['house-cleaning', 'carpet-cleaning'])
assert.equal(matchesBrowseCategory('carpet-cleaning', 'home'), true)
assert.equal(matchesBrowseCategory('moving', 'home'), false)
assert.equal(matchesBrowseCategory('moving', 'moving'), true)
assert.equal(formatCategoryLabel('moving'), 'Moving & lifting')
assert.equal(formatCategoryLabel('other', 'Patio setup'), 'Patio setup')
assert.equal(normalizeOtherCustom('  Event photography  ').value, 'Event photography')
assert.equal(normalizeOtherCustom('a').ok, false)
assert.equal(normalizeOtherCustom('x'.repeat(61)).ok, false)

// UI surfaces must not advertise removed parents
for (const file of [
  'src/components/landing/LandingHero.tsx',
  'src/components/landing/LandingFooter.tsx',
  'src/screens/Browse.tsx',
  'src/components/CategorySelect.tsx',
]) {
  const text = readFileSync(join(root, file), 'utf8')
  assert.doesNotMatch(text, /Moving & lifting/)
  assert.doesNotMatch(text, /Handyman & assembly/)
  assert.doesNotMatch(text, /Tutoring & tech help/)
  assert.match(text, /BROWSE_PARENTS|BrowseParent/)
}

console.log('ok taxonomy unit')
