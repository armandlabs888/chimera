#!/usr/bin/env node
/**
 * Screenshots for site-wide form validation UX at 1440 and 390:
 * - helper profile empty rate error
 * - post a task empty title error
 * - edit profile empty name / rate (helper)
 * - help contact empty message error
 */
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path: join('/tmp', name), fullPage: false })
  copyFileSync(join('/tmp', name), path)
  console.log('wrote', path)
}

async function seedDemo(context, patchFn) {
  await context.addInitScript(
    ({ key, patchSource }) => {
      // eslint-disable-next-line no-new-func
      const patchPeople = new Function('state', patchSource)
      function patchState(raw) {
        let state
        try {
          state = raw ? JSON.parse(raw) : null
        } catch {
          return raw
        }
        if (!state || !Array.isArray(state.people) || !state.people.length) return raw
        patchPeople(state)
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
    { key: STORAGE_KEY, patchSource: patchFn },
  )
}

async function bootDemo(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
}

const helperPatch = `
  const me = state.currentUserId || 'user-you';
  for (const p of state.people) {
    if (p.id !== me) continue;
    p.accountRole = 'customer';
    p.isHelper = false;
    p.skills = ['house-cleaning', 'junk-removal'];
    p.hourlyRate = 0;
    p.rateType = 'hourly';
    p.name = p.name || 'Alex Rivera';
    p.city = p.city || 'Austin';
    p.stateCode = p.stateCode || 'TX';
    p.locationLabel = p.locationLabel || 'Austin, TX';
    p.lat = p.lat ?? 30.2672;
    p.lng = p.lng ?? -97.7431;
    p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-06-01T12:00:00.000Z';
  }
  if (!state.helperVerification) state.helperVerification = {};
  state.helperVerification.status = 'approved';
`

const helperEditPatch = `
  const me = state.currentUserId || 'user-you';
  for (const p of state.people) {
    if (p.id !== me) continue;
    p.accountRole = 'helper';
    p.isHelper = true;
    p.skills = ['house-cleaning'];
    p.hourlyRate = 0;
    p.rateType = 'hourly';
    p.name = 'Alex Rivera';
    p.city = p.city || 'Austin';
    p.stateCode = p.stateCode || 'TX';
    p.locationLabel = p.locationLabel || 'Austin, TX';
    p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-06-01T12:00:00.000Z';
  }
`

async function shotHelper(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  await seedDemo(context, helperPatch)
  const page = await context.newPage()
  await bootDemo(page)
  await page.goto(`${BASE}/onboarding/helper?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByTestId('helper-onboarding-form').waitFor({ state: 'visible', timeout: 20000 })
  const rateInput = page.locator('[data-testid="helper-rate-amount"] input')
  await rateInput.fill('')
  await page.getByTestId('helper-onboarding-submit').click()
  await page.getByTestId('helper-rate-error').waitFor({ state: 'visible', timeout: 8000 })
  await page.getByTestId('helper-rate-wrap').scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  await shot(page, `form-ux-helper-rate-error-${width}.png`)
  await context.close()
}

async function shotPost(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  await seedDemo(context, helperPatch)
  const page = await context.newPage()
  await bootDemo(page)
  await page.goto(`${BASE}/post?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  // Clear title if present and submit
  const title = page.getByTestId('post-title').or(page.locator('#post-title, [name=\"title\"]')).first()
  if (await title.count()) {
    await title.fill('')
  }
  const submit = page.getByTestId('post-submit').or(page.getByTestId('post-submit-mobile')).first()
  await submit.click()
  // Wait for any visible error alert
  await page.waitForTimeout(600)
  const err = page.getByTestId('post-error').or(page.locator('[role=\"alert\"]').first())
  await err.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(300)
  await shot(page, `form-ux-post-error-${width}.png`)
  await context.close()
}

async function shotEditProfile(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  await seedDemo(context, helperEditPatch)
  const page = await context.newPage()
  await bootDemo(page)
  await page.goto(`${BASE}/settings/profile?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByTestId('edit-profile-form').waitFor({ state: 'visible', timeout: 20000 })
  const rate = page.locator('[data-testid="you-helper-rate-amount"] input')
  if (await rate.count()) {
    await rate.fill('')
    await rate.scrollIntoViewIfNeeded()
  }
  await page.getByTestId('you-save-profile').click()
  await page.waitForTimeout(700)
  const rateErr = page.getByTestId('you-helper-rate-error')
  if (await rateErr.count()) {
    await rateErr.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    await page.locator('[data-testid="you-helper-rate-wrap"]').scrollIntoViewIfNeeded()
  }
  await page.waitForTimeout(300)
  await shot(page, `form-ux-edit-profile-error-${width}.png`)
  await context.close()
}

async function shotHelp(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  await seedDemo(context, helperPatch)
  const page = await context.newPage()
  await bootDemo(page)
  await page.goto(`${BASE}/help?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByTestId('help-contact-form').waitFor({ state: 'visible', timeout: 20000 })
  // Clear required fields and submit
  const name = page.getByTestId('help-contact-name')
  const message = page.getByTestId('help-contact-message')
  await name.fill('')
  await message.fill('')
  await page.getByTestId('help-contact-submit').click()
  await page.waitForTimeout(700)
  const alert = page.locator('[data-testid=\"help-contact-form\"] [role=\"alert\"], [data-testid=\"help-contact-error\"]')
  await alert.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  await page.getByTestId('help-contact-form').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await shot(page, `form-ux-help-contact-error-${width}.png`)
  await context.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const [w, h] of [
      [1440, 900],
      [390, 844],
    ]) {
      await shotHelper(browser, w, h)
      await shotPost(browser, w, h)
      await shotEditProfile(browser, w, h)
      await shotHelp(browser, w, h)
    }
    console.log('form-validation-ux-shots: OK')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
