import type { AccountRole, Person } from '@/types'

function normalizeAccountRole(
  role: Person['accountRole'] | string | null | undefined,
): AccountRole | null {
  return role === 'customer' || role === 'helper' ? role : null
}

/**
 * Whether this account is treated as a helper for chrome and profile access.
 * Matches /you: published helpers, helper-role accounts, and legacy skill-only rows.
 */
export function isHelperPerson(
  person: Pick<Person, 'isHelper' | 'accountRole' | 'skills'> | null | undefined,
): boolean {
  if (!person) return false
  return Boolean(
    person.isHelper ||
      person.accountRole === 'helper' ||
      (person.skills?.length ?? 0) > 0,
  )
}

/**
 * Helpers browse open jobs only — never peer helper marketplace discovery.
 *
 * Source of truth is explicit `accountRole`:
 * - `customer` → keep discovery (even if they later publish `isHelper`)
 * - `helper` → jobs only (including unfinished setup before `isHelper`)
 * - Guests → discovery
 * - Missing/invalid `accountRole` → keep discovery so fresh/hydrating profiles
 *   never flash helper-only chrome or decorative radar gates tied to that chrome
 *
 * Legacy demo helpers must persist `accountRole: 'helper'` (seed/storage migrate).
 */
export function hidesPeerHelperDiscovery(
  person: Pick<Person, 'accountRole' | 'isHelper'>,
  isGuest: boolean,
): boolean {
  if (isGuest) return false
  const role = normalizeAccountRole(person.accountRole)
  if (role === 'customer') return false
  if (role === 'helper') return true
  return false
}

/** Strip helper-discovery query params so deep links normalize to the jobs feed. */
export function stripHelperDiscoveryParams(search: string | URLSearchParams): URLSearchParams {
  const params =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : new URLSearchParams(search.toString())
  params.delete('tab')
  params.delete('free')
  params.delete('avail')
  return params
}

export function browsePathWithoutHelperDiscovery(search = ''): string {
  const params = stripHelperDiscoveryParams(search)
  const qs = params.toString()
  return qs ? `/browse?${qs}` : '/browse'
}
