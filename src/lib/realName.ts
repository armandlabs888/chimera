/**
 * Shared real-name validation + normalization for onboarding.
 * Used by the Step 1 UI and the server save path.
 */

export const REAL_NAME_ERROR =
  'This is not a real name. Please enter your legal first and last name.'

const MAX_LEN = 40
const MIN_LETTERS = 2

/** Whole-token placeholder / alias blocklist (case-insensitive). */
const BLOCKLIST = new Set([
  'test',
  'testing',
  'user',
  'admin',
  'anonymous',
  'anon',
  'none',
  'na',
  'n/a',
  'unknown',
  'fake',
  'name',
  'first',
  'last',
  'firstname',
  'lastname',
  'asdf',
  'qwerty',
  'xxx',
  'abc',
  'guest',
  'nobody',
  'noname',
  'nickname',
  'mr',
  'mrs',
  'ms',
  'dr',
  'me',
  'myself',
  'helper',
  'neighbor',
  'housecall',
  'beam',
])

/** Obvious fake full names (normalized "first last"). */
const FAKE_FULL_NAMES = new Set([
  'john doe',
  'jane doe',
  'mickey mouse',
  'donald duck',
])

/** Keyboard-mash tokens rejected as the whole name or dominant part. */
const KEYBOARD_MASH = new Set([
  'asdf',
  'asdfg',
  'asdfgh',
  'asdfghjkl',
  'qwer',
  'qwert',
  'qwerty',
  'qwertyuiop',
  'zxcv',
  'zxcvb',
  'zxcvbn',
  'zxcvbnm',
  'jkl',
  'hjkl',
  'uiop',
  'fghj',
  'cvbn',
  'poiuy',
  'lkjh',
  'mnbv',
  'ajsk',
  'asdasd',
  'qweqwe',
  'abcabc',
])

const VOWELS = /[aeiouyAEIOUYáéíóúàèìòùäëïöüâêîôûÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛ]/u

