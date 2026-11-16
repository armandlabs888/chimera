#!/usr/bin/env node
/**
 * Help page screenshots for /help at 1440x900 and 390x844.
 * Captures FAQ open, contact form, contact success, feedback, feedback thanks,
 * footer link, and account menu item.
 */
import { mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/help-page'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage: false })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log('wrote', join(OUT, name))
}

async function openHelp(page, { width, height, isMobile }) {
  await page.setViewportSize({ width, height })
  await page.goto(`${BASE}/help?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByTestId('help-page').waitFor({ state: 'visible', timeout: 20000 })
  if (isMobile) {
    // leave as-is
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  for (const vp of [
    { name: '1440', width: 1440, height: 900, isMobile: false },
    { name: '390', width: 390, height: 844, isMobile: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    })
    const page = await context.newPage()

    // FAQ with an item open
    await openHelp(page, vp)
    await page.getByTestId('help-faq-item-n-post-zip').click()
    await page.getByTestId('help-faq-answer-n-post-zip').waitFor({ state: 'visible' })
    await page.getByTestId('help-faq').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await shot(page, `help-faq-open-${vp.name}.png`)

    // Contact form
    await page.getByTestId('help-contact-card').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await shot(page, `help-contact-form-${vp.name}.png`)

    // Contact success (mock API)
    await page.route('**/api/support/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })
    await page.getByTestId('help-contact-name').fill('Alex Neighbor')
    await page.getByTestId('help-contact-email').fill('alex@example.com')
    await page.getByTestId('help-contact-topic').selectOption('account_sign_in')
    await page.getByTestId('help-contact-message').fill('I need help signing in to my account.')
    await page.getByTestId('help-contact-submit').click()
    await page.getByTestId('help-contact-success').waitFor({ state: 'visible', timeout: 10000 })
    await page.getByTestId('help-contact-card').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await shot(page, `help-contact-success-${vp.name}.png`)
    await page.unroute('**/api/support/contact')

    // Feedback card (reload clean)
    await openHelp(page, vp)
    await page.getByTestId('help-feedback-card').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await shot(page, `help-feedback-card-${vp.name}.png`)

    // Feedback thanks
    await page.route('**/api/support/feedback', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })
    await page.getByTestId('help-feedback-face-5').click()
    await page.getByTestId('help-feedback-kind-idea').click()
    await page.getByTestId('help-feedback-message').fill('Love the ZIP based posting flow.')
    await page.getByTestId('help-feedback-submit').click()
    await page.getByTestId('help-feedback-success').waitFor({ state: 'visible', timeout: 10000 })
    await page.getByTestId('help-feedback-card').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await shot(page, `help-feedback-thanks-${vp.name}.png`)
    await page.unroute('**/api/support/feedback')

    // Footer link
    await page.locator('[data-testid="landing-footer"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    const helpFooter = page.locator('[data-testid="landing-footer"] a[href="/help"]')
    await helpFooter.waitFor({ state: 'visible' })
    await shot(page, `help-footer-link-${vp.name}.png`)

    // Account menu item
    await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle' })
    if (vp.isMobile) {
      await page.locator('button[aria-label="Menu"]').click()
      await page.getByTestId('account-menu-help').waitFor({ state: 'visible', timeout: 15000 })
      await page.getByTestId('account-menu-help').scrollIntoViewIfNeeded()
      await page.waitForTimeout(200)
      await shot(page, `help-account-menu-${vp.name}.png`)
    } else {
      await page.getByTestId('account-menu-trigger').click()
      await page.getByTestId('account-menu').waitFor({ state: 'visible' })
      await page.getByTestId('account-menu-help').waitFor({ state: 'visible' })
      await page.waitForTimeout(200)
      await shot(page, `help-account-menu-${vp.name}.png`)
    }

    await context.close()
  }

  await browser.close()
  console.log('help-page-shots: ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
