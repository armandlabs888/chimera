#!/usr/bin/env node
/**
 * Capture Step 1 screenshots: valid + error states at 1440 and 390.
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/onboarding-real-name'
mkdirSync(OUT, { recursive: true })

async function clearDemoOnboardingSeed(page) {
  await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => !!localStorage.getItem('beam-demo-v1'), null, {
    timeout: 20000,
  }).catch(() => {})
  await page.evaluate(() => {
    const key = 'beam-demo-v1'
    const raw = localStorage.getItem(key)
    if (!raw) return
    const state = JSON.parse(raw || '{}')
    const me = state.currentUserId
    state.people = (state.people || []).map((p) =>
      p.id === me
        ? {
            ...p,
            accountRole: null,
            isHelper: false,
            skills: [],
            hourlyRate: 0,
            city: null,
            stateCode: null,
            locationLabel: '',
            onboardingCompletedAt: null,
            safetyDisclaimerAcceptedAt: null,
            name: 'Guest',
          }
        : p,
    )
    localStorage.setItem(key, JSON.stringify(state))
  })
}

async function ensureCity(page) {
  if (await page.locator('[data-testid="onboarding-city-verified"]').count()) {
    return
  }
  await page.waitForSelector('[data-testid="onboarding-city-input"]', { timeout: 20000 })
  const cityInput = page.getByTestId('onboarding-city-input')
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="onboarding-city-input"]')
    return el instanceof HTMLInputElement && !el.disabled
  }, null, { timeout: 20000 })
  await cityInput.fill('San Jose, CA')
  await page.waitForSelector('[data-testid="onboarding-city-listbox"]')
  await page.getByRole('option', { name: /San Jose,\s*CA/i }).first().click()
  await page.waitForSelector('[data-testid="onboarding-city-verified"]')
}

async function shot(page, name, { fullPage = false } = {}) {
  await page.evaluate(() => window.scrollTo(0, 0))
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage })
  console.log(`saved ${path}`)
  return path
}

async function runViewport(browser, vp) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  try {
    await clearDemoOnboardingSeed(page)
    await page.goto(`${BASE_URL}/onboarding?preview=1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="onboarding-step-1"]')

    assert.equal(await page.locator('[data-testid="onboarding-header"]').count(), 0)
    assert.match(await page.getByTestId('onboarding-step-progress').innerText(), /Step 1 of 2/i)

    await page.getByTestId('onboarding-role-helper').click()
    await page
      .locator('[data-testid="onboarding-benefits"]:visible')
      .first()
      .waitFor({ state: 'visible' })

    // Error state
    await page.getByTestId('onboarding-first-name').fill('asdf')
    await page.getByTestId('onboarding-last-name').fill('qwer')
    await page.getByTestId('onboarding-next').click({ force: true })
    await page.waitForSelector('[data-testid="onboarding-name-error"]')
    assert.match(
      await page.getByTestId('onboarding-name-error').innerText(),
      /This is not a real name/i,
    )
    await page.getByTestId('onboarding-name-field').scrollIntoViewIfNeeded()
    await shot(page, `${vp.name}-step1-error`, { fullPage: vp.width < 800 })

    // Valid state
    await page.getByTestId('onboarding-first-name').fill('Armand')
    await page.getByTestId('onboarding-last-name').fill('Morales')
    await ensureCity(page)
    assert.equal(
      await page.getByTestId('onboarding-next').getAttribute('aria-disabled'),
      'false',
    )
    assert.equal(await page.locator('[data-testid="onboarding-name-error"]').count(), 0)
    await page.getByTestId('onboarding-step-progress').scrollIntoViewIfNeeded()
    await shot(page, `${vp.name}-step1-valid`, { fullPage: vp.width < 800 })
  } finally {
    await page.close()
  }
}

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
]

const browser = await chromium.launch({ headless: true })
try {
  for (const vp of VIEWPORTS) {
    await runViewport(browser, vp)
  }
  console.log('onboarding-name-screenshots PASS')
} finally {
  await browser.close()
}
