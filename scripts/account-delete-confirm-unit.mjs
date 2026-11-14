#!/usr/bin/env node
/**
 * Unit check for account-deletion confirm-phrase validation.
 * Mirrors `@/lib/account/deleteConfirm` without a TS loader.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/lib/account/deleteConfirm.ts'), 'utf8')

assert.match(src, /ACCOUNT_DELETE_CONFIRM_PHRASE = 'I understand'/)
assert.match(src, /value\.trim\(\) === ACCOUNT_DELETE_CONFIRM_PHRASE/)

const ACCOUNT_DELETE_CONFIRM_PHRASE = 'I understand'

function isValidAccountDeleteConfirm(value) {
  return typeof value === 'string' && value.trim() === ACCOUNT_DELETE_CONFIRM_PHRASE
}

assert.equal(isValidAccountDeleteConfirm('I understand'), true)
assert.equal(isValidAccountDeleteConfirm('  I understand  '), true)
assert.equal(isValidAccountDeleteConfirm('i understand'), false)
assert.equal(isValidAccountDeleteConfirm('I Understand'), false)
assert.equal(isValidAccountDeleteConfirm('I understand.'), false)
assert.equal(isValidAccountDeleteConfirm(''), false)
assert.equal(isValidAccountDeleteConfirm(null), false)
assert.equal(isValidAccountDeleteConfirm(undefined), false)
assert.equal(isValidAccountDeleteConfirm({ confirm: 'I understand' }), false)

console.log('account-delete-confirm-unit: ok')
