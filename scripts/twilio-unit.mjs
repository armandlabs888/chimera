#!/usr/bin/env node
/**
 * Unit checks for Twilio REST auth modes (Account SID+token vs API key) and
 * inbound signature URL / auth-token warning. Uses mocked fetch; never sends SMS.
 */
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DASH_RE = /[—–]/

const ENV_KEYS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_API_KEY_SID',
  'TWILIO_API_KEY_SECRET',
  'TWILIO_FROM_NUMBER',
  'TWILIO_MESSAGING_SERVICE_SID',
  'TWILIO_INBOUND_PUBLIC_URL',
]

const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]))

function clearTwilioEnv() {
  for (const k of ENV_KEYS) delete process.env[k]
}

function restoreTwilioEnv() {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
}

const {
  sendTwilioSms,
  twilioConfigured,
  twilioInboundPublicUrl,
  validateTwilioRequestSignature,
  toE164,
} = await import(join(root, 'src/lib/urgent/twilio.ts'))

const originalFetch = globalThis.fetch
/** @type {Array<{ url: string, init: RequestInit }>} */
const fetchCalls = []

function mockFetchOk(sid = 'SMtest123') {
  fetchCalls.length = 0
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url: String(url), init: init || {} })
    return {
      ok: true,
      status: 201,
      json: async () => ({ sid }),
    }
  }
}

function restoreFetch() {
  globalThis.fetch = originalFetch
}

