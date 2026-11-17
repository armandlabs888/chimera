#!/usr/bin/env node
/**
 * Screenshots + layout asserts for Helpers tab rate under meta.
 * Saves to /opt/cursor/artifacts/
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'

mkdirSync(OUT, { recursive: true })

async function assertRateLayout(page) {
  const metrics = await page.evaluate(() => {
    const row = document.querySelector('[data-testid="browse-helper-row"]')
    if (!row) return null
    const rate = row.querySelector('.browse-hc-helper-rate')
    const meta = row.querySelector('.browse-hc-helper-meta')
    const btn = row.querySelector('[data-testid="browse-helper-view-profile"]')
    const copy = row.querySelector('.browse-hc-helper-copy')
    const side = row.querySelector('.browse-hc-helper-side')
    if (!rate || !meta || !btn || !copy || !side) return { missing: true }

    const rateRect = rate.getBoundingClientRect()
    const metaRect = meta.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    const copyRect = copy.getBoundingClientRect()
    const sideRect = side.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    const cs = getComputedStyle(rate)

    return {
      rateText: rate.textContent?.trim() || '',
      rateFontSize: cs.fontSize,
      rateFontWeight: cs.fontWeight,
      rateColor: cs.color,
      rateTop: rateRect.top,
      metaBottom: metaRect.bottom,
      rateInCopy: copy.contains(rate),
      rateInSide: side.contains(rate),
      btnInSide: side.contains(btn),
      rateLeft: rateRect.left,
      btnLeft: btnRect.left,
      sideCenterY: sideRect.top + sideRect.height / 2,
      rowCenterY: rowRect.top + rowRect.height / 2,
      btnCenterY: btnRect.top + btnRect.height / 2,
    }
  })

  assert.ok(metrics && !metrics.missing, 'helper row parts present')
  assert.equal(metrics.rateInCopy, true, 'rate lives in content column')
  assert.equal(metrics.rateInSide, false, 'rate not in side column')
  assert.equal(metrics.btnInSide, true, 'View profile stays in side')
  assert.ok(metrics.rateTop >= metrics.metaBottom - 1, 'rate below meta')
  assert.ok(metrics.btnLeft > metrics.rateLeft, 'button to the right of rate')
  assert.match(metrics.rateText, /^\$\d+(\/hr| Flat Fee)$/)
  const size = Number.parseFloat(metrics.rateFontSize)
  assert.ok(size >= 15.5 && size <= 17.5, `rate size ~16-17px, got ${metrics.rateFontSize}`)
  assert.ok(
    metrics.rateFontWeight === '700' || Number(metrics.rateFontWeight) >= 700,
    `rate weight 700, got ${metrics.rateFontWeight}`,
  )
  // rgb(7, 19, 48) === #071330
  assert.match(metrics.rateColor, /rgb\(\s*7,\s*19,\s*48\s*\)/)
  const btnOffset = Math.abs(metrics.btnCenterY - metrics.rowCenterY)
  assert.ok(btnOffset < 28, `button roughly vertically centered (offset ${btnOffset})`)
  return metrics
}

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log(`saved ${path}`)
}

const STORAGE_KEY = 'beam-demo-v1'

/** Neighbor role sees Helpers tab; default seed is a helper. */
async function seedNeighbor(page) {
  await page.goto(`${BASE}/browse?demo=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    state.people = (state.people || []).map((p) => {
      if (p.id !== me) return p
      return {
        ...p,
        accountRole: 'customer',
        isHelper: false,
        skills: [],
        onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
        safetyDisclaimerAcceptedAt:
          p.safetyDisclaimerAcceptedAt || new Date().toISOString(),
      }
    })
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  for (const { name, width, height } of [
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'mobile-390', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } })
    await seedNeighbor(page)
    await page.goto(`${BASE}/browse?demo=1&tab=people&radius=all`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForSelector('[data-testid="browse-helper-row"]', { timeout: 20000 })
    await page.waitForTimeout(600)
    const metrics = await assertRateLayout(page)
    console.log(name, JSON.stringify(metrics))
    await shot(page, `browse-helpers-rate-under-meta-${name}.png`)
    await page.close()
  }

  await browser.close()
  console.log('browse-helper-rate-layout-shots: OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
