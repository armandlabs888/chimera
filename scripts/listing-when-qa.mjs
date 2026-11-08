/**
 * [DEMO] Two-choice When form QA + save/reload for ASAP and scheduled.
 * No production listings.
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const ART = '/opt/cursor/artifacts'
mkdirSync(ART, { recursive: true })

async function fillBasics(page, title) {
  await page.locator('[data-testid="post-title"]').fill(title)
  await page.locator('[data-testid="post-details"]').fill(
    'Demo-only when-mode verification. Not a production listing.',
  )
}

async function main() {
  console.log('[DEMO] listing-when-qa starting')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('beam-mode', 'demo'))
  await page.goto(`${BASE}/post`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="post-when-section"]')

  const initial = await page.evaluate(() => {
    const text = document.body.innerText || ''
    return {
      asap: !!document.querySelector('[data-testid="post-when-asap"]'),
      scheduled: !!document.querySelector('[data-testid="post-when-scheduled"]'),
      todayChip: !!document.querySelector('[data-testid="post-when-today"]'),
      tomorrowChip: !!document.querySelector('[data-testid="post-when-tomorrow"]'),
      thisWeek: !!document.querySelector('[data-testid="post-when-this-week"]'),
      pick: !!document.querySelector('[data-testid="post-when-pick"]'),
      note: (document.querySelector('[data-testid="post-asap-note"]')?.textContent || '').trim(),
      timeWindow: !!document.querySelector('[data-testid="post-time-window"]'),
      pillSoup: (document.querySelectorAll('[data-testid="post-when-section"] button').length),
    }
  })
  assert.equal(initial.asap, true)
  assert.equal(initial.scheduled, true)
  assert.equal(initial.todayChip, false, 'no Today option')
  assert.equal(initial.tomorrowChip, false, 'no Tomorrow option')
  assert.equal(initial.thisWeek, false, 'no This week option')
  assert.equal(initial.pick, false, 'no Pick date & time chip')
  assert.equal(initial.note, 'Arrival time confirmed with your helper.')
  assert.equal(initial.timeWindow, false, 'ASAP hides clocks')
  assert.ok(initial.pillSoup <= 2, `exactly two mode buttons, got ${initial.pillSoup}`)

  await page.screenshot({ path: `${ART}/when-asap-desktop.png`, fullPage: false })

  // Switch to schedule — clocks appear; note hides
  await page.locator('[data-testid="post-when-scheduled"]').click()
  await page.waitForSelector('[data-testid="post-time-window"]')
  assert.equal(await page.locator('[data-testid="post-asap-note"]').count(), 0)
  assert.equal(await page.locator('[data-testid="post-scheduled-date"]').count(), 1)
  assert.equal(await page.locator('[data-testid="post-start-time"]').count(), 1)

  // Invalid: end before start
  const dateVal = await page.locator('[data-testid="post-scheduled-date"]').inputValue()
  assert.ok(dateVal, 'schedule defaults a date')
  await page.locator('[data-testid="post-start-time"]').fill('16:00')
  await page.locator('[data-testid="post-end-time"]').fill('15:00')
  await fillBasics(page, 'Demo schedule invalid end')
  await page.getByRole('button', { name: /^Post request$/i }).click()
  await page.waitForSelector('[data-testid="post-error"]')
  assert.match(
    (await page.locator('[data-testid="post-error"]').textContent()) || '',
    /End time must be after start/i,
  )

  // Valid schedule save
  await page.locator('[data-testid="post-start-time"]').fill('15:30')
  await page.locator('[data-testid="post-end-time"]').fill('17:00')
  await fillBasics(page, 'Demo schedule five thirty')
  await page.screenshot({ path: `${ART}/when-scheduled-desktop.png`, fullPage: false })
  await page.getByRole('button', { name: /^Post request$/i }).click()
  await page.waitForURL(/\/requests\//, { timeout: 10000 })
  await page.waitForSelector('[data-testid="request-detail-root"]')
  const scheduledDetail = await page.evaluate(() => document.body.innerText)
  assert.match(scheduledDetail, /Demo schedule five thirty/)
  assert.match(scheduledDetail, /3:30\s*PM/i)
  assert.doesNotMatch(scheduledDetail, /As soon as possible/)

  // Reload persistence
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="request-detail-root"]')
  assert.match(await page.evaluate(() => document.body.innerText), /3:30\s*PM/i)

  // ASAP save — no schedule clocks, exact note path
  await page.goto(`${BASE}/post`, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="post-when-asap"]').click()
  assert.equal(
    (await page.locator('[data-testid="post-asap-note"]').textContent())?.trim(),
    'Arrival time confirmed with your helper.',
  )
  // Stale schedule: switch scheduled→fill→asap must not leave time window visible
  await page.locator('[data-testid="post-when-scheduled"]').click()
  await page.locator('[data-testid="post-start-time"]').fill('10:00')
  await page.locator('[data-testid="post-when-asap"]').click()
  assert.equal(await page.locator('[data-testid="post-time-window"]').count(), 0)
  await fillBasics(page, 'Demo ASAP urgency')
  await page.getByRole('button', { name: /^Post request$/i }).click()
  await page.waitForURL(/\/requests\//, { timeout: 10000 })
  const asapText = await page.evaluate(() => document.body.innerText)
  assert.match(asapText, /Demo ASAP urgency/)
  assert.match(asapText, /As soon as possible/i)
  assert.doesNotMatch(asapText, /10:00|3:30\s*PM/i)

  await page.reload({ waitUntil: 'networkidle' })
  assert.match(await page.evaluate(() => document.body.innerText), /As soon as possible/i)

  // Mobile framed shots
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/post`, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="post-when-section"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${ART}/when-asap-mobile.png`, fullPage: false })
  await page.locator('[data-testid="post-when-scheduled"]').click()
  await page.waitForSelector('[data-testid="post-time-window"]')
  await page.locator('[data-testid="post-when-section"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${ART}/when-scheduled-mobile.png`, fullPage: false })

  // Photos / Details / no bell still present
  assert.equal(await page.locator('[data-testid="post-photos-section"]').count(), 1)
  assert.match(await page.evaluate(() => document.body.innerText), /Title\s*&\s*Details/i)
  assert.equal(await page.locator('[data-testid="notifications-bell"]').count(), 0)

  console.log('[DEMO] listing-when-qa: OK')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
