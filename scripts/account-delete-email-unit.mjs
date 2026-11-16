#!/usr/bin/env node
/**
 * Unit checks for account-deletion confirmation email content.
 * Asserts erase items, permanent warning, new-account CTA, and no em/en dashes.
 * Also writes a rendered HTML fixture for visual review.
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DASH_RE = /[—–]/

const {
  ACCOUNT_DELETED_AUTH_URL,
  ACCOUNT_DELETED_EMAIL_SUBJECT,
  buildAccountDeletedEmailHtml,
  buildAccountDeletedEmailText,
  formatAccountDeletedDate,
} = await import(join(root, 'src/lib/email/accountDeletedEmailContent.ts'))

const { ACCOUNT_DELETE_ERASE_ITEMS, ACCOUNT_DELETE_EMAIL_NOTE } = await import(
  join(root, 'src/lib/account/deleteAccountCopy.ts')
)

assert.equal(ACCOUNT_DELETED_EMAIL_SUBJECT, 'Your Bunk account has been deleted')
assert.equal(ACCOUNT_DELETED_AUTH_URL, 'https://www.yariapp.com/auth')
assert.doesNotMatch(ACCOUNT_DELETED_EMAIL_SUBJECT, DASH_RE)
assert.doesNotMatch(ACCOUNT_DELETE_EMAIL_NOTE, DASH_RE)
assert.ok(ACCOUNT_DELETE_ERASE_ITEMS.length >= 5)

const deletedAt = new Date('2026-11-16T20:00:00.000Z')
const when = formatAccountDeletedDate(deletedAt)
assert.match(when, /November/)
assert.match(when, /2026/)
assert.doesNotMatch(when, DASH_RE)

const input = {
  email: 'neighbor@example.com',
  firstName: 'Alex',
  deletedAt,
  eraseItems: ACCOUNT_DELETE_ERASE_ITEMS,
}

const text = buildAccountDeletedEmailText(input)
const html = buildAccountDeletedEmailHtml(input)

assert.match(text, /^Hi Alex,/)
assert.match(text, /neighbor@example\.com/)
assert.match(text, /was deleted on/)
assert.match(text, /This is permanent and cannot be undone\./)
assert.match(text, /To use Bunk again, create a new account/)
assert.match(text, new RegExp(escapeRegExp(ACCOUNT_DELETED_AUTH_URL)))
assert.match(text, /If you didn't request this, reply to this email\./)
assert.doesNotMatch(text, /Beam/)
assert.doesNotMatch(text, DASH_RE)

assert.match(html, /Hi Alex,/)
assert.match(html, /neighbor@example\.com/)
assert.match(html, /was deleted on/)
assert.match(html, /This is permanent and cannot be undone\./)
assert.match(html, /To use Bunk again, create a new account/)
assert.match(html, new RegExp(escapeRegExp(ACCOUNT_DELETED_AUTH_URL)))
assert.match(html, /Create a new account/)
assert.match(html, /If you didn't request this, reply to this email\./)
assert.match(html, /color:#071330/)
assert.match(html, /color:#1D5CE5/)
assert.match(html, />\s*Bunk\s*</)
assert.doesNotMatch(html, /Beam/)
assert.doesNotMatch(html, DASH_RE)

for (const item of ACCOUNT_DELETE_ERASE_ITEMS) {
  assert.match(text, new RegExp(escapeRegExp(item)))
  assert.match(html, new RegExp(escapeRegExp(item)))
}

const routeSrc = readFileSync(join(root, 'app/api/account/delete/route.ts'), 'utf8')
assert.match(routeSrc, /sendAccountDeletedEmail/)
assert.match(routeSrc, /awaitWithTimeout/)
assert.match(routeSrc, /recipientEmail/)

const sendSrc = readFileSync(join(root, 'src/lib/email/sendAccountDeletedEmail.ts'), 'utf8')
assert.match(sendSrc, /RESEND_API_KEY/)
assert.match(sendSrc, /EMAIL_FROM/)
assert.match(sendSrc, /Bunk <no-reply@joinbunk\.xyz>/)
assert.match(sendSrc, /import 'server-only'/)
assert.match(sendSrc, /ACCOUNT_DELETE_ERASE_ITEMS/)

const settingsSrc = readFileSync(join(root, 'src/screens/SettingsAccount.tsx'), 'utf8')
assert.match(settingsSrc, /ACCOUNT_DELETE_EMAIL_NOTE/)

const outDir = join(root, 'tmp')
mkdirSync(outDir, { recursive: true })
const htmlPath = join(outDir, 'account-deleted-email.html')
writeFileSync(htmlPath, html, 'utf8')

console.log(`account-delete-email-unit: ok (wrote ${htmlPath})`)

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
