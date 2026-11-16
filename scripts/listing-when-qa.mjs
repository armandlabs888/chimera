/**
 * [DEMO] Two-step When form QA + save/reload for ASAP and scheduled.
 * No production listings.
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const ART = '/opt/cursor/artifacts'
mkdirSync(ART, { recursive: true })

async function goToReview(page, prompt) {
  await page.goto(`${BASE}/post?demo=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="post-describe-input"]')
  await page.locator('[data-testid="post-describe-input"]').fill(prompt)
  await page.locator('[data-testid="post-zip-change"]').click()
  await page.locator('[data-testid="post-zip"]').fill('95124')
  await page.locator('[data-testid="post-zip-resolved"]').waitFor({
    state: 'visible',
    timeout: 15000,
  })
  const continueBtn = page
    .locator('[data-testid="post-continue-mobile"], [data-testid="post-continue"]')
    .locator('visible=true')
    .first()
  await continueBtn.click()
  await page.waitForSelector('[data-testid="post-request-form"]', { timeout: 20000 })
}

async function openWhen(page) {
  const edit = page.locator('[data-testid="post-when-section-edit"]')
  if ((await page.locator('[data-testid="post-when-asap"]').count()) === 0) {
    await edit.click()
  }
  await page.waitForSelector('[data-testid="post-when-asap"]')
}

async function ensureTitleDetails(page, title) {
  const titleInput = page.locator('[data-testid="post-title"]')
  if ((await titleInput.count()) === 0) {
    await page.locator('[data-testid="post-row-title-edit"]').click()
  }
  await page.locator('[data-testid="post-title"]').fill(title)
  if ((await page.locator('[data-testid="post-details"]').count()) === 0) {
    await page.locator('[data-testid="post-row-details-edit"]').click()
  }
  await page.locator('[data-testid="post-details"]').fill(
    'Demo-only when-mode verification. Not a production listing.',
  )
}

async function clickPost(page) {
  await page.getByRole('button', { name: /^Post task$/i }).first().click()
}

async function main() {
  console.log('[DEMO] listing-when-qa starting')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await goToReview(page, 'Need help with a demo task as soon as possible')
  await openWhen(page)

  const initial = await page.evaluate(() => {
    return {
      asap: !!document.querySelector('[data-testid="post-when-asap"]'),
      scheduled: !!document.querySelector('[data-testid="post-when-scheduled"]'),
      todayChip: !!document.querySelector('[data-testid="post-when-today"]'),
      tomorrowChip: !!document.querySelector('[data-testid="post-when-tomorrow"]'),
      thisWeek: !!document.querySelector('[data-testid="post-when-this-week"]'),
      pick: !!document.querySelector('[data-testid="post-when-pick"]'),
      endTime: !!document.querySelector('[data-testid="post-end-time"]'),
      urgentCheckbox: !!document.querySelector('[data-testid="post-needs-help-now-checkbox"]'),
      urgentLabel: (
        document.querySelector('[data-testid="post-needs-help-now"]')?.textContent || ''
      ).trim(),
      timeWindow: !!document.querySelector('[data-testid="post-time-window"]'),
      asapNote: !!document.querySelector('[data-testid="post-asap-note"]'),
      asapTitle: (document.querySelector('[data-testid="post-when-asap"]')?.textContent || '').trim(),
      scheduledTitle: (
        document.querySelector('[data-testid="post-when-scheduled"]')?.textContent || ''
      ).trim(),
    }
  })
  assert.equal(initial.asap, true)
  assert.equal(initial.scheduled, true)
  assert.equal(initial.todayChip, false, 'no Today option')
  assert.equal(initial.tomorrowChip, false, 'no Tomorrow option')
  assert.equal(initial.thisWeek, false, 'no This week option')
  assert.equal(initial.pick, false, 'no Pick date & time chip')
  assert.equal(initial.endTime, false, 'no end time field')
  assert.equal(initial.urgentCheckbox, false, 'no separate urgent checkbox')
  assert.match(initial.asapTitle, /ASAP/i)
  assert.match(initial.scheduledTitle, /Pick a time/i)
  assert.match(initial.urgentLabel, /urgent job alerts|As soon as possible/i)
  assert.equal(initial.asapNote, false, 'no ASAP arrival note box')
  assert.equal(initial.timeWindow, false, 'ASAP hides clocks')

  await page.locator('[data-testid="post-when-section"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${ART}/when-asap-desktop.png`, fullPage: false })

  await page.locator('[data-testid="post-when-scheduled"]').click()
  await page.waitForSelector('[data-testid="post-time-window"]')
  assert.equal(await page.locator('[data-testid="post-asap-note"]').count(), 0)
  assert.equal(await page.locator('[data-testid="post-scheduled-date"]').count(), 1)
  assert.equal(await page.locator('[data-testid="post-start-time"]').count(), 1)
  assert.equal(await page.locator('[data-testid="post-end-time"]').count(), 0)
  assert.equal(await page.locator('[data-testid="post-needs-help-now"]').count(), 0)

  const dateVal = await page.locator('[data-testid="post-scheduled-date"]').inputValue()
  assert.ok(dateVal, 'schedule defaults a date')
  await page.locator('[data-testid="post-start-time"]').fill('15:30')
  await ensureTitleDetails(page, 'Demo schedule five thirty')
  await page.locator('[data-testid="post-when-section"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${ART}/when-scheduled-desktop.png`, fullPage: false })
  await clickPost(page)
  await page.waitForURL(/\/requests\//, { timeout: 10000 })
  await page.waitForSelector('[data-testid="request-detail-root"]')
  const scheduledDetail = await page.evaluate(() => document.body.innerText)
  assert.match(scheduledDetail, /Demo schedule five thirty/)
  assert.match(scheduledDetail, /3:30\s*PM/i)
  assert.doesNotMatch(scheduledDetail, /As soon as possible/)

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="request-detail-root"]')
  assert.match(await page.evaluate(() => document.body.innerText), /3:30\s*PM/i)

  await goToReview(page, 'Need help with a demo ASAP task')
  await openWhen(page)
  await page.locator('[data-testid="post-when-asap"]').click()
  assert.equal(await page.locator('[data-testid="post-time-window"]').count(), 0)
  assert.equal(await page.locator('[data-testid="post-needs-help-now"]').count(), 1)
  await ensureTitleDetails(page, 'Demo ASAP urgency')
  await clickPost(page)
  await page.waitForURL(/\/requests\//, { timeout: 10000 })
  await page.waitForSelector('[data-testid="request-detail-root"]', { timeout: 10000 })
  const asapText = await page.evaluate(() => document.body.innerText)
  assert.match(asapText, /Demo ASAP urgency/)
  assert.match(asapText, /As soon as possible/i)

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="request-detail-root"]')
  assert.match(await page.evaluate(() => document.body.innerText), /As soon as possible/i)

  await page.setViewportSize({ width: 390, height: 844 })
  await goToReview(page, 'Mobile when screenshot task')
  await openWhen(page)
  // Mobile sticky Continue sits above the bottom dock; force was used in goToReview.
  await page.locator('[data-testid="post-when-section"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${ART}/when-asap-mobile.png`, fullPage: false })
  await page.locator('[data-testid="post-when-scheduled"]').click()
  await page.waitForSelector('[data-testid="post-time-window"]')
  await page.locator('[data-testid="post-when-section"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${ART}/when-scheduled-mobile.png`, fullPage: false })

  assert.equal(await page.locator('[data-testid="post-add-photos-link"]').count(), 1)
  assert.equal(await page.locator('[data-testid="notifications-bell"]').count(), 0)

  console.log('[DEMO] listing-when-qa: OK')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
