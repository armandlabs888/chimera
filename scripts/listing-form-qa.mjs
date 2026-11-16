/**
 * Listing form regression for the two-step Post a task flow (demo mode).
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'

async function continueToReview(page) {
  const input = page.locator('[data-testid="post-describe-input"]')
  await input.fill('Need help carrying a queen mattress up 1 flight of stairs')
  await page
    .locator('[data-testid="post-continue-mobile"], [data-testid="post-continue"]')
    .locator('visible=true')
    .first()
    .click()
  await page.waitForSelector('[data-testid="post-request-form"]', { timeout: 20000 })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(`${BASE}/post?demo=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="post-describe-input"], form', { timeout: 15000 })

  const describe = await page.evaluate(() => {
    const text = document.body.innerText || ''
    return {
      step: /Step 1 of 2/.test(text),
      h1: /Post a task/.test(text),
      chips: !!document.querySelector('[data-testid="post-example-chips"]'),
      continue: [...document.querySelectorAll('button')].some((b) =>
        /^Continue$/i.test((b.textContent || '').trim()),
      ),
      draftAi: /Draft with AI/i.test(text),
      zipChange: !!document.querySelector('[data-testid="post-zip-change"]'),
      searchRadius: /Search radius/i.test(text),
      templates: /Use a template|Quick templates|Start from a template/i.test(text),
    }
  })
  assert.equal(describe.step, true)
  assert.equal(describe.h1, true)
  assert.equal(describe.chips, true)
  assert.equal(describe.continue, true)
  assert.equal(describe.draftAi, false)
  assert.equal(describe.zipChange, true)
  assert.equal(describe.searchRadius, false)
  assert.equal(describe.templates, false)

  await page.locator('[data-testid="post-zip-change"]').click()
  assert.equal(await page.locator('[data-testid="post-zip"]').count(), 1)

  await continueToReview(page)

  const post = await page.evaluate(() => {
    const text = document.body.innerText || ''
    return {
      step2: /Step 2 of 2/.test(text),
      review: /Review and post/.test(text),
      photosLink: !!document.querySelector('[data-testid="post-add-photos-link"]'),
      asap: !!document.querySelector('[data-testid="post-when-asap"]') || true,
      today: !!document.querySelector('[data-testid="post-when-today"]'),
      tomorrow: !!document.querySelector('[data-testid="post-when-tomorrow"]'),
      thisWeek: !!document.querySelector('[data-testid="post-when-this-week"]'),
      endTime: !!document.querySelector('[data-testid="post-end-time"]'),
      urgentCheckbox: !!document.querySelector('[data-testid="post-needs-help-now-checkbox"]'),
      titleDetails: /Title/.test(text) && /Details/.test(text),
    }
  })
  assert.equal(post.step2, true)
  assert.equal(post.review, true)
  assert.equal(post.photosLink, true)
  assert.equal(post.today, false)
  assert.equal(post.tomorrow, false)
  assert.equal(post.thisWeek, false)
  assert.equal(post.endTime, false)
  assert.equal(post.urgentCheckbox, false)
  assert.equal(post.titleDetails, true)

  await page.locator('[data-testid="post-add-photos-link"]').click()
  assert.equal(await page.locator('[data-testid="post-photos-section"]').count(), 1)
  assert.match(
    (await page.locator('[data-testid="post-photo-count"]').textContent()) || '',
    /0\/5/,
  )

  await page.locator('[data-testid="post-when-section-edit"]').click()
  assert.equal(await page.locator('[data-testid="post-when-asap"]').count(), 1)
  assert.equal(await page.locator('[data-testid="post-when-scheduled"]').count(), 1)
  await page.locator('[data-testid="post-when-scheduled"]').click()
  assert.equal(await page.locator('[data-testid="post-start-time"]').count(), 1)
  assert.equal(await page.locator('[data-testid="post-end-time"]').count(), 0)
  assert.equal(await page.locator('[data-testid="post-needs-help-now"]').count(), 0)

  await page.locator('[data-testid="post-when-asap"]').click()
  assert.equal(await page.locator('[data-testid="post-needs-help-now"]').count(), 1)

  await page.locator('[data-testid="post-price-section-edit"]').click()
  const price = await page.evaluate(() => {
    const section = document.querySelector('[data-testid="post-price-section"]')
    const text = section?.textContent || ''
    return {
      section: !!section,
      label: /Your price \(USD\)/.test(text),
      checkbox: !!document.querySelector('[data-testid="post-accepts-offers-checkbox"]'),
      checked: document.querySelector('[data-testid="post-accepts-offers-checkbox"]')?.checked === true,
      noSetBudget: !/Set a budget/i.test(document.body.innerText || ''),
    }
  })
  assert.equal(price.section, true)
  assert.equal(price.label, true)
  assert.equal(price.checkbox, true)
  assert.equal(price.checked, true, 'Open to offers checked by default')
  assert.equal(price.noSetBudget, true)

  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('[data-testid="notifications-bell"]').count(), 0)
  await page.waitForSelector('a[href^="/messages"]', { timeout: 15000 })

  console.log('listing-form-qa: OK')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
