/**
 * Capture desktop + mobile screenshots for urgent job SMS UI (demo mode).
 * ASAP posts map to urgent / Text nearby helpers.
 */
import { chromium, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log('wrote', path)
}

async function continueToReview(page) {
  await page.getByTestId('post-describe-input').fill(
    'Need two people to move a sofa downstairs as soon as possible',
  )
  await page.getByTestId('post-zip-change').click()
  await page.getByTestId('post-zip').fill('95124')
  await page.getByTestId('post-zip-resolved').waitFor({ state: 'visible', timeout: 15000 })
  await page
    .locator('[data-testid="post-continue-mobile"], [data-testid="post-continue"]')
    .locator('visible=true')
    .first()
    .click()
  await page.waitForSelector('[data-testid="post-request-form"]', { timeout: 20000 })
}

async function capture(context, suffix) {
  const page = await context.newPage()
  await page.goto(`${BASE}/post?demo=1`, { waitUntil: 'networkidle' })
  await continueToReview(page)

  await page.getByTestId('post-when-section-edit').click()
  await page.getByTestId('post-when-asap').click()
  const urgent = page.getByTestId('post-needs-help-now')
  await urgent.waitFor({ state: 'visible', timeout: 20000 })
  await urgent.scrollIntoViewIfNeeded()
  await shot(page, `urgent-post-option-${suffix}.png`)

  if ((await page.getByTestId('post-title').count()) === 0) {
    await page.getByTestId('post-row-title-edit').click()
  }
  await page.getByTestId('post-title').fill('Urgent sofa move help')
  if ((await page.getByTestId('post-details').count()) === 0) {
    await page.getByTestId('post-row-details-edit').click()
  }
  await page
    .getByTestId('post-details')
    .fill(
      'Need two people to move a sofa downstairs this afternoon. Stairs and parking available.',
    )
  const submit = page.locator('form[data-testid="post-request-form"] button[type="submit"]').first()
  await submit.scrollIntoViewIfNeeded()
  await submit.click()
  await page.waitForURL(/\/requests\//, { timeout: 20000 })
  await page
    .getByTestId('urgent-texted-helpers')
    .or(page.getByTestId('urgent-texted-helpers-pending'))
    .waitFor({ state: 'visible', timeout: 15000 })
  await shot(page, `urgent-texted-helpers-${suffix}.png`)

  await page.goto(`${BASE}/you?tab=helper&demo=1`, { waitUntil: 'networkidle' })
  const sms = page.getByTestId('helper-sms-settings')
  await sms.waitFor({ state: 'visible', timeout: 20000 })
  await sms.scrollIntoViewIfNeeded()
  await shot(page, `helper-sms-settings-${suffix}.png`)
  await page.close()
}

const browser = await chromium.launch({ headless: true })
try {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })
  await capture(desktop, 'desktop')
  await desktop.close()

  const iPhone = devices['iPhone 13']
  const mobile = await browser.newContext({
    ...iPhone,
    deviceScaleFactor: 2,
  })
  await capture(mobile, 'mobile')
  await mobile.close()
} finally {
  await browser.close()
}

console.log('done')
