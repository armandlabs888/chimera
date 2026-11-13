#!/usr/bin/env node
/**
 * Helper verification QA (demo mode):
 * - Unverified helpers see Get verified + notice; Ask a question stays; Make an offer hidden
 * - Pending helpers see Pending review (disabled); cannot open offer form
 * - Approved helpers keep Make an offer / Cancel offer
 * - /verify form shows privacy copy; pending confirmation screen works
 * - Staff admin queue lists pending helpers
 * - createOffer throws when unverified (API/context gate)
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
    /verify your address first/i,
  )
  assert.equal(await page.locator('[data-testid="browse-make-offer"]').count(), 0)
  assert.equal(await page.locator('[data-testid="browse-ask-question"]').count(), 1)
  const unverifiedCta = page.locator('[data-testid="browse-offer-gated"]')
  assert.equal((await unverifiedCta.innerText()).trim(), 'Get verified')
  await page.screenshot({ path: `${OUT}/desk-gate-unverified.png` })

  // Context/API gate: createOffer must reject when unverified
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
  assert.match(unverifiedGate.err, /verify your address first/i)

  // --- Pending gate ---
  await setVerification(page, 'pending')
  await page.goto(`${BASE}/browse?demo=1&job=${jobId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="offer-gate-notice"][data-gate="pending"]')
  assert.match(
    await page.locator('[data-testid="offer-gate-notice"]').innerText(),
    /reviewing your documents/i,
  )
  const pendingCta = page.locator('[data-testid="browse-offer-gated"]')
  assert.equal((await pendingCta.innerText()).trim(), 'Pending review')
  assert.equal(await pendingCta.isDisabled(), true)
  assert.equal(await page.locator('[data-testid="browse-make-offer"]').count(), 0)
  assert.equal(await page.locator('[data-testid="browse-ask-question"]').count(), 1)
  const pendingGate = await page.evaluate(async (rid) => {
    try {
      await window.__BEAM_CREATE_OFFER__({ requestId: rid, price: 25, note: 'test', eta: 'Flexible' })
      return { ok: false, err: 'succeeded' }
    } catch (e) {
      return { ok: true, err: String(e && e.message ? e.message : e) }
    }
  }, jobId)
  assert.equal(pendingGate.ok, true, pendingGate.err)
  assert.match(pendingGate.err, /reviewing your documents|once you're approved/i)
  await page.screenshot({ path: `${OUT}/desk-gate-pending.png` })

  // --- Needs resubmission ---
  await setVerification(page, 'needs_resubmission')
  await page.goto(`${BASE}/browse?demo=1&job=${jobId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="offer-gate-notice"][data-gate="needs_resubmission"]')
  assert.equal(
    (await page.locator('[data-testid="browse-offer-gated"]').innerText()).trim(),
    'Resubmit documents',
  )

  // --- Form + privacy ---
  await setVerification(page, 'unverified')
  await page.goto(`${BASE}/verify?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="verify-form"]')
  assert.match(await page.locator('h1').innerText(), /Get verified to offer on jobs/i)
  assert.match(await page.locator('[data-testid="verify-privacy"]').innerText(), /never sell your address/i)
  assert.match(
    await page.locator('[data-testid="verify-privacy"]').innerText(),
    /to complete this review/i,
  )
  await page.screenshot({ path: `${OUT}/desk-form.png`, fullPage: true })

  // Mobile form
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/verify?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="verify-form"]')
  await page.screenshot({ path: `${OUT}/mob-form.png`, fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })

  // --- Pending confirmation ---
  await setVerification(page, 'pending')
  await page.goto(`${BASE}/verify?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="verify-pending"]')
  assert.match(await page.locator('h1').innerText(), /Beam is reviewing your documents/i)
  assert.match(await page.locator('[data-testid="verify-pending-summary"]').innerText(), /Pending review/i)
  await page.screenshot({ path: `${OUT}/desk-pending.png` })

  // --- Declined / resubmit ---
  await setVerification(page, 'needs_resubmission')
  await page.goto(`${BASE}/verify?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="verify-resubmit"]')
  assert.match(await page.locator('[data-testid="verify-decline-banner"]').innerText(), /new submission/i)
  await page.screenshot({ path: `${OUT}/desk-declined.png`, fullPage: true })

  // --- Admin ---
  await page.goto(`${BASE}/admin/helper-reviews?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="helper-reviews-admin"]')
  assert.ok((await page.locator('[data-testid="helper-reviews-queue"] li').count()) >= 1)
  await page.waitForSelector('[data-testid="helper-review-approve"]')
  await page.screenshot({ path: `${OUT}/desk-admin.png` })

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

  await browser.close()
  console.log('helper-verification QA passed')
  console.log(`screenshots → ${OUT}`)
}

await run()
