/**
 * Screenshots (1280x800 and 390x844) for onboarding phone + alerts steps:
 * default, waiting, verified, fallback, alerts (unverified helper note).
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'

mkdirSync(OUT, { recursive: true })

const STORAGE_KEY = 'beam-demo-v1'

async function seedUnverifiedHelper(page) {
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
    for (const p of state.people || []) {
      if (p.id !== me) continue
      p.accountRole = 'helper'
      p.isHelper = true
      p.onboardingCompletedAt = null
    }
    state.helperVerification = {
      ...(state.helperVerification || {}),
      id: state.helperVerification?.id || 'ver-you',
      profileId: me,
      status: 'unverified',
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
}

async function gotoOnboarding(page) {
  await page.goto(`${BASE}/onboarding?preview=1&demo=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page.getByTestId('onboarding-root').waitFor({ state: 'visible', timeout: 30000 })
}

async function fillWelcomeAsHelper(page) {
  await page.getByTestId('onboarding-role-helper').click()
  const first = page.getByTestId('onboarding-first-name')
  const last = page.getByTestId('onboarding-last-name')
  if (!(await first.inputValue())) await first.fill('Alex')
  if (!(await last.inputValue())) await last.fill('Helper')

  // Demo seed may already have a verified city (Change control instead of input).
  const cityInput = page.getByTestId('onboarding-city-input')
  if ((await cityInput.count()) > 0) {
    await cityInput.click()
    await cityInput.fill('San Jose, CA')
    const listbox = page.getByTestId('onboarding-city-listbox')
    await listbox.waitFor({ state: 'visible', timeout: 15000 })
    await listbox.locator('[role="option"]').first().click()
  } else {
    await page.getByTestId('onboarding-city-verified').waitFor({ state: 'visible', timeout: 10000 })
  }

  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-step-phone').waitFor({ state: 'visible', timeout: 20000 })
}

async function shot(page, name, width, height) {
  await page.setViewportSize({ width, height })
  // Settle layout after resize.
  await page.waitForTimeout(200)
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log('wrote', path)
  return path
}

async function capturePair(page, stem) {
  await shot(page, `${stem}-1280x800.png`, 1280, 800)
  await shot(page, `${stem}-390x844.png`, 390, 844)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // Force desktop UA first for QR default.
  await page.setExtraHTTPHeaders({})
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 })
  })

  await seedUnverifiedHelper(page)
  await gotoOnboarding(page)
  await fillWelcomeAsHelper(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByTestId('onboarding-phone-desktop').waitFor({ state: 'visible', timeout: 15000 })
  await capturePair(page, 'onboarding-phone-default')

  // Waiting
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByTestId('onboarding-phone-demo-wait').click()
  await page.getByTestId('onboarding-phone-waiting').waitFor({ state: 'visible', timeout: 10000 })
  await capturePair(page, 'onboarding-phone-waiting')

  // Verified (auto after simulate)
  await page.getByTestId('onboarding-phone-verified').waitFor({ state: 'visible', timeout: 10000 })
  await capturePair(page, 'onboarding-phone-verified')

  // Fallback: restart flow
  await seedUnverifiedHelper(page)
  await gotoOnboarding(page)
  await fillWelcomeAsHelper(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByTestId('onboarding-phone-cant-scan').click()
  await page.getByTestId('onboarding-phone-fallback').waitFor({ state: 'visible', timeout: 10000 })
  await page.getByTestId('onboarding-phone-input').fill('+14085550100')
  await capturePair(page, 'onboarding-phone-fallback')

  // Alerts step with unverified helper note
  await page.getByTestId('onboarding-phone-send-code').click()
  await page.getByTestId('onboarding-phone-code').fill('123456')
  await page.getByTestId('onboarding-phone-confirm-code').click()
  await page.getByTestId('onboarding-phone-verified').waitFor({ state: 'visible', timeout: 10000 })
  await page.getByTestId('onboarding-phone-continue').click()
  await page.getByTestId('onboarding-step-alerts').waitFor({ state: 'visible', timeout: 15000 })
  await page.getByTestId('onboarding-alerts-verify-note').waitFor({ state: 'visible', timeout: 10000 })
  await capturePair(page, 'onboarding-alerts-unverified')

  await browser.close()
  console.log('onboarding-phone-shots: ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
