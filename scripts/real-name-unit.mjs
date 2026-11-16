#!/usr/bin/env node
/**
 * Unit tests for src/lib/realName.ts (Node strip-types import).
 */
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const modUrl = pathToFileURL(join(root, 'src/lib/realName.ts')).href
const {
  REAL_NAME_ERROR,
  collapseNameWhitespace,
  normalizeNameCasing,
  parseRealName,
  splitValidExistingName,
} = await import(modUrl)

assert.equal(collapseNameWhitespace('  Armand   Morales  '), 'Armand Morales')

assert.equal(normalizeNameCasing('armand'), 'Armand')
assert.equal(normalizeNameCasing("o'brien"), "O'Brien")
assert.equal(normalizeNameCasing('mcdonald'), 'McDonald')
assert.equal(normalizeNameCasing('jean-luc'), 'Jean-Luc')
assert.equal(normalizeNameCasing('mary anne'), 'Mary Anne')

function ok(first, last) {
  const r = parseRealName(first, last)
  assert.equal(r.ok, true, `expected ok for ${first} ${last}: ${r.error}`)
  return r.value
}

function bad(first, last) {
  const r = parseRealName(first, last)
  assert.equal(r.ok, false, `expected reject for ${first} ${last}`)
  assert.equal(r.error, REAL_NAME_ERROR)
}

const a = ok('armand', 'morales')
assert.equal(a.firstName, 'Armand')
assert.equal(a.lastName, 'Morales')
assert.equal(a.fullName, 'Armand Morales')

ok('Li', 'Ng')
ok('Wu', 'Ho')
ok('Anne-Marie', 'O’Connor')
ok('José', 'García')

bad('', 'Morales')
bad('Armand', '')
bad('A', 'Morales')
bad('Armand', 'X')
bad('Armand123', 'Morales')
bad('Armand', 'Morales!')
bad('Armand@', 'Morales')
bad('Armand_User', 'Morales')
bad('aaa', 'Morales')
bad('Armand', 'bbb')
bad('aaaa', 'Smith')
bad('Asdf', 'Qwer')
bad('asdf', 'qwerty')
bad('Test', 'User')
bad('John', 'Doe')
bad('Jane', 'Doe')
bad('Mickey', 'Mouse')
bad('Donald', 'Duck')
bad('Helper', 'Neighbor')
bad('Admin', 'Guest')
bad('Armand', 'Armand')
bad('xxx', 'Smith')
bad('a'.repeat(41), 'Smith')
bad('Smith', 'b'.repeat(41))
bad('Rrrrr', 'Smith') // single letter repeated
bad('Bcdfg', 'Smith') // no vowels, 5 letters
ok('Nguyen', 'Tran') // has vowels
ok('Lloyd', 'Smith')

// Stricter English-word / phrase rules
bad('Best', 'Seller')
bad('Cool', 'Guy')
bad('Big', 'Mike')
bad('Top', 'Rated')
bad('Handy', 'Man')
bad('Super', 'Star')
bad('Real', 'Deal')
bad('Test', 'User')
bad('asdf', 'qwer')
bad('John', 'Doe')

// Real people (including English-word given names that are genuine names)
ok('Maria', 'Lopez')
ok('Armand', 'Mercado')
ok('Grace', 'Hope')
ok('Will', 'Smith')
ok('Rose', 'Baker')
ok('Mark', 'Best')
ok('Li', 'Wu')
ok('Nguyen', 'Tran')
ok("Siobhan", "O'Neill")
ok('Jean-Luc', 'Picard')
ok('Aarav', 'Patel')
ok('Oluwaseun', 'Adeyemi')
ok('Ximena', 'Hernandez')

assert.equal(parseRealName(null, 'x').ok, false)
assert.equal(parseRealName('Armand', 1).ok, false)

const split = splitValidExistingName('Armand Morales')
assert.ok(split)
assert.equal(split.firstName, 'Armand')
assert.equal(split.lastName, 'Morales')

assert.equal(splitValidExistingName('neighbor'), null)
assert.equal(splitValidExistingName('test user'), null)
assert.equal(splitValidExistingName('armand@example.com'), null)
assert.equal(splitValidExistingName('Armand'), null)
assert.equal(splitValidExistingName('Best Seller'), null)

console.log('real-name-unit PASS')
