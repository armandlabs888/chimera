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
  /** One-line plain description of what the category covers. */
  description: string
}

export type ExampleRequest = {
  /** Request text only (never includes location). Goes into `q` on select. */
  text: string
  /** Muted location hint for dropdown rows, e.g. "in 95131" or "in your area". */
  locationMeta: string
}

export type DescribeIntentResult = {
  intent: MatchIntent
  /** True when text had no strong helper/neighbor cue and role was the tiebreaker. */
  ambiguous: boolean
  category: MatchedCategory | null
  related: MatchedCategory[]
  exampleRequests: ExampleRequest[]
}

type SynonymRule = {
  /** Lowercase phrases / words matched as whole words or phrases. */
  terms: string[]
  categoryId: string
  weight: number
}

/** Short plain descriptions for dropdown rows (no em/en dashes). */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'house-cleaning': 'Homes, apartments, kitchens and baths',
  'carpet-cleaning': 'Rooms, stairs, and spot treatment',
  'auto-detailing': 'Interior and exterior car detailing',
  'junk-removal': 'Haul away old furniture and clutter',
  'pet-sitting': 'Walks, drop-ins, and overnight sitting',
  grooming: 'Bath, brush, and nail trim at home',
  other: 'Everyday tasks you describe',
  moving: 'Couches, boxes, loading a truck',
  handyman: 'Furniture setup, small repairs',
  cleaning: 'Homes, apartments, kitchens and baths',
  petcare: 'Walks, drop-ins, and overnight sitting',
  tutoring: 'Homework help and basic tech setup',
  events: 'Setup, photo help, and party tasks',
  home: 'House and carpet cleaning',
  auto: 'Car wash and detailing',
  pets: 'Sitting and grooming',
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
      'house clean',
      'home cleaner',
      'home cleaning',
      'home clean',
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
    terms: [
      'carpet cleaning',
      'carpet cleaner',
      'carpet clean',
      'carpet steam clean',
      'steam clean carpet',
      'carpet',
      'rug cleaning',
      'rug cleaner',
      'rug clean',
      'rugs',
      'rug',
    ],
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
  {
    terms: [
      'handyman',
      'assembly',
      'assemble',
      'furniture setup',
      'ikea',
      'mount tv',
      'tv mount',
      'small repairs',
      'fix together',
    ],
    categoryId: 'handyman',
    weight: 10,
  },
]

/** Neighbor categories to surface after the best match when synonym hits are sparse. */
const RELATED_NEIGHBORS: Record<string, string[]> = {
  moving: ['junk-removal', 'handyman'],
  'junk-removal': ['moving', 'handyman'],
  handyman: ['moving', 'junk-removal'],
  'house-cleaning': ['carpet-cleaning'],
  'carpet-cleaning': ['house-cleaning'],
  'pet-sitting': ['grooming'],
  grooming: ['pet-sitting'],
}

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

/** Request-only example copy. Location is shown separately as muted meta, never in `q`. */
const EXAMPLE_BY_CATEGORY: Record<string, string[]> = {
  'house-cleaning': ['Weekly house cleaner', 'Move-out house cleaning'],
  'carpet-cleaning': ['Living room carpet clean', 'Carpet cleaning after kids'],
  'auto-detailing': ['Interior car detail', 'Exterior wash before a trip'],
  'junk-removal': ['Haul away garage clutter', 'Junk removal this weekend'],
  'pet-sitting': ['Dog walker this week', 'Cat drop-in while away'],
  grooming: ['Dog bath and brush', 'Pet grooming at home'],
  moving: ['Help moving a couch', 'Moving help this weekend'],
  handyman: ['Assemble a bookshelf', 'Mount a TV'],
  other: ['Help with an everyday task', 'Local help'],
}

/**
 * Strip trailing location phrases from a describe query for heading / matching logic.
 * Does not change what the user typed in the field; callers keep the raw value in `q`.
 * Recognizes: "in your area", "near me", "nearby", "in <5-digit zip>".
 */
export function stripTrailingLocationPhrase(query: string): {
  requestText: string
  extractedZip: string | null
} {
  const raw = String(query ?? '').trim()
  if (!raw) return { requestText: '', extractedZip: null }

  const zipMatch = raw.match(/\s+in\s+(\d{5})\s*$/i)
  if (zipMatch) {
    return {
      requestText: raw.slice(0, zipMatch.index).trim(),
      extractedZip: zipMatch[1],
    }
  }

  const phraseMatch = raw.match(/\s+(?:in your area|near me|nearby)\s*$/i)
  if (phraseMatch) {
    return {
      requestText: raw.slice(0, phraseMatch.index).trim(),
      extractedZip: null,
    }
  }

  return { requestText: raw, extractedZip: null }
}

