#!/usr/bin/env node
/**
 * Cancel offer QA (demo mode): after a helper sends an offer from the Browse job
 * drawer, the primary CTA becomes "Cancel offer" (also after reopening), one click
 * withdraws it, and "Make an offer" returns.
 *
 * Run against a demo build: NEXT_PUBLIC_BEAM_DEMO_MODE=1 npm run build && npm start
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.ARTIFACT_DIR || 'artifacts/cancel-offer'
mkdirSync(OUT, { recursive: true })

async function openHelperJob(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="browse-job-row"]', { timeout: 20000 })
  const rows = page.locator('[data-testid="browse-job-row"]')
  const n = await rows.count()
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click()
    await page.waitForURL(/[?&]job=/)
    await page.waitForTimeout(150)
    if (
      (await page.locator('[data-testid="browse-make-offer"]').count()) ||
      (await page.locator('[data-testid="browse-cancel-offer"]').count())
    ) {
      return new URL(page.url()).searchParams.get('job')
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
  }
  throw new Error('No open job the demo user can offer on')
}

async function cancelStyle(page) {
  return page.locator('[data-testid="browse-cancel-offer"]').evaluate((el) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return {
      text: el.textContent.trim(),
      color: cs.color,
      bg: cs.backgroundColor,
      border: `${cs.borderTopWidth} ${cs.borderTopColor}`,
      radius: cs.borderRadius,
      height: r.height,
      width: r.width,
      font: `${cs.fontSize} ${cs.fontWeight}`,
    }
  })
}

async function run(viewport, label, sel) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 })
  const jobId = await openHelperJob(page)
  await page.waitForSelector(sel)

  // Send an offer if not already pending
  if (!(await page.locator('[data-testid="browse-cancel-offer"]').count())) {
    await page.locator('[data-testid="browse-make-offer"]').click()
    await page.waitForSelector('[data-testid="browse-drawer-offer"]')
    await page.fill('[data-testid="browse-offer-price"]', '25')
    await page.locator('[data-testid="browse-make-offer"]').click()
  }
  await page.waitForSelector('[data-testid="browse-cancel-offer"]')
  await page.waitForSelector('[data-testid="browse-offer-sent"]')
  assert.equal(await page.locator('[data-testid="browse-make-offer"]').count(), 0, 'make offer hidden')
  assert.equal(await page.locator('[data-testid="browse-ask-question"]').count(), 1, 'ask stays')

  await page.mouse.move(2, 2)
  await page.waitForTimeout(200)
  const s = await cancelStyle(page)
  console.log(label, s)
  assert.equal(s.text, 'Cancel offer')
  assert.equal(s.color, 'rgb(185, 28, 28)')
  assert.equal(s.bg, 'rgb(255, 255, 255)')
  // Spec is 1.5px; Chromium snaps computed border widths, so accept 1–1.5px.
  assert.match(s.border, /^1(\.5)?px rgb\(220, 38, 38\)$/)
  assert.equal(s.radius, '8px')
  assert.ok(Math.abs(s.height - 44) < 1, `height ${s.height}`)
  assert.equal(s.font, '14px 600')

  // Reopen the drawer later: pending offer still drives the footer
  await page.goto(`${BASE}/browse?demo=1&job=${jobId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="browse-cancel-offer"]')
  await page.waitForSelector('[data-testid="browse-offer-sent"]')
  await page.waitForTimeout(400)
  await page.locator('[data-testid="browse-cancel-offer"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${OUT}/${label}-offer-sent.png` })

  // Cancel → Make an offer returns, message goes away
  await page.locator('[data-testid="browse-cancel-offer"]').click()
  await page.waitForSelector('[data-testid="browse-make-offer"]')
  assert.equal(await page.locator('[data-testid="browse-cancel-offer"]').count(), 0)
  assert.equal(await page.locator('[data-testid="browse-offer-sent"]').count(), 0)
  assert.equal(
    (await page.locator('[data-testid="browse-make-offer"]').textContent()).trim(),
    'Make an offer',
  )
  await page.screenshot({ path: `${OUT}/${label}-after-cancel.png` })

  // Still withdrawn after reload
  await page.goto(`${BASE}/browse?demo=1&job=${jobId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="browse-make-offer"]')
  assert.equal(await page.locator('[data-testid="browse-cancel-offer"]').count(), 0)
  await browser.close()
  console.log(`ok ${label}`)
}

await run({ width: 1440, height: 900 }, 'desktop', '[data-testid="browse-job-drawer"]')
await run({ width: 390, height: 844 }, 'mobile', '[data-testid="browse-job-sheet"]')
console.log('cancel-offer QA passed')