try {
  // --- inbound public URL ---
  clearTwilioEnv()
  assert.equal(
    twilioInboundPublicUrl(),
    'https://www.joinbunk.xyz/api/twilio/inbound',
  )
  process.env.TWILIO_INBOUND_PUBLIC_URL =
    'https://preview.example/api/twilio/inbound'
  assert.equal(
    twilioInboundPublicUrl(),
    'https://preview.example/api/twilio/inbound',
  )
  delete process.env.TWILIO_INBOUND_PUBLIC_URL

  // --- twilioConfigured: auth token mode ---
  clearTwilioEnv()
  assert.equal(twilioConfigured(), false)
  process.env.TWILIO_ACCOUNT_SID = 'ACaccount'
  process.env.TWILIO_AUTH_TOKEN = 'auth_token_value'
  process.env.TWILIO_FROM_NUMBER = '+15555550100'
  assert.equal(twilioConfigured(), true)

  // --- twilioConfigured: API key mode (no auth token) ---
  clearTwilioEnv()
  process.env.TWILIO_ACCOUNT_SID = 'ACaccount'
  process.env.TWILIO_API_KEY_SID = 'SKapikey'
  process.env.TWILIO_API_KEY_SECRET = 'api_key_secret'
  process.env.TWILIO_FROM_NUMBER = '+15555550100'
  assert.equal(twilioConfigured(), true)

  // Incomplete API key pair falls back; without token still unconfigured
  clearTwilioEnv()
  process.env.TWILIO_ACCOUNT_SID = 'ACaccount'
  process.env.TWILIO_API_KEY_SID = 'SKapikey'
  process.env.TWILIO_FROM_NUMBER = '+15555550100'
  assert.equal(twilioConfigured(), false)

  // --- sendTwilioSms: Account SID + Auth Token Basic auth ---
  clearTwilioEnv()
  process.env.TWILIO_ACCOUNT_SID = 'ACaccount'
  process.env.TWILIO_AUTH_TOKEN = 'auth_token_value'
  process.env.TWILIO_FROM_NUMBER = '+15555550100'
  mockFetchOk('SMtoken')
  const tokenResult = await sendTwilioSms({ to: '+15555550999', body: 'hello token' })
  assert.equal(tokenResult.ok, true)
  assert.equal(tokenResult.sid, 'SMtoken')
  assert.equal(fetchCalls.length, 1)
  assert.equal(
    fetchCalls[0].url,
    'https://api.twilio.com/2010-04-01/Accounts/ACaccount/Messages.json',
  )
  const tokenAuth = fetchCalls[0].init.headers?.Authorization
  const expectedTokenAuth = `Basic ${Buffer.from('ACaccount:auth_token_value').toString('base64')}`
  assert.equal(tokenAuth, expectedTokenAuth)
  assert.match(String(fetchCalls[0].init.body), /To=%2B15555550999/)
  assert.match(String(fetchCalls[0].init.body), /Body=hello\+token/)

  // --- sendTwilioSms: API Key SID + secret (Account SID still in URL) ---
  clearTwilioEnv()
  process.env.TWILIO_ACCOUNT_SID = 'ACaccount'
  process.env.TWILIO_API_KEY_SID = 'SKapikey'
  process.env.TWILIO_API_KEY_SECRET = 'api_key_secret'
  process.env.TWILIO_AUTH_TOKEN = 'should_not_be_used_for_rest'
  process.env.TWILIO_FROM_NUMBER = '+15555550100'
  mockFetchOk('SMkey')
  const keyResult = await sendTwilioSms({ to: '+15555550999', body: 'hello key' })
  assert.equal(keyResult.ok, true)
  assert.equal(keyResult.sid, 'SMkey')
  assert.equal(fetchCalls.length, 1)
  assert.equal(
    fetchCalls[0].url,
    'https://api.twilio.com/2010-04-01/Accounts/ACaccount/Messages.json',
  )
  const keyAuth = fetchCalls[0].init.headers?.Authorization
  const expectedKeyAuth = `Basic ${Buffer.from('SKapikey:api_key_secret').toString('base64')}`
  assert.equal(keyAuth, expectedKeyAuth)
  assert.notEqual(keyAuth, expectedTokenAuth)

  // --- missing env skips without fetch ---
  clearTwilioEnv()
  mockFetchOk()
  const skipped = await sendTwilioSms({ to: '+15555550999', body: 'noop' })
  assert.equal(skipped.ok, true)
  assert.equal(skipped.skipped, true)
  assert.equal(fetchCalls.length, 0)

  // --- signature validation requires auth token; missing token warns + rejects ---
  clearTwilioEnv()
  process.env.TWILIO_API_KEY_SID = 'SKapikey'
  process.env.TWILIO_API_KEY_SECRET = 'api_key_secret'
  const warnCalls = []
  const originalWarn = console.warn
  console.warn = (...args) => {
    warnCalls.push(args.map(String).join(' '))
  }
  const rejected = validateTwilioRequestSignature({
    signatureHeader: 'anything',
    publicUrl: 'https://www.joinbunk.xyz/api/twilio/inbound',
    params: { Body: 'HELP' },
  })
  console.warn = originalWarn
  assert.equal(rejected, false)
  assert.ok(
    warnCalls.some((m) => m.includes('TWILIO_AUTH_TOKEN is missing')),
    'expected clear warning when auth token missing',
  )

  clearTwilioEnv()
  process.env.TWILIO_AUTH_TOKEN = 'webhook_auth_token'
  const publicUrl = 'https://www.joinbunk.xyz/api/twilio/inbound'
  const params = { Body: 'STOP', From: '+15555551212' }
  const sortedKeys = Object.keys(params).sort()
  let data = publicUrl
  for (const key of sortedKeys) data += key + params[key]
  const goodSig = createHmac('sha1', 'webhook_auth_token').update(data, 'utf8').digest('base64')
  assert.equal(
    validateTwilioRequestSignature({
      signatureHeader: goodSig,
      publicUrl,
      params,
    }),
    true,
  )
  assert.equal(
    validateTwilioRequestSignature({
      signatureHeader: 'bogus',
      publicUrl,
      params,
    }),
    false,
  )

  assert.equal(toE164('5555551212'), '+15555551212')
  assert.equal(toE164('+15555551212'), '+15555551212')

  // --- source / copy guards ---
  const twilioSrc = readFileSync(join(root, 'src/lib/urgent/twilio.ts'), 'utf8')
  assert.match(twilioSrc, /TWILIO_API_KEY_SID/)
  assert.match(twilioSrc, /TWILIO_API_KEY_SECRET/)
  assert.match(twilioSrc, /twilioInboundPublicUrl/)
  assert.match(twilioSrc, /joinbunk\.xyz\/api\/twilio\/inbound/)
  assert.doesNotMatch(twilioSrc, /yariapp\.com/)
  assert.doesNotMatch(twilioSrc, DASH_RE)

  const constantsSrc = readFileSync(join(root, 'src/lib/urgent/constants.ts'), 'utf8')
  assert.match(constantsSrc, /URGENT_JOB_PUBLIC_ORIGIN = 'https:\/\/www\.joinbunk\.xyz'/)
  assert.doesNotMatch(constantsSrc, /yariapp\.com/)

  const inboundSrc = readFileSync(join(root, 'app/api/twilio/inbound/route.ts'), 'utf8')
  assert.match(inboundSrc, /twilioInboundPublicUrl/)
  assert.match(inboundSrc, /joinbunk\.xyz\/api\/twilio\/inbound/)
  assert.doesNotMatch(inboundSrc, /yariapp\.com/)

  const envExample = readFileSync(join(root, '.env.example'), 'utf8')
  assert.match(envExample, /TWILIO_API_KEY_SID/)
  assert.match(envExample, /TWILIO_API_KEY_SECRET/)
  assert.match(envExample, /TWILIO_INBOUND_PUBLIC_URL/)
  assert.match(envExample, /joinbunk\.xyz\/api\/twilio\/inbound/)

  const sessionSrc = readFileSync(join(root, 'app/api/phone/session/route.ts'), 'utf8')
  assert.match(sessionSrc, /twilioConfigured/)
  assert.match(sessionSrc, /TWILIO_FROM_NUMBER/)

  console.log('twilio-unit: ok')
} finally {
  restoreFetch()
  restoreTwilioEnv()
}