/** Prefer the ZIP field; fall back to a ZIP typed at the end of `q`. */
export function resolveDescribeZip(zipField: string, query: string): string {
  const fromField = String(zipField ?? '')
    .replace(/\D/g, '')
    .slice(0, 5)
  if (fromField.length === 5) return fromField
  const { extractedZip } = stripTrailingLocationPhrase(query)
  return extractedZip || ''
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
  if (re.test(haystack)) return true

  // Stem the last token so "house clean" matches "house cleaner" / "house cleaning".
  // Only for multi-word clean* stems (avoids bare "clean" stealing carpet queries).
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return false
  const last = parts[parts.length - 1]
  if (!last.startsWith('clean') || last.length > 8) return false
  const head = parts.slice(0, -1).map(escapeRegExp).join('\\s+')
  const stemRe = new RegExp(
    `(?:^|[^a-z0-9])${head}\\s+clean[a-z]{0,6}(?:[^a-z0-9]|$)`,
    'i',
  )
  return stemRe.test(haystack)
}

/** Extra ranking so house clean* beats carpet-cleaning; carpet/rug clean* stays carpet. */
function applyCleaningStemBoosts(normalized: string, scores: Map<string, number>) {
  const hasHouseClean = /\b(?:house|home)\s+clean[a-z]*/i.test(normalized)
  const hasCarpetOrRug = /\b(?:carpet|rugs?)\b/i.test(normalized)
  const hasCarpetClean =
    /\b(?:carpet|rugs?)\s+clean[a-z]*/i.test(normalized) ||
    /\bclean[a-z]*\s+(?:the\s+)?(?:carpet|rugs?)\b/i.test(normalized) ||
    /\bcarpet\s+steam\s+clean/i.test(normalized) ||
    /\bsteam\s+clean(?:ing)?\s+(?:the\s+)?(?:carpet|rugs?)\b/i.test(normalized)

  if (hasHouseClean && !hasCarpetOrRug) {
    scores.set('house-cleaning', (scores.get('house-cleaning') ?? 0) + 30)
    // Do not let a weak carpet residual outrank house clean* on a tiebreak.
    if ((scores.get('carpet-cleaning') ?? 0) > 0) {
      scores.set(
        'carpet-cleaning',
        Math.min(scores.get('carpet-cleaning') ?? 0, (scores.get('house-cleaning') ?? 0) - 1),
      )
    }
  }
  if (hasCarpetClean || (hasCarpetOrRug && /\bclean/i.test(normalized))) {
    scores.set('carpet-cleaning', (scores.get('carpet-cleaning') ?? 0) + 30)
  }
}

function labelForCategoryId(id: string): string {
  return formatCategoryLabel(id)
}

function descriptionForCategoryId(id: string): string {
  return CATEGORY_DESCRIPTIONS[id] || 'Local help nearby'
}

function parentForCategoryId(id: string): BrowseParentId | null {
  if (isServiceCategoryId(id)) return parentIdForService(id)
  if (id === 'moving') return 'junk-removal'
  if (id === 'cleaning') return 'home'
  if (id === 'petcare') return 'pets'
  if (isBrowseParentId(id)) return id
  return null
}

