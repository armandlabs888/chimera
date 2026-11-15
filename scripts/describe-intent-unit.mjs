#!/usr/bin/env node
/**
 * Unit tests for the describe-your-request intent matcher.
 * Mirrors src/lib/describeIntent.ts without the Next @/ path alias.
 */
import assert from 'node:assert/strict'

const CATEGORY_SYNONYMS = [
  {
    terms: [
      'house cleaner',
      'house cleaning',
      'housekeeping',
      'housekeeper',
      'maid',
      'cleaner',
      'cleaning',
      'cleaners',
    ],
    categoryId: 'house-cleaning',
    weight: 10,
  },
  {
    terms: ['carpet cleaning', 'carpet', 'rug'],
    categoryId: 'carpet-cleaning',
    weight: 10,
  },
  {
    terms: ['junk removal', 'haul away', 'junk', 'hauling'],
    categoryId: 'junk-removal',
    weight: 10,
  },
  {
    terms: [
      'dog walker',
      'dog walk',
      'cat sit',
      'pet sit',
      'pet sitting',
    ],
    categoryId: 'pet-sitting',
    weight: 10,
  },
  {
    terms: [
      'help moving',
      'couch',
      'sofa',
      'furniture',
      'boxes',
      'moving',
    ],
    categoryId: 'moving',
    weight: 10,
  },
  {
    terms: ['auto detailing', 'car detailing', 'detailing'],
    categoryId: 'auto-detailing',
    weight: 10,
  },
]

const LABELS = {
  'house-cleaning': 'House Cleaning',
  'carpet-cleaning': 'Carpet Cleaning',
  'junk-removal': 'Junk Removal',
  'pet-sitting': 'Pet Sitting',
  grooming: 'Grooming',
  'auto-detailing': 'Auto Detailing',
  moving: 'Moving & lifting',
}

const HELPER_INTENT_PATTERNS = [
  /\bfind(?:ing)?\s+(?:new\s+)?jobs?\b/i,
  /\bneed(?:\s+to)?\s+find\s+(?:new\s+)?jobs?\b/i,
  /\bi\s+need\s+to\s+find\s+new\s+jobs?\b/i,
  /\bneed\s+work\b/i,
  /\blooking\s+for\s+work\b/i,
  /\blooking\s+for\s+(?:new\s+)?jobs?\b/i,
  /\bfind\s+jobs\s+near\s+me\b/i,
  /\bgigs?\b/i,
  /\b(?:house\s+cleaning|cleaning|moving|junk|pet|dog\s+walk(?:ing)?|grooming|auto|detailing)\s+jobs?\b/i,
]

const NEIGHBOR_INTENT_PATTERNS = [
  /\blooking\s+for\s+a\b/i,
  /\bneed\s+(?:a|someone|help)\b/i,
  /\bhelp\s+(?:me\s+)?(?:with|moving|find(?:ing)?\s+a)\b/i,
  /\bhire\b/i,
  /\bfind\s+(?:a|me\s+a)\b/i,
]

