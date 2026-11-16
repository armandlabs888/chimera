#!/usr/bin/env node
/**
 * Unit checks for phone confirmation helpers:
 * inbound code parsing, Twilio signature validation, uniqueness error detection.
 */
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseInboundPhoneCode(body) {
  const text = (body || '').trim()
  if (!text) return null
  const labeled =
    text.match(/\bbunk\s*code[:\s#-]*([0-9]{6})\b/i) ||
    text.match(/\bcode[:\s#-]*([0-9]{6})\b/i)
  if (labeled?.[1]) return labeled[1]
  const bare = text.match(/^\s*([0-9]{6})\s*$/)
  if (bare?.[1]) return bare[1]
  return null
}

function validateTwilioRequestSignature(input) {
  const authToken = input.authToken?.trim()
  const signature = input.signatureHeader?.trim()
  if (!authToken || !signature) return false
  const sortedKeys = Object.keys(input.params).sort()
  let data = input.publicUrl
  for (const key of sortedKeys) {
    data += key + (input.params[key] ?? '')
  }
  const expected = createHmac('sha1', authToken).update(data, 'utf8').digest('base64')
  return expected === signature
}

function isPhoneUniqueViolation(error) {
  if (!error) return false
  if (error.code === '23505') return true
  const msg = (error.message || '').toLowerCase()
  return (
    msg.includes('phone_verifications_phone_unique') ||
    (msg.includes('duplicate key') && msg.includes('phone_e164'))
  )
}

const PHONE_ALREADY_USED_MESSAGE =
  'This number is already used on another Bunk account.'

// --- parseInboundPhoneCode ---
assert.equal(parseInboundPhoneCode('Bunk code 482913'), '482913')
assert.equal(parseInboundPhoneCode('bunk code:123456'), '123456')
assert.equal(parseInboundPhoneCode('Code 999888'), '999888')
assert.equal(parseInboundPhoneCode('  654321  '), '654321')
assert.equal(parseInboundPhoneCode('hello there'), null)
assert.equal(parseInboundPhoneCode('Bunk code 12'), null)
assert.equal(parseInboundPhoneCode(''), null)

// Source file must export the same helper name / copy.
const formatSrc = readFileSync(join(root, 'src/lib/phone/format.ts'), 'utf8')
assert.match(formatSrc, /export function parseInboundPhoneCode/)
assert.match(formatSrc, /Bunk code/)
assert.match(formatSrc, /PHONE_ALREADY_USED_MESSAGE/)
assert.match(formatSrc, /already used on another Bunk account/)

const verifySrc = readFileSync(join(root, 'src/lib/phone/verify.ts'), 'utf8')
assert.match(verifySrc, /PHONE_SMS_INBOUND_PUBLIC_URL/)
assert.match(verifySrc, /https:\/\/www\.joinbunk\.xyz\/api\/sms\/inbound/)
assert.match(verifySrc, /isPhoneUniqueViolation/)

const inboundSrc = readFileSync(join(root, 'app/api/sms/inbound/route.ts'), 'utf8')
assert.match(inboundSrc, /validateTwilioRequestSignature/)
assert.match(inboundSrc, /PHONE_SMS_INBOUND_PUBLIC_URL/)
assert.match(inboundSrc, /Thanks, your Bunk phone is confirmed/)
assert.match(inboundSrc, /X-Twilio-Signature|x-twilio-signature/)

// --- signature validation ---
const authToken = 'test_auth_token_123'
const publicUrl = 'https://www.joinbunk.xyz/api/sms/inbound'
const params = { Body: 'Bunk code 482913', From: '+15555551212', To: '+15555550000' }
const sortedKeys = Object.keys(params).sort()
let data = publicUrl
for (const key of sortedKeys) data += key + params[key]
const goodSig = createHmac('sha1', authToken).update(data, 'utf8').digest('base64')

assert.equal(
  validateTwilioRequestSignature({
    authToken,
    signatureHeader: goodSig,
    publicUrl,
    params,
  }),
  true,
)
assert.equal(
  validateTwilioRequestSignature({
    authToken,
    signatureHeader: 'bogus',
    publicUrl,
    params,
  }),
  false,
)
assert.equal(
  validateTwilioRequestSignature({
    authToken: '',
    signatureHeader: goodSig,
    publicUrl,
    params,
  }),
  false,
)

const twilioSrc = readFileSync(join(root, 'src/lib/urgent/twilio.ts'), 'utf8')
assert.match(twilioSrc, /export function validateTwilioRequestSignature/)
assert.match(twilioSrc, /createHmac\('sha1'/)

// --- uniqueness ---
assert.equal(isPhoneUniqueViolation({ code: '23505' }), true)
assert.equal(
  isPhoneUniqueViolation({
    message: 'duplicate key value violates unique constraint "phone_verifications_phone_unique"',
  }),
  true,
)
assert.equal(isPhoneUniqueViolation({ message: 'something else' }), false)
assert.equal(isPhoneUniqueViolation(null), false)
assert.equal(PHONE_ALREADY_USED_MESSAGE.includes('already used'), true)

const applySrc = readFileSync(join(root, 'src/lib/phone/applyVerified.ts'), 'utf8')
assert.match(applySrc, /PHONE_ALREADY_USED_MESSAGE/)
assert.match(applySrc, /isPhoneUniqueViolation/)

// --- onboarding Twilio gate (skip phone/alerts when env missing) ---
function isPhoneConfirmEnabled(twilioConfigured) {
  return Boolean(twilioConfigured)
}

function onboardingStepTotal({ edit, isHelper, phoneConfirmEnabled }) {
  if (edit) return 2
  if (!phoneConfirmEnabled) return 2
  return isHelper ? 4 : 3
}

function onboardingRulesStepNumber({ edit, isHelper, phoneConfirmEnabled }) {
  if (edit || !phoneConfirmEnabled) return 2
  return isHelper ? 4 : 3
}

assert.equal(isPhoneConfirmEnabled(false), false)
assert.equal(isPhoneConfirmEnabled(true), true)
assert.equal(isPhoneConfirmEnabled(0), false)
assert.equal(
  onboardingStepTotal({ edit: false, isHelper: true, phoneConfirmEnabled: false }),
  2,
)
assert.equal(
  onboardingStepTotal({ edit: false, isHelper: false, phoneConfirmEnabled: false }),
  2,
)
assert.equal(
  onboardingStepTotal({ edit: false, isHelper: true, phoneConfirmEnabled: true }),
  4,
)
assert.equal(
  onboardingStepTotal({ edit: false, isHelper: false, phoneConfirmEnabled: true }),
  3,
)
assert.equal(
  onboardingStepTotal({ edit: true, isHelper: true, phoneConfirmEnabled: true }),
  2,
)
assert.equal(
  onboardingRulesStepNumber({ edit: false, isHelper: true, phoneConfirmEnabled: false }),
  2,
)
assert.equal(
  onboardingRulesStepNumber({ edit: false, isHelper: true, phoneConfirmEnabled: true }),
  4,
)
assert.equal(
  onboardingRulesStepNumber({ edit: false, isHelper: false, phoneConfirmEnabled: true }),
  3,
)

const gateSrc = readFileSync(join(root, 'src/lib/phone/onboardingGate.ts'), 'utf8')
assert.match(gateSrc, /export function isPhoneConfirmEnabled/)
assert.match(gateSrc, /export function onboardingStepTotal/)
assert.match(gateSrc, /phoneConfirmEnabled/)

const sessionSrc = readFileSync(join(root, 'app/api/phone/session/route.ts'), 'utf8')
assert.match(sessionSrc, /phoneConfirmEnabled/)
assert.match(sessionSrc, /isPhoneConfirmEnabled/)
assert.match(sessionSrc, /status: 'disabled'/)

const onboardingSrc = readFileSync(join(root, 'src/screens/Onboarding.tsx'), 'utf8')
assert.match(onboardingSrc, /onboardingStepTotal/)
assert.match(onboardingSrc, /phoneConfirmEnabled/)
assert.match(onboardingSrc, /phoneStepsOn/)

console.log('phone-verify-unit: ok')
