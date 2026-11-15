/**
 * Client-side keyword / category matcher for the Thumbtack-style describe search.
 * Pure module: no AI, no network. Built on SERVICE_CATEGORIES / BROWSE_PARENTS
 * plus a synonym table. Unit-tested via scripts/describe-intent-unit.mjs.
 */

import {
  BROWSE_PARENTS,
  formatCategoryLabel,
  getBrowseParent,
  isBrowseParentId,
  isLegacyCategoryId,
  isServiceCategoryId,
  parentIdForService,
  SERVICE_CATEGORIES,
  type BrowseParentId,
  type LegacyCategoryId,
  type ServiceCategoryId,
} from '@/lib/taxonomy'

export type MatchIntent = 'helpers' | 'jobs'

export type DescribeRoleHint = 'helper' | 'customer' | 'guest' | null

export type MatchedCategory = {
  id: string
  label: string
  parentId: BrowseParentId | null
  /** Higher is better. */
  score: number
  meta: string
}

export type DescribeIntentResult = {
  intent: MatchIntent
  /** True when text had no strong helper/neighbor cue and role was the tiebreaker. */
  ambiguous: boolean
  category: MatchedCategory | null
  related: MatchedCategory[]
  exampleRequests: string[]
}

type SynonymRule = {
  /** Lowercase phrases / words matched as whole words or phrases. */
  terms: string[]
  categoryId: string
  weight: number
}

/**
 * Synonym → category rules. Order within a category does not matter;
 * longer phrase matches score higher via term length.
 */
export const CATEGORY_SYNONYMS: SynonymRule[] = [
  {
    terms: [
      'house cleaner',
      'house cleaning',
      'home cleaner',
      'home cleaning',
      'housekeeping',
      'housekeeper',
      'maid service',
      'maid',
      'cleaner',
      'cleaning',
      'cleaners',
      'tidy',
      'tidy up',
      'deep clean',
      'move-out clean',
      'move out clean',
    ],
    categoryId: 'house-cleaning',
    weight: 10,
  },
  {
    terms: ['carpet cleaning', 'carpet cleaner', 'carpet', 'rug cleaning', 'rugs', 'rug'],
    categoryId: 'carpet-cleaning',
    weight: 10,
  },
  {
    terms: [
      'auto detailing',
      'car detailing',
      'detailing',
      'car wash',
      'exterior wash',
      'interior detail',
    ],
    categoryId: 'auto-detailing',
    weight: 10,
  },
  {
    terms: [
      'junk removal',
      'haul away',
      'haul-away',
      'hauling',
      'junk',
      'debris',
      'clutter removal',
    ],
    categoryId: 'junk-removal',
    weight: 10,
  },
  {
    terms: [
      'dog walker',
      'dog walk',
      'dog walking',
      'walk the dog',
      'cat sit',
      'cat sitter',
      'pet sit',
      'pet sitting',
      'pet sitter',
      'dog sitting',
      'drop-in',
      'drop in',
    ],
    categoryId: 'pet-sitting',
    weight: 10,
  },
  {
    terms: ['grooming', 'dog bath', 'pet bath', 'nail trim', 'brush out', 'brush-out'],
    categoryId: 'grooming',
    weight: 10,
  },
  {
    terms: [
      'moving help',
      'help moving',
      'move a couch',
      'moving a couch',
      'couch',
      'sofa',
      'sectional',
      'furniture',
      'boxes',
      'moving boxes',
      'movers',
      'move upstairs',
      'moving',
      'u-haul',
      'u haul',
    ],
    categoryId: 'moving',
    weight: 10,
  },
]

/** Phrases that strongly indicate the searcher wants open jobs (helper intent). */
const HELPER_INTENT_PATTERNS: RegExp[] = [
  /\bfind(?:ing)?\s+(?:new\s+)?jobs?\b/i,
  /\bneed(?:\s+to)?\s+find\s+(?:new\s+)?jobs?\b/i,
  /\bi\s+need\s+to\s+find\s+new\s+jobs?\b/i,
  /\bneed\s+work\b/i,
  /\blooking\s+for\s+work\b/i,
  /\blooking\s+for\s+(?:new\s+)?jobs?\b/i,
  /\bfind\s+jobs\s+near\s+me\b/i,
  /\bgigs?\b/i,
  /\b(?:house\s+cleaning|cleaning|moving|junk|pet|dog\s+walk(?:ing)?|grooming|auto|detailing)\s+jobs?\b/i,
  /\b\w[\w\s-]{0,24}\s+jobs?\b/i,
]

/** Phrases that strongly indicate a neighbor request (find helpers). */
const NEIGHBOR_INTENT_PATTERNS: RegExp[] = [
  /\blooking\s+for\s+a\b/i,
  /\bneed\s+(?:a|someone|help)\b/i,
  /\bhelp\s+(?:me\s+)?(?:with|moving|find(?:ing)?\s+a)\b/i,
  /\bhire\b/i,
  /\bbook\b/i,
  /\bfind\s+(?:a|me\s+a)\b/i,
]

