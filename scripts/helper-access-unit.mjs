#!/usr/bin/env node
/**
 * Unit checks for helper profile editor access helpers.
 * Mirrors src/lib/helperAccess.ts + asserts call sites without Next path aliases.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function isHelperPerson(person) {
  if (!person) return false
  return Boolean(
    person.isHelper ||
      person.accountRole === 'helper' ||
      (person.skills?.length ?? 0) > 0,
  )
}

function canAccessHelperProfileEditor(person, verification) {
  if (isHelperPerson(person)) return true
  return verification?.status === 'approved'
}

function becomeHelperHref(input) {
  if (!input.signedIn) {
    return '/auth?mode=signup&next=%2Fonboarding%2Fhelper'
  }
  if (isHelperPerson(input.person)) return '/onboarding/helper'
  return '/verify'
}

const neighbor = { isHelper: false, accountRole: 'customer', skills: [] }
const helperPublished = {
  isHelper: true,
  accountRole: 'helper',
  skills: ['junk-removal'],
}
const helperRoleSetup = { isHelper: false, accountRole: 'helper', skills: [] }
const legacySkillsOnly = { isHelper: false, accountRole: null, skills: ['grooming'] }

assert.equal(canAccessHelperProfileEditor(neighbor, null), false)
assert.equal(canAccessHelperProfileEditor(neighbor, { status: 'unverified' }), false)
assert.equal(canAccessHelperProfileEditor(neighbor, { status: 'pending' }), false)
assert.equal(canAccessHelperProfileEditor(neighbor, { status: 'approved' }), true)

assert.equal(canAccessHelperProfileEditor(helperPublished, null), true)
assert.equal(canAccessHelperProfileEditor(helperPublished, { status: 'unverified' }), true)
assert.equal(canAccessHelperProfileEditor(helperRoleSetup, null), true)
assert.equal(canAccessHelperProfileEditor(legacySkillsOnly, null), true)

assert.equal(
  becomeHelperHref({ signedIn: false, person: neighbor }),
  '/auth?mode=signup&next=%2Fonboarding%2Fhelper',
)
assert.equal(becomeHelperHref({ signedIn: true, person: neighbor }), '/verify')
assert.equal(becomeHelperHref({ signedIn: true, person: helperPublished }), '/onboarding/helper')
assert.equal(becomeHelperHref({ signedIn: true, person: helperRoleSetup }), '/onboarding/helper')

const accessSrc = readFileSync(join(root, 'src/lib/helperAccess.ts'), 'utf8')
assert.match(accessSrc, /export function canAccessHelperProfileEditor/)
assert.match(accessSrc, /export function becomeHelperHref/)
assert.match(accessSrc, /verification\?\.status === 'approved'/)
assert.match(accessSrc, /\/verify/)

const serverSrc = readFileSync(join(root, 'src/lib/helperAccess.server.ts'), 'utf8')
assert.match(serverSrc, /enforceHelperProfileEditorAccess/)
assert.match(serverSrc, /redirect\('\/verify'\)/)

const pageSrc = readFileSync(join(root, 'app/(app)/onboarding/helper/page.tsx'), 'utf8')
assert.match(pageSrc, /enforceHelperProfileEditorAccess/)

const onboardingSrc = readFileSync(join(root, 'src/screens/HelperOnboarding.tsx'), 'utf8')
assert.match(onboardingSrc, /canAccessHelperProfileEditor/)
assert.match(onboardingSrc, /router\.replace\('\/verify'\)/)

const navSrc = readFileSync(join(root, 'src/components/landing/LandingNav.tsx'), 'utf8')
assert.match(navSrc, /becomeHelperHref/)

const profileSrc = readFileSync(join(root, 'src/components/profile/HelperProfileBody.tsx'), 'utf8')
assert.doesNotMatch(profileSrc, /you-become-helper/)
assert.doesNotMatch(profileSrc, /Set your skills, service area, and rate/)

const emptySrc = readFileSync(join(root, 'src/components/browse/BrowseFreshEmpty.tsx'), 'utf8')
assert.match(emptySrc, /href="\/verify"/)

const browseSrc = readFileSync(join(root, 'src/screens/Browse.tsx'), 'utf8')
assert.match(browseSrc, /postHref="\/verify"/)

console.log('helper-access-unit PASS')
