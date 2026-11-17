#!/usr/bin/env node
/**
 * Unit checks for support inbox email subject/prefix and EMAIL_FROM default.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DASH_RE = /[—–]/

const { buildSupportEmailSubject } = await import(
  join(root, 'src/lib/email/supportEmailContent.ts')
)

assert.equal(
  buildSupportEmailSubject('account_sign_in', 'I cannot sign in to my account today'),
  '[Bunk support] Account or sign in: I cannot sign in to my account today',
)
assert.equal(
  buildSupportEmailSubject('safety_concern', 'Someone made me uncomfortable on a job'),
  '[SAFETY] [Bunk support] Safety concern: Someone made me uncomfortable on a job',
)
assert.doesNotMatch(
  buildSupportEmailSubject('billing', 'Question about a charge'),
  DASH_RE,
)

const sendSrc = readFileSync(join(root, 'src/lib/email/sendAccountDeletedEmail.ts'), 'utf8')
assert.match(sendSrc, /Bunk <no-reply@joinbunk\.xyz>/)

const supportSend = readFileSync(join(root, 'src/lib/email/sendSupportEmail.ts'), 'utf8')
assert.match(supportSend, /Bunk <no-reply@joinbunk\.xyz>/)
assert.match(supportSend, /SUPPORT_INBOX_EMAIL/)
assert.match(supportSend, /replyTo/)

const { FAQ_ITEMS } = await import(join(root, 'src/lib/support/faq.ts'))
const faqUserCopy = FAQ_ITEMS.map((i) => `${i.question}\n${i.answer}`).join('\n')
assert.doesNotMatch(faqUserCopy, DASH_RE)
assert.match(faqUserCopy, /Get verified/)
assert.match(faqUserCopy, /one-time home location check/)
assert.match(faqUserCopy, /never shown/)
assert.match(faqUserCopy, /confirmation email/)
assert.doesNotMatch(faqUserCopy, /\bfee\b/i)
assert.doesNotMatch(faqUserCopy, /\bguarantee/i)

const footer = readFileSync(join(root, 'src/components/landing/LandingFooter.tsx'), 'utf8')
assert.match(footer, /Help and contact/)

const menu = readFileSync(join(root, 'src/components/account/AccountMenuLinks.tsx'), 'utf8')
assert.match(menu, /Help and feedback/)
assert.match(menu, /account-menu-help/)

const sitemap = readFileSync(join(root, 'app/sitemap.ts'), 'utf8')
assert.match(sitemap, /\/help/)

console.log('support-email-unit: ok')