/** Letters (Unicode), plus allowed separators between letters. */
const NAME_CHAR_RE =
  /^(?=.*\p{L})[\p{L}]+(?:[ '\u2019.\-][\p{L}]+)*\.?$/u

export type RealNameParts = {
  firstName: string
  lastName: string
  fullName: string
}

export type RealNameResult =
  | { ok: true; value: RealNameParts }
  | { ok: false; error: string }

/** Trim and collapse internal whitespace runs to a single space. */
export function collapseNameWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function letterCount(value: string): number {
  const m = value.match(/\p{L}/gu)
  return m ? m.length : 0
}

function hasDigitOrSymbolNoise(value: string): boolean {
  // Digits, emoji, @, _, URLs, and other disallowed symbols.
  if (/\d/.test(value)) return true
  if (/[@_#/$%^*=+~`|\\<>{}[\]()]/.test(value)) return true
  if (/https?:\/\//i.test(value) || /www\./i.test(value)) return true
  // Anything outside letters + allowed separators / spaces.
  if (/[^\p{L} '\u2019.\-]/u.test(value)) return true
  return false
}

function hasTripleRepeat(value: string): boolean {
  return /(.)\1\1/iu.test(value.replace(/[ '\u2019.\-]/gu, ''))
}

function isSingleLetterRepeated(value: string): boolean {
  const letters = (value.match(/\p{L}/gu) || []).map((c) => c.toLocaleLowerCase())
  if (letters.length < 2) return false
  return letters.every((c) => c === letters[0])
}

function lacksVowelsWhenLong(value: string): boolean {
  const letters = letterCount(value)
  if (letters <= 4) return false
  return !VOWELS.test(value)
}

function isKeyboardMash(value: string): boolean {
  const compact = value.toLowerCase().replace(/[ '\u2019.\-\s]/gu, '')
  if (!compact) return false
  if (KEYBOARD_MASH.has(compact)) return true
  // Dominant mash: token equals a mash entry.
  const tokens = value.toLowerCase().split(/[\s'\u2019.\-]+/).filter(Boolean)
  if (tokens.length === 0) return false
  const mashHits = tokens.filter((t) => KEYBOARD_MASH.has(t)).length
  if (mashHits > 0 && mashHits >= Math.ceil(tokens.length / 2)) return true
  return false
}

function isBlockedToken(value: string): boolean {
  const compact = value.toLowerCase().replace(/[.\s]/g, '')
  const spaced = value.toLowerCase().trim()
  if (BLOCKLIST.has(spaced) || BLOCKLIST.has(compact)) return true
  // "n/a" stored without slash after collapse may already be "na"
  if (spaced === 'n/a' || compact === 'na') return true
  return false
}

function isAllowedNamePart(value: string): boolean {
  if (!value) return false
  if (value.length > MAX_LEN) return false
  if (letterCount(value) < MIN_LETTERS) return false
  if (hasDigitOrSymbolNoise(value)) return false
  if (!NAME_CHAR_RE.test(value)) return false
  if (hasTripleRepeat(value)) return false
  if (isSingleLetterRepeated(value)) return false
  if (lacksVowelsWhenLong(value)) return false
  if (isKeyboardMash(value)) return false
  if (isBlockedToken(value)) return false
  return true
}

/**
 * Title-case a name part while preserving McX / MacX / O'X / hyphen segments.
 * Does not reject lowercase input; only used on successful save.
 */
export function normalizeNameCasing(part: string): string {
  const trimmed = collapseNameWhitespace(part)
  if (!trimmed) return ''

  const lowerSmall = new Set(['de', 'da', 'di', 'la', 'le', 'van', 'von', 'der', 'den'])

  function fixSegment(seg: string, index: number): string {
    if (!seg) return seg
    const lower = seg.toLocaleLowerCase()

    // O'Brien / O’Neill
    const oMatch = lower.match(/^(o)(['\u2019])(.+)$/i)
    if (oMatch) {
      return `O${oMatch[2]}${capitalizeWord(oMatch[3])}`
    }

    // McDonald / MacArthur (only when rest starts with a capitalizable letter)
    if (/^mc\p{L}/u.test(lower) && lower.length > 2) {
      return `Mc${capitalizeWord(lower.slice(2))}`
    }
    if (/^mac\p{L}/u.test(lower) && lower.length > 3 && !/^mack$/i.test(lower)) {
      return `Mac${capitalizeWord(lower.slice(3))}`
    }

    if (index > 0 && lowerSmall.has(lower)) {
      return lower
    }

    return capitalizeWord(lower)
  }

  function capitalizeWord(word: string): string {
    if (!word) return word
    // Preserve internal periods like "J.r" -> "J.R" handled by segment split below.
    return word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase()
  }

  // Split on spaces, then on hyphens within each space token.
  return trimmed
    .split(' ')
    .map((token, tokenIndex) =>
      token
        .split('-')
        .map((seg, segIndex) => {
          // Period-separated initials inside a segment: "j.r" -> "J.R"
          if (seg.includes('.')) {
            return seg
              .split('.')
              .map((bit, bitIndex) => {
                if (!bit) return bit
                return fixSegment(bit, tokenIndex + segIndex + bitIndex)
              })
              .join('.')
          }
          return fixSegment(seg, tokenIndex + segIndex)
        })
        .join('-'),
    )
    .join(' ')
}

/**
 * Validate and normalize first + last name.
 * Returns normalized casing on success; never rejects solely for lowercase.
 */
export function parseRealName(firstRaw: unknown, lastRaw: unknown): RealNameResult {
  if (typeof firstRaw !== 'string' || typeof lastRaw !== 'string') {
    return { ok: false, error: REAL_NAME_ERROR }
  }

  const firstName = collapseNameWhitespace(firstRaw)
  const lastName = collapseNameWhitespace(lastRaw)

  if (!firstName || !lastName) {
    return { ok: false, error: REAL_NAME_ERROR }
  }

  if (!isAllowedNamePart(firstName) || !isAllowedNamePart(lastName)) {
    return { ok: false, error: REAL_NAME_ERROR }
  }

  if (firstName.toLocaleLowerCase() === lastName.toLocaleLowerCase()) {
    return { ok: false, error: REAL_NAME_ERROR }
  }

  const fullKey = `${firstName} ${lastName}`.toLocaleLowerCase()
  if (FAKE_FULL_NAMES.has(fullKey)) {
    return { ok: false, error: REAL_NAME_ERROR }
  }

  const normalizedFirst = normalizeNameCasing(firstName)
  const normalizedLast = normalizeNameCasing(lastName)

  return {
    ok: true,
    value: {
      firstName: normalizedFirst,
      lastName: normalizedLast,
      fullName: `${normalizedFirst} ${normalizedLast}`,
    },
  }
}

/**
 * True when a stored/auth full name looks like a usable real first+last pair
 * for prefilling the onboarding form (without normalizing casing in the inputs).
 */
export function splitValidExistingName(fullRaw: string | null | undefined): {
  firstName: string
  lastName: string
} | null {
  if (!fullRaw || typeof fullRaw !== 'string') return null
  const collapsed = collapseNameWhitespace(fullRaw)
  if (!collapsed) return null

  // Ignore email-like seeds and single tokens.
  if (collapsed.includes('@')) return null
  const parts = collapsed.split(' ')
  if (parts.length < 2) return null

  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  const parsed = parseRealName(firstName, lastName)
  if (!parsed.ok) return null

  // Prefill with the user's existing spacing/casing (collapsed), not forced Title Case.
  return { firstName, lastName }
}