function normalizeQuery(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'+.\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function termMatches(haystack, term) {
  const t = term.toLowerCase().trim()
  if (!t) return false
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(t)}(?:[^a-z0-9]|$)`, 'i')
  return re.test(haystack)
}

function scoreCategories(normalized) {
  const scores = new Map()
  for (const rule of CATEGORY_SYNONYMS) {
    for (const term of rule.terms) {
      if (!termMatches(normalized, term)) continue
      const bump = rule.weight + Math.min(8, term.split(/\s+/).length * 2)
      scores.set(rule.categoryId, (scores.get(rule.categoryId) ?? 0) + bump)
    }
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, label: LABELS[id] || id, score }))
    .sort((a, b) => b.score - a.score)
}

function detectDescribeIntent(query, options = {}) {
  const normalized = normalizeQuery(query)
  const ranked = normalized ? scoreCategories(normalized) : []
  const category = ranked[0] ?? null

  const helperCue = HELPER_INTENT_PATTERNS.some((re) => re.test(normalized))
  const neighborCue = NEIGHBOR_INTENT_PATTERNS.some((re) => re.test(normalized))

  let intent
  let ambiguous = false
  if (options.intentOverride === 'helpers' || options.intentOverride === 'jobs') {
    intent = options.intentOverride
  } else if (helperCue && !neighborCue) {
    intent = 'jobs'
  } else if (neighborCue && !helperCue) {
    intent = 'helpers'
  } else if (helperCue && neighborCue) {
    ambiguous = true
    intent = options.roleHint === 'helper' ? 'jobs' : 'helpers'
  } else {
    ambiguous = true
    intent = options.roleHint === 'helper' ? 'jobs' : 'helpers'
  }

  return { intent, ambiguous, category }
}

function expandMatchCategoryFilter(categoryId) {
  if (!categoryId) return null
  if (categoryId === 'moving') return ['moving', 'junk-removal']
  if (categoryId === 'cleaning') return ['cleaning', 'house-cleaning', 'carpet-cleaning']
  return [categoryId]
}

function formatIntentChip({ intent, categoryLabel, zip }) {
  const z = zip || 'your area'
  if (intent === 'jobs') {
    return { understood: `Showing new jobs near ${z}`, toggleLabel: 'Show helpers instead' }
  }
  if (categoryLabel) {
    return {
      understood: `Finding helpers for ${categoryLabel} near ${z}`,
      toggleLabel: 'Show jobs instead',
    }
  }
  return { understood: `Finding helpers near ${z}`, toggleLabel: 'Show jobs instead' }
}

function formatHelpersHeading(categoryLabel) {
  if (!categoryLabel) return 'Best helpers for you'
  const lower = categoryLabel.toLowerCase()
  if (lower.includes('cleaning')) {
    const base = lower.replace(/\s*cleaning\s*$/i, '').trim()
    return `Best ${base} cleaners for you`
  }
  return `Best ${lower} helpers for you`
}

// --- Tests ---

{
  const r = detectDescribeIntent('Looking for a weekly house cleaner')
  assert.equal(r.intent, 'helpers')
  assert.equal(r.category?.id, 'house-cleaning')
  assert.equal(r.ambiguous, false)
}

{
  const r = detectDescribeIntent('Help moving a couch Saturday')
  assert.equal(r.intent, 'helpers')
  assert.equal(r.category?.id, 'moving')
}

{
  const r = detectDescribeIntent('I need to find new jobs')
  assert.equal(r.intent, 'jobs')
  assert.equal(r.ambiguous, false)
}

{
  const r = detectDescribeIntent('Find jobs near me')
  assert.equal(r.intent, 'jobs')
}

{
  const r = detectDescribeIntent('Moving jobs this weekend')
  assert.equal(r.intent, 'jobs')
  assert.equal(r.category?.id, 'moving')
}

{
  const r = detectDescribeIntent('need work')
  assert.equal(r.intent, 'jobs')
}

{
  const r = detectDescribeIntent('looking for work')
  assert.equal(r.intent, 'jobs')
}

{
  const r = detectDescribeIntent('Dog walker this week')
  assert.equal(r.category?.id, 'pet-sitting')
  assert.equal(r.intent, 'helpers')
}

{
  const r = detectDescribeIntent('haul away garage junk')
  assert.equal(r.category?.id, 'junk-removal')
}

{
  const r = detectDescribeIntent('maid for weekly housekeeping')
  assert.equal(r.category?.id, 'house-cleaning')
}

{
  const r = detectDescribeIntent('sofa and furniture move')
  assert.equal(r.category?.id, 'moving')
}

{
  const r = detectDescribeIntent('cat sit while away')
  assert.equal(r.category?.id, 'pet-sitting')
}

{
  // Role tiebreaker: ambiguous / empty → helper role picks jobs
  const r = detectDescribeIntent('nearby', { roleHint: 'helper' })
  assert.equal(r.intent, 'jobs')
  assert.equal(r.ambiguous, true)
}

{
  const r = detectDescribeIntent('nearby', { roleHint: 'guest' })
  assert.equal(r.intent, 'helpers')
  assert.equal(r.ambiguous, true)
}

{
  const r = detectDescribeIntent('Looking for a weekly house cleaner', {
    intentOverride: 'jobs',
  })
  assert.equal(r.intent, 'jobs')
  assert.equal(r.category?.id, 'house-cleaning')
}

{
  assert.deepEqual(expandMatchCategoryFilter('moving'), ['moving', 'junk-removal'])
  assert.deepEqual(expandMatchCategoryFilter('house-cleaning'), ['house-cleaning'])
  assert.equal(expandMatchCategoryFilter(null), null)
}

{
  const chip = formatIntentChip({
    intent: 'helpers',
    categoryLabel: 'House cleaning',
    zip: '95131',
  })
  assert.equal(chip.understood, 'Finding helpers for House cleaning near 95131')
  assert.equal(chip.toggleLabel, 'Show jobs instead')
}

{
  const chip = formatIntentChip({ intent: 'jobs', categoryLabel: null, zip: '95131' })
  assert.equal(chip.understood, 'Showing new jobs near 95131')
  assert.equal(chip.toggleLabel, 'Show helpers instead')
}

{
  assert.equal(formatHelpersHeading('House Cleaning'), 'Best house cleaners for you')
  assert.equal(formatHelpersHeading(null), 'Best helpers for you')
}

// No em/en dashes in user-facing chip / heading helpers
{
  const chip = formatIntentChip({
    intent: 'helpers',
    categoryLabel: 'House cleaning',
    zip: '95131',
  })
  assert.doesNotMatch(chip.understood, /[—–]/)
  assert.doesNotMatch(formatHelpersHeading('House Cleaning'), /[—–]/)
}

console.log('describe-intent-unit PASS')
