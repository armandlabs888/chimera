import type { Person } from '@/types'

/**
 * Helpers browse open jobs only — never peer helper marketplace discovery.
 *
 * - `accountRole === 'helper'` covers incomplete setup (before `isHelper`) and
 *   completed helper accounts.
 * - Customers (`accountRole === 'customer'`) keep helper discovery even if they
 *   later publish a helper profile (`isHelper`).
 * - Guests keep discovery.
 * - Demo/legacy signed-in helpers with `isHelper` and no customer role are
 *   treated as helper-facing so peer discovery stays closed.
 */
export function hidesPeerHelperDiscovery(
  person: Pick<Person, 'accountRole' | 'isHelper'>,
  isGuest: boolean,
): boolean {
  if (isGuest) return false
  if (person.accountRole === 'customer') return false
  if (person.accountRole === 'helper') return true
  return Boolean(person.isHelper)
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