const EXAMPLE_BY_CATEGORY: Record<string, string[]> = {
  'house-cleaning': [
    'Weekly house cleaner in {zip}',
    'Move-out house cleaning in {city}',
  ],
  'carpet-cleaning': [
    'Living room carpet clean in {zip}',
    'Carpet cleaning after kids in {city}',
  ],
  'auto-detailing': [
    'Interior car detail in {zip}',
    'Exterior wash before a trip in {city}',
  ],
  'junk-removal': [
    'Haul away garage clutter in {zip}',
    'Junk removal this weekend in {city}',
  ],
  'pet-sitting': [
    'Dog walker this week in {zip}',
    'Cat drop-in while away in {city}',
  ],
  grooming: ['Dog bath and brush in {zip}', 'Pet grooming at home in {city}'],
  moving: [
    'Help moving a couch in {zip}',
    'Moving help this weekend in {city}',
  ],
  other: ['Help with an everyday task in {zip}', 'Local help near {city}'],
}

function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'+.\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function termMatches(haystack: string, term: string): boolean {
  const t = term.toLowerCase().trim()
  if (!t) return false
  // Word-boundary match so "maid" does not hit "mermaid".
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(t)}(?:[^a-z0-9]|$)`, 'i')
  return re.test(haystack)
}

function labelForCategoryId(id: string): string {
  return formatCategoryLabel(id)
}

function parentForCategoryId(id: string): BrowseParentId | null {
  if (isServiceCategoryId(id)) return parentIdForService(id)
  if (id === 'moving') return 'junk-removal'
  if (id === 'cleaning') return 'home'
  if (id === 'petcare') return 'pets'
  if (isBrowseParentId(id)) return id
  return null
}

function scoreCategories(normalized: string): MatchedCategory[] {
  const scores = new Map<string, number>()

  for (const rule of CATEGORY_SYNONYMS) {
    for (const term of rule.terms) {
      if (!termMatches(normalized, term)) continue
      const bump = rule.weight + Math.min(8, term.split(/\s+/).length * 2)
      scores.set(rule.categoryId, (scores.get(rule.categoryId) ?? 0) + bump)
    }
  }

  // Direct service / parent label hits (e.g. "House Cleaning", "Junk Removal").
  for (const service of SERVICE_CATEGORIES) {
    if (termMatches(normalized, service.label.toLowerCase())) {
      scores.set(service.id, (scores.get(service.id) ?? 0) + 14)
    }
    if (termMatches(normalized, service.shortLabel.toLowerCase())) {
      scores.set(service.id, (scores.get(service.id) ?? 0) + 12)
    }
  }
  for (const parent of BROWSE_PARENTS) {
    if (parent.id === 'other') continue
    if (termMatches(normalized, parent.label.toLowerCase())) {
      const leaf = parent.serviceIds[0]
      scores.set(leaf, (scores.get(leaf) ?? 0) + 8)
    }
  }

  const ranked = [...scores.entries()]
    .map(([id, score]) => {
      const parentId = parentForCategoryId(id)
      const label = labelForCategoryId(id)
      return {
        id,
        label,
        parentId,
        score,
        meta: '',
      } satisfies MatchedCategory
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))

  return ranked.map((item, index) => {
    if (index === 0) return { ...item, meta: 'Best match' }
    if (item.parentId) {
      const parent = getBrowseParent(item.parentId)
      return { ...item, meta: `Related · ${parent.label}` }
    }
    return { ...item, meta: 'Related' }
  })
}

function detectHelperIntent(normalized: string): boolean {
  return HELPER_INTENT_PATTERNS.some((re) => re.test(normalized))
}

function detectNeighborIntent(normalized: string): boolean {
  return NEIGHBOR_INTENT_PATTERNS.some((re) => re.test(normalized))
}

function resolveIntent(
  normalized: string,
  roleHint: DescribeRoleHint,
): { intent: MatchIntent; ambiguous: boolean } {
  const helperCue = detectHelperIntent(normalized)
  const neighborCue = detectNeighborIntent(normalized)

  if (helperCue && !neighborCue) return { intent: 'jobs', ambiguous: false }
  if (neighborCue && !helperCue) return { intent: 'helpers', ambiguous: false }

  // Both or neither: role is the tiebreaker. Guests follow text; without cues → helpers.
  if (helperCue && neighborCue) {
    if (roleHint === 'helper') return { intent: 'jobs', ambiguous: true }
    return { intent: 'helpers', ambiguous: true }
  }

  // No cues.
  if (roleHint === 'helper') return { intent: 'jobs', ambiguous: true }
  return { intent: 'helpers', ambiguous: true }
}

function buildExamples(
  categoryId: string | null,
  zip: string,
  city: string,
): string[] {
  const templates =
    (categoryId && EXAMPLE_BY_CATEGORY[categoryId]) ||
    EXAMPLE_BY_CATEGORY.other
  const zipToken = zip || 'your ZIP'
  const cityToken = city || 'your area'
  return templates.map((t) =>
    t.replace('{zip}', zipToken).replace('{city}', cityToken),
  )
}

/**
 * Detect search intent + matching categories from free text.
 * @param query Raw describe field
 * @param options.zip Optional ZIP for example request copy
 * @param options.city Optional city label for example request copy
 * @param options.roleHint Signed-in role (helper) or customer/guest for tiebreaks
 * @param options.intentOverride Explicit chip toggle (helpers | jobs)
 */
export function detectDescribeIntent(
  query: string,
  options: {
    zip?: string
    city?: string
    roleHint?: DescribeRoleHint
    intentOverride?: MatchIntent | null
  } = {},
): DescribeIntentResult {
  const normalized = normalizeQuery(query)
  const ranked = normalized ? scoreCategories(normalized) : []
  const category = ranked[0] ?? null
  const related = ranked.slice(1, 4)

  // When parent "home" cleaning hits both leaves, keep best + one sibling as related.
  if (category && related.length === 0 && category.parentId) {
    const parent = getBrowseParent(category.parentId)
    for (const sid of parent.serviceIds) {
      if (sid === category.id) continue
      related.push({
        id: sid,
        label: labelForCategoryId(sid),
        parentId: category.parentId,
        score: 1,
        meta: `Related · ${parent.label}`,
      })
      break
    }
  }

  let intent: MatchIntent
  let ambiguous = false
  if (options.intentOverride === 'helpers' || options.intentOverride === 'jobs') {
    intent = options.intentOverride
  } else {
    const resolved = resolveIntent(normalized, options.roleHint ?? null)
    intent = resolved.intent
    ambiguous = resolved.ambiguous
  }

  return {
    intent,
    ambiguous,
    category,
    related,
    exampleRequests: buildExamples(
      category?.id ?? null,
      options.zip ?? '',
      options.city ?? '',
    ),
  }
}

/**
 * Expand a detected category into skill / request category ids for filtering.
 * Legacy `moving` also matches active `junk-removal` (where move-like jobs live).
 * Legacy `cleaning` also matches `house-cleaning`.
 */
export function expandMatchCategoryFilter(
  categoryId: string | null | undefined,
): string[] | null {
  if (!categoryId) return null
  if (isBrowseParentId(categoryId)) {
    return [...getBrowseParent(categoryId).serviceIds]
  }
  if (categoryId === 'moving' || (isLegacyCategoryId(categoryId) && categoryId === 'moving')) {
    return ['moving', 'junk-removal']
  }
  if (categoryId === 'cleaning') {
    return ['cleaning', 'house-cleaning', 'carpet-cleaning']
  }
  if (categoryId === 'petcare') {
    return ['petcare', 'pet-sitting', 'grooming']
  }
  if (isServiceCategoryId(categoryId)) return [categoryId]
  if (isLegacyCategoryId(categoryId)) return [categoryId]
  return [categoryId]
}

export function matchSkillAgainstCategory(
  skills: string[],
  categoryId: string | null | undefined,
): boolean {
  const expanded = expandMatchCategoryFilter(categoryId)
  if (!expanded) return true
  return skills.some((s) => expanded.includes(s))
}

export function matchRequestAgainstCategory(
  requestCategory: string,
  categoryId: string | null | undefined,
): boolean {
  const expanded = expandMatchCategoryFilter(categoryId)
  if (!expanded) return true
  return expanded.includes(requestCategory)
}

/** Chip copy: "Finding helpers for House cleaning near 95131" / "Showing new jobs near 95131". */
export function formatIntentChip(input: {
  intent: MatchIntent
  categoryLabel: string | null
  zip: string
}): { understood: string; toggleLabel: string } {
  const zip = input.zip || 'your area'
  if (input.intent === 'jobs') {
    return {
      understood: `Showing new jobs near ${zip}`,
      toggleLabel: 'Show helpers instead',
    }
  }
  if (input.categoryLabel) {
    return {
      understood: `Finding helpers for ${input.categoryLabel} near ${zip}`,
      toggleLabel: 'Show jobs instead',
    }
  }
  return {
    understood: `Finding helpers near ${zip}`,
    toggleLabel: 'Show jobs instead',
  }
}

/** Results H1 for neighbor intent. */
export function formatHelpersHeading(categoryLabel: string | null): string {
  if (!categoryLabel) return 'Best helpers for you'
  const lower = categoryLabel.toLowerCase()
  if (lower.includes('cleaning')) {
    // "House Cleaning" → "Best house cleaners for you"
    const base = lower.replace(/\s*cleaning\s*$/i, '').trim()
    return `Best ${base} cleaners for you`
  }
  if (lower === 'moving & lifting' || lower === 'moving') {
    return 'Best moving helpers for you'
  }
  return `Best ${lower} helpers for you`
}

/** Soft display label for chips (House Cleaning → House cleaning). */
export function softCategoryLabel(label: string): string {
  if (!label) return label
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
}

export type { ServiceCategoryId, LegacyCategoryId, BrowseParentId }
