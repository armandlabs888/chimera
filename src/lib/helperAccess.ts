import { isHelperPerson } from '@/lib/roles'
import type { HelperVerification, Person } from '@/types'

/**
 * Who may open the helper profile details editor (/onboarding/helper).
 * Existing helpers and helper-role signup accounts keep access.
 * Neighbors need an approved location verification before applying.
 */
export function canAccessHelperProfileEditor(
  person: Pick<Person, 'isHelper' | 'accountRole' | 'skills'> | null | undefined,
  verification: Pick<HelperVerification, 'status'> | null | undefined,
): boolean {
  if (isHelperPerson(person)) return true
  return verification?.status === 'approved'
}

/**
 * Header / marketing "Become a helper" destination.
 * Signed-out guests keep the signup → helper onboarding deep link.
 * Signed-in neighbors go to Get verified (not the helper editor).
 * Helpers (and helper-role accounts) keep the editor.
 */
export function becomeHelperHref(input: {
  signedIn: boolean
  person: Pick<Person, 'isHelper' | 'accountRole' | 'skills'> | null | undefined
}): string {
  if (!input.signedIn) {
    return '/auth?mode=signup&next=%2Fonboarding%2Fhelper'
  }
  if (isHelperPerson(input.person)) return '/onboarding/helper'
  return '/verify'
}
