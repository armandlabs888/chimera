#!/usr/bin/env node
/**
 * Screenshots for helper rate validation UX:
 * - empty rate field (placeholder "Enter rate", clearly empty)
 * - after Publish with no rate: inline red error under Rate, field focused
 * Viewports: 1440 and 390
 */
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/helper-rate-validation'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage: false })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log('wrote', join(OUT, name))
}

async function seedVerifiedNeighborEmptyRate(context) {
  await context.addInitScript(
    ({ key }) => {
      function patchState(raw) {
        let state
        try {
          state = raw ? JSON.parse(raw) : null
        } catch {
          state = null
        }
        if (!state || !Array.isArray(state.people) || !state.people.length) return raw
        const me = state.currentUserId || 'user-you'
        for (const p of state.people) {
          if (p.id !== me) continue
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = ['house-cleaning', 'junk-removal']
          p.availableNow = false
          p.hourlyRate = 0
          p.rateType = 'hourly'
          p.name = p.name || 'Alex Rivera'
          p.bio = p.bio || 'Experienced with apartment moves and cleaning.'
          p.city = p.city || 'Austin'
          p.stateCode = p.stateCode || 'TX'
          p.locationLabel = p.locationLabel || 'Austin, TX'
          p.lat = p.lat ?? 30.2672
          p.lng = p.lng ?? -97.7431
          p.serviceRadiusMiles = p.serviceRadiusMiles ?? 5
          p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-06-01T12:00:00.000Z'
        }
        if (!state.helperVerification) state.helperVerification = {}
        state.helperVerification.status = 'approved'
        state.helperVerification.lastCheckResult = 'matched'
        return JSON.stringify(state)
      }

      try {
        const current = localStorage.getItem(key)
        if (current) localStorage.setItem(key, patchState(current))
      } catch {
        /* ignore */
      }

      const originalSetItem = localStorage.setItem.bind(localStorage)
      localStorage.setItem = (k, v) => {
        if (k === key) return originalSetItem(k, patchState(String(v)))
        return originalSetItem(k, String(v))
      }
    },
    { key: STORAGE_KEY },
  )
}

async function openHelperOnboarding(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.goto(`${BASE}/onboarding/helper?demo=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page.getByTestId('helper-onboarding-form').waitFor({ state: 'visible', timeout: 20000 })
  await page.getByTestId('helper-rate-wrap').waitFor({ state: 'visible', timeout: 10000 })
}

async function captureViewport(browser, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  })
  await seedVerifiedNeighborEmptyRate(context)
  const page = await context.newPage()
  await openHelperOnboarding(page)

  // Ensure rate is empty (seed forces 0 → '')
  const rateInput = page.locator('[data-testid="helper-rate-amount"] input')
  await rateInput.fill('')
  const placeholder = await rateInput.getAttribute('placeholder')
  assert.equal(placeholder, 'Enter rate', 'placeholder must be Enter rate')
  const value = await rateInput.inputValue()
  assert.equal(value, '', 'rate input must be empty')

  await page.getByTestId('helper-rate-wrap').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await shot(page, `helper-rate-empty-${width}.png`)

  // Fill required fields except rate so submit hits rate validation
  const nameInput = page.getByTestId('helper-display-name')
  if (!(await nameInput.inputValue()).trim()) {
    await nameInput.fill('Alex Rivera')
  }
  // Skills may already be seeded; ensure at least one
  const skillsError = page.getByTestId('helper-skills-error')
  const skillChip = page.locator('[data-testid^="helper-skill-"]').first()
  if ((await skillChip.count()) > 0) {
    // leave seeded skills
  }

  await page.getByTestId('helper-onboarding-submit').click()
  await page.getByTestId('helper-rate-error').waitFor({ state: 'visible', timeout: 5000 })
  const errText = (await page.getByTestId('helper-rate-error').textContent()) || ''
  assert.match(errText, /Enter your hourly rate/, `unexpected rate error: ${errText}`)

  const ariaInvalid = await rateInput.getAttribute('aria-invalid')
  assert.equal(ariaInvalid, 'true', 'rate input should be aria-invalid')

  await page.waitForFunction(
    () => {
      const el = document.activeElement
      return Boolean(
        el?.closest?.('[data-testid="helper-rate-amount"]') ||
          el?.getAttribute?.('aria-label')?.toLowerCase().includes('rate'),
      )
    },
    undefined,
    { timeout: 4000 },
  )

  await page.getByTestId('helper-rate-wrap').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await shot(page, `helper-rate-error-${width}.png`)

  // Also capture near-submit error + top banner area on desktop by scrolling to actions
  if (width >= 1000) {
    await page.getByTestId('helper-onboarding-submit-error').waitFor({ state: 'visible', timeout: 3000 })
    await page.getByTestId('helper-onboarding-submit').scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
    await shot(page, `helper-rate-submit-error-${width}.png`)
  }

  await context.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    await captureViewport(browser, 1440, 900)
    await captureViewport(browser, 390, 844)
    console.log('helper-rate-validation-shots: OK')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