function toMatchedCategory(id: string, score: number): MatchedCategory {
  return {
    id,
    label: labelForCategoryId(id),
    parentId: parentForCategoryId(id),
    score,
    description: descriptionForCategoryId(id),
  }
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

  applyCleaningStemBoosts(normalized, scores)

  return [...scores.entries()]
    .map(([id, score]) => toMatchedCategory(id, score))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
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

function exampleLocationMeta(zip: string, city: string): string {
  const zipDigits = String(zip ?? '')
    .replace(/\D/g, '')
    .slice(0, 5)
  if (zipDigits.length === 5) return `in ${zipDigits}`
  const cityLabel = String(city ?? '').trim()
  if (cityLabel) return `in ${cityLabel}`
  return 'in your area'
}

function buildExamples(
  categoryId: string | null,
  zip: string,
  city: string,
): ExampleRequest[] {
  const templates =
    (categoryId && EXAMPLE_BY_CATEGORY[categoryId]) ||
    EXAMPLE_BY_CATEGORY.other
  const locationMeta = exampleLocationMeta(zip, city)
  return templates.map((text) => ({ text, locationMeta }))
}

function fillRelated(
  category: MatchedCategory,
  related: MatchedCategory[],
  maxRelated: number,
): MatchedCategory[] {
  const out = [...related]
  const seen = new Set<string>([category.id, ...out.map((r) => r.id)])

  const neighbors = RELATED_NEIGHBORS[category.id] || []
  for (const id of neighbors) {
    if (out.length >= maxRelated) break
    if (seen.has(id)) continue
    seen.add(id)
    out.push(toMatchedCategory(id, 1))
  }

  if (out.length < maxRelated && category.parentId) {
    const parent = getBrowseParent(category.parentId)
    for (const sid of parent.serviceIds) {
      if (out.length >= maxRelated) break
      if (seen.has(sid)) continue
      seen.add(sid)
      out.push(toMatchedCategory(sid, 1))
    }
  }

  return out.slice(0, maxRelated)
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
  // Intent cues (e.g. "Find jobs near me") use the full typed query.
  const normalizedForIntent = normalizeQuery(query)
  // Category scoring strips trailing location phrases so "… in your area" does not pollute matches.
  const { requestText } = stripTrailingLocationPhrase(query)
  const normalized = normalizeQuery(requestText)
  const ranked = normalized ? scoreCategories(normalized) : []
  const category = ranked[0] ?? null
  // Up to 3 total in the dropdown: best match + up to 2 related.
  let related = ranked.slice(1, 3)
  if (category) {
    related = fillRelated(category, related, 2)
  }

  let intent: MatchIntent
  let ambiguous = false
  if (options.intentOverride === 'helpers' || options.intentOverride === 'jobs') {
    intent = options.intentOverride
  } else {
    const resolved = resolveIntent(normalizedForIntent, options.roleHint ?? null)
    intent = resolved.intent
    ambiguous = resolved.ambiguous
  }

  const resolvedZip = resolveDescribeZip(options.zip ?? '', query)

  return {
    intent,
    ambiguous,
    category,
    related,
    exampleRequests: buildExamples(
      category?.id ?? null,
      resolvedZip || options.zip || '',
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

/** Intent labels for results switch (and unit tests). */
export function formatIntentChip(input: {
  intent: MatchIntent
  categoryLabel: string | null
  zip: string
}): { understood: string; toggleLabel: string } {
  const zip = input.zip || 'you'
  const near = input.zip ? `near ${zip}` : 'near you'
  if (input.intent === 'jobs') {
    return {
      understood: `Showing jobs ${near}`,
      toggleLabel: 'Looking for helpers instead?',
    }
  }
  return {
    understood: `Showing helpers ${near}`,
    toggleLabel: 'Looking for work instead?',
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

/**
 * Plural helper noun for empty states: "house cleaners", "carpet cleaners", "movers".
 * Never uses em/en dashes.
 */
export function formatHelpersEmptyNoun(
  categoryLabel: string | null,
  categoryId: string | null = null,
): string {
  const id = categoryId || ''
  const lower = (categoryLabel || '').toLowerCase()
  if (id === 'house-cleaning' || lower === 'house cleaning') return 'house cleaners'
  if (id === 'carpet-cleaning' || lower === 'carpet cleaning') return 'carpet cleaners'
  if (id === 'auto-detailing' || lower === 'auto detailing') return 'auto detailers'
  if (id === 'junk-removal' || lower === 'junk removal') return 'junk removal helpers'
  if (id === 'pet-sitting' || lower === 'pet sitting') return 'pet sitters'
  if (id === 'grooming' || lower === 'grooming') return 'groomers'
  if (id === 'moving' || lower === 'moving & lifting' || lower === 'moving') return 'movers'
  if (id === 'handyman' || lower.includes('handyman')) return 'handyman helpers'
  if (lower.includes('cleaning')) {
    const base = lower.replace(/\s*cleaning\s*$/i, '').trim()
    return base ? `${base} cleaners` : 'cleaners'
  }
  if (lower) return `${lower} helpers`
  return 'helpers'
}

/** Soft display label for chips (House Cleaning → House cleaning). */
export function softCategoryLabel(label: string): string {
  if (!label) return label
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
}

/** Jobs empty-state category phrase: "house cleaning", "moving". */
export function formatJobsEmptyCategory(
  categoryLabel: string | null,
  categoryId: string | null = null,
): string {
  if (categoryId === 'moving' || (categoryLabel || '').toLowerCase().includes('moving')) {
    return 'moving'
  }
  if (categoryLabel) return categoryLabel.toLowerCase()
  return ''
}

export type { ServiceCategoryId, LegacyCategoryId, BrowseParentId }
