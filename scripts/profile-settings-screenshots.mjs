#!/usr/bin/env node
/**
 * Page-only Playwright screenshots for Profile & Settings review.
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const outDir = process.env.SHOT_DIR || join('/opt/cursor/artifacts')
const base = process.env.BASE_URL || 'http://127.0.0.1:43123'

mkdirSync(outDir, { recursive: true })

async function shot(page, name) {
  const path = join(outDir, name)
  await page.screenshot({ path, fullPage: false })
  console.log('wrote', path)
}

async function setDemoVerification(page, status) {
  await page.evaluate((s) => {
    const fn = window.__BEAM_SET_DEMO_VERIFICATION__
    if (typeof fn !== 'function') throw new Error('Demo verification hook missing')
    fn(s)
  }, status)
  await page.waitForTimeout(200)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    const desk = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    })
    const deskPage = await desk.newPage()
    await deskPage.goto(`${base}/you`, { waitUntil: 'networkidle' })
    await deskPage.getByTestId('you-page').waitFor({ state: 'visible' })
    // Unapproved helper so Quick links include Get verified (seed starts approved).
    await setDemoVerification(deskPage, 'unverified')
    await deskPage.getByTestId('you-link-get-verified').waitFor({ state: 'visible' })
    await shot(deskPage, 'you-desk-requests.png')

    await deskPage.goto(`${base}/you?tab=helper`, { waitUntil: 'networkidle' })
    await deskPage.getByTestId('you-helper-section').waitFor({ state: 'visible' })
    await setDemoVerification(deskPage, 'unverified')
    await shot(deskPage, 'you-desk-helper.png')

    await deskPage.goto(`${base}/settings`, { waitUntil: 'networkidle' })
    await deskPage.getByTestId('settings-page').waitFor({ state: 'visible' })
    await shot(deskPage, 'settings-desk.png')

    await deskPage.getByTestId('settings-delete-open').click()
    await deskPage.getByTestId('settings-delete-modal').waitFor({ state: 'visible' })
    await deskPage.getByTestId('settings-delete-confirm-input').fill('I understand')
    await deskPage.waitForTimeout(150)
    await shot(deskPage, 'settings-modal-typed.png')
    await desk.close()

    const mob = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    })
    const mobPage = await mob.newPage()
    await mobPage.goto(`${base}/you`, { waitUntil: 'networkidle' })
    await mobPage.getByTestId('you-page').waitFor({ state: 'visible' })
    await setDemoVerification(mobPage, 'unverified')
    await shot(mobPage, 'you-mob.png')

    await mobPage.goto(`${base}/settings`, { waitUntil: 'networkidle' })
    await mobPage.getByTestId('settings-page').waitFor({ state: 'visible' })
    await shot(mobPage, 'settings-mob.png')
    await mob.close()
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
