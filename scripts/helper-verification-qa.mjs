#!/usr/bin/env node
/**
 * Helper location verification QA (demo mode):
 * - Unverified helpers see Get verified + location-check notice; Ask a question stays
 * - Approved helpers keep Make an offer
 * - /verify form shows privacy + confirm-you're-home (no bill upload)
 * - Not-at-home / try again banner
 * - Staff admin queue lists unverified helpers with location attempts (no bill preview)
 * - createOffer throws when unverified
 *
 * Run: NEXT_PUBLIC_BEAM_DEMO_MODE=1 npm run build && npm start
 *      node scripts/helper-verification-qa.mjs
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.ARTIFACT_DIR || 'artifacts/helper-verification'
mkdirSync(OUT, { recursive: true })

async function setVerification(page, status) {
  await page.evaluate((s) => {
    const fn = window.__BEAM_SET_DEMO_VERIFICATION__
    if (typeof fn !== 'function') throw new Error('Demo verification hook missing')
    fn(s)
  }, status)
  await page.waitForTimeout(200)
}

async function openOfferableJob(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="browse-job-row"]', { timeout: 20000 })
  const rows = page.locator('[data-testid="browse-job-row"]')
  const n = await rows.count()
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click()
    await page.waitForURL(/[?&]job=/)
    await page.waitForTimeout(120)
    const hasOffer =
      (await page.locator('[data-testid="browse-make-offer"]').count()) ||
      (await page.locator('[data-testid="browse-offer-gated"]').count()) ||
      (await page.locator('[data-testid="browse-cancel-offer"]').count())
    if (hasOffer) return new URL(page.url()).searchParams.get('job')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(120)
  }
  throw new Error('No open job the demo user can offer on')
}

async function run() {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })

  const jobId = await openOfferableJob(page)

  // --- Unverified gate ---
  await setVerification(page, 'unverified')
  await page.goto(`${BASE}/browse?demo=1&job=${jobId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="browse-job-drawer"]')
  await page.waitForSelector('[data-testid="offer-gate-notice"]')
  assert.equal(await page.locator('[data-testid="offer-gate-notice"]').getAttribute('data-gate'), 'unverified')
  assert.match(
    await page.locator('[data-testid="offer-gate-notice"]').innerText(),
    /confirm you're at your home address/i,
  )
  assert.doesNotMatch(await page.locator('[data-testid="offer-gate-notice"]').innerText(), /bill|documents/i)
  assert.equal(await page.locator('[data-testid="browse-make-offer"]').count(), 0)
  assert.equal(await page.locator('[data-testid="browse-ask-question"]').count(), 1)
  const unverifiedCta = page.locator('[data-testid="browse-offer-gated"]')
  assert.equal((await unverifiedCta.innerText()).trim(), 'Get verified')
  await page.screenshot({ path: `${OUT}/desk-gate-unverified.png` })

  const unverifiedGate = await page.evaluate(async (rid) => {
    const fn = window.__BEAM_CREATE_OFFER__
    if (typeof fn !== 'function') return { ok: false, err: 'missing createOffer hook' }
    try {
      await fn({ requestId: rid, price: 25, note: 'test', eta: 'Flexible' })
      return { ok: false, err: 'createOffer unexpectedly succeeded' }
    } catch (e) {
      return { ok: true, err: String(e && e.message ? e.message : e) }
    }
  }, jobId)
  assert.equal(unverifiedGate.ok, true, unverifiedGate.err)
  assert.match(unverifiedGate.err, /home address|Get verified|confirm you're at/i)

  // Legacy pending still gates offers but CTA is Get verified (not staff-wait chrome for helpers)
  await setVerification(page, 'pending')
  await page.goto(`${BASE}/browse?demo=1&job=${jobId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="offer-gate-notice"]')
  assert.equal((await page.locator('[data-testid="browse-offer-gated"]').innerText()).trim(), 'Get verified')
  assert.equal(await page.locator('[data-testid="browse-make-offer"]').count(), 0)
  assert.equal(await page.locator('[data-testid="browse-ask-question"]').count(), 1)

  // --- Form + privacy ---
  await setVerification(page, 'unverified')
  await page.goto(`${BASE}/verify?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="verify-form"]')
  assert.match(await page.locator('h1').innerText(), /Get verified to offer on jobs/i)
  assert.match(await page.locator('[data-testid="verify-privacy"]').innerText(), /never sell your address/i)
  assert.match(
    await page.locator('[data-testid="verify-privacy"]').innerText(),
    /confirm you're at this address/i,
  )
  assert.match(await page.locator('[data-testid="verify-privacy"]').innerText(), /How HouseCall uses this/i)
  assert.match(await page.locator('[data-testid="verify-loc-box"]').innerText(), /Be at this address/i)
  assert.equal(await page.locator('[data-testid="verify-file-dropzone"]').count(), 0)
  assert.equal(await page.locator('[data-testid="verify-file-input"]').count(), 0)
  assert.equal((await page.locator('[data-testid="verify-submit"]').innerText()).trim(), "Confirm you're home")
  assert.doesNotMatch(await page.locator('body').innerText(), /electricity|water bill|documents/i)
  await page.screenshot({ path: `${OUT}/desk-form.png`, fullPage: true })

  // Mobile form
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/verify?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="verify-form"]')
  await page.screenshot({ path: `${OUT}/mob-form.png`, fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })

  // --- Not at home / try again ---
  await page.evaluate(() => {
    window.__BEAM_SET_DEMO_VERIFICATION__({
      status: 'unverified',
      email: 'jordan.lee@email.com',
      street: '1842 Willow Street',
      city: 'San Jose',
      stateCode: 'CA',
      zip: '95125',
      lastCheckResult: 'not_at_home',
      lastDistanceM: 900,
      lastDeviceAccuracyM: 40,
    })
  })
  await page.goto(`${BASE}/verify?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="verify-not-home"]')
  assert.match(await page.locator('[data-testid="verify-not-home"]').innerText(), /not at this address/i)
  assert.equal((await page.locator('[data-testid="verify-submit"]').innerText()).trim(), 'Try again')
  await page.screenshot({ path: `${OUT}/desk-not-home.png`, fullPage: true })

  // --- Success ---
  await setVerification(page, 'approved')
  await page.goto(`${BASE}/verify?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="verify-approved"]')
  assert.match(await page.locator('h1').innerText(), /You're verified/i)
  assert.match(await page.locator('[data-testid="verify-approved-summary"]').innerText(), /Verified/i)
  await page.screenshot({ path: `${OUT}/desk-success.png` })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/verify?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="verify-approved"]')
  await page.screenshot({ path: `${OUT}/mob-success.png` })
  await page.setViewportSize({ width: 1440, height: 900 })

  // --- Admin: location attempts, no bill document UI ---
  await page.goto(`${BASE}/admin/helper-reviews?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="helper-reviews-admin"]')
  assert.ok((await page.locator('[data-testid="helper-reviews-queue"] li').count()) >= 1)
  await page.waitForSelector('[data-testid="helper-review-approve"]')
  assert.equal(await page.locator('[data-testid="helper-review-doc-sample"]').count(), 0)
  assert.equal(await page.locator('[data-testid="helper-review-doc-image"]').count(), 0)
  assert.equal(await page.locator('[data-testid="helper-review-open-document"]').count(), 0)
  const detailText = await page.locator('[data-testid="helper-review-detail"]').innerText()
  assert.match(detailText, /Last check result|Not at home|Weak GPS/i)
  assert.doesNotMatch(detailText, /electricity|water bill|Open document/i)
  await page.screenshot({ path: `${OUT}/desk-admin.png`, fullPage: true })

  // --- Approved restores Make an offer ---
  await setVerification(page, 'approved')
  await page.goto(`${BASE}/browse?demo=1&job=${jobId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="browse-make-offer"], [data-testid="browse-cancel-offer"]')
  assert.equal(await page.locator('[data-testid="browse-offer-gated"]').count(), 0)
  assert.equal(await page.locator('[data-testid="offer-gate-notice"]').count(), 0)
  const approvedOk = await page.evaluate(async (rid) => {
    try {
      await window.__BEAM_CREATE_OFFER__({
        requestId: rid,
        price: 28,
        note: 'Verified helper offer',
        eta: 'Flexible',
      })
      return { ok: true }
    } catch (e) {
      return { ok: false, err: String(e && e.message ? e.message : e) }
    }
  }, jobId)
  assert.equal(approvedOk.ok, true, approvedOk.err)
  await page.screenshot({ path: `${OUT}/desk-offer.png` })

  // Mobile gate
  await setVerification(page, 'unverified')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/browse?demo=1&job=${jobId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="offer-gate-notice"]')
  await page.screenshot({ path: `${OUT}/mob-gate.png` })

  await browser.close()
  console.log('helper-verification QA passed')
  console.log(`screenshots → ${OUT}`)
}

await run()
