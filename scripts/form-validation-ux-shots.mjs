#!/usr/bin/env node
/**
 * Screenshots for site-wide form validation UX at 1440 and 390:
 * Post a task, edit profile, help contact.
 * (Helper rate shots: scripts/helper-rate-validation-shots.mjs)
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
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage: false })
  copyFileSync(tmp, join(OUT, name))
  console.log('wrote', join(OUT, name))
}

async function seed(context, mutateSource) {
  await context.addInitScript(
    ({ key, mutateSource: src }) => {
      // eslint-disable-next-line no-new-func
      const mutate = new Function('state', src)
      function patch(raw) {
        let state
        try {
          state = raw ? JSON.parse(raw) : null
        } catch {
          return raw
        }
        if (!state?.people?.length) return raw
        mutate(state)
        return JSON.stringify(state)
      }
      try {
        const cur = localStorage.getItem(key)
        if (cur) localStorage.setItem(key, patch(cur))
      } catch {
        /* ignore */
      }
      const orig = localStorage.setItem.bind(localStorage)
      localStorage.setItem = (k, v) => (k === key ? orig(k, patch(String(v))) : orig(k, v))
    },
    { key: STORAGE_KEY, mutateSource },
  )
}

async function boot(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((k) => !!localStorage.getItem(k), STORAGE_KEY, { timeout: 20000 })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((k) => !!localStorage.getItem(k), STORAGE_KEY, { timeout: 20000 })
}

const neighbor = `
  const me = state.currentUserId || 'user-you';
  for (const p of state.people) {
    if (p.id !== me) continue;
    p.accountRole = 'customer';
    p.isHelper = false;
    p.skills = [];
    p.name = 'Alex Rivera';
    p.city = 'Austin';
    p.stateCode = 'TX';
    p.locationLabel = 'Austin, TX';
    p.lat = 30.2672;
    p.lng = -97.7431;
    p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-06-01T12:00:00.000Z';
  }
`

const helperEditor = `
  const me = state.currentUserId || 'user-you';
  for (const p of state.people) {
    if (p.id !== me) continue;
    p.accountRole = 'helper';
    p.isHelper = true;
    p.skills = ['house-cleaning'];
    p.hourlyRate = 0;
    p.rateType = 'hourly';
    p.name = 'Alex Rivera';
    p.city = 'Austin';
    p.stateCode = 'TX';
    p.locationLabel = 'Austin, TX';
    p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-06-01T12:00:00.000Z';
  }
`

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ]) {
      // Post a task — empty title on review step
      {
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
        await seed(context, neighbor)
        const page = await context.newPage()
        await boot(page)
        await page.goto(`${BASE}/post?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
        await page.getByTestId('post-describe-input').waitFor({ state: 'visible', timeout: 20000 })
        await page
          .getByTestId('post-describe-input')
          .fill('Need help hauling junk to the curb this weekend')
        if (await page.getByTestId('post-zip-change').count()) {
          await page.getByTestId('post-zip-change').click()
        }
        await page.getByTestId('post-zip').fill('78701')
        await page.getByTestId('post-zip-resolved').waitFor({ state: 'visible', timeout: 15000 })
        await page
          .locator('[data-testid="post-continue-mobile"], [data-testid="post-continue"]')
          .locator('visible=true')
          .first()
          .click()
        await page.getByTestId('post-request-form').waitFor({ state: 'visible', timeout: 45000 })
        if ((await page.getByTestId('post-title').count()) === 0) {
          await page.getByTestId('post-row-title-edit').click()
        }
        await page.getByTestId('post-title').waitFor({ state: 'visible', timeout: 10000 })
        await page.getByTestId('post-title').fill('')
        await page.getByRole('button', { name: /^Post task$/i }).first().click()
        await page.getByTestId('post-error').waitFor({ state: 'visible', timeout: 8000 })
        await page.getByTestId('post-error').scrollIntoViewIfNeeded()
        await page.waitForTimeout(400)
        await shot(page, `form-ux-post-error-${width}.png`)
        await context.close()
      }

      // Edit profile — empty rate
      {
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
        await seed(context, helperEditor)
        const page = await context.newPage()
        await boot(page)
        await page.goto(`${BASE}/settings/profile?demo=1#services`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        })
        await page.getByTestId('edit-profile-form').waitFor({ state: 'visible', timeout: 20000 })
        const rate = page.locator('[data-testid="you-helper-rate-amount"] input')
        await rate.waitFor({ state: 'visible', timeout: 10000 })
        await rate.fill('')
        await page.getByTestId('you-save-profile').click()
        await page.getByTestId('you-helper-rate-error').waitFor({ state: 'visible', timeout: 8000 })
        await page.getByTestId('you-helper-rate-wrap').scrollIntoViewIfNeeded()
        await page.waitForTimeout(400)
        await shot(page, `form-ux-edit-profile-error-${width}.png`)
        await context.close()
      }

      // Help contact — missing fields
      {
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
        await seed(context, neighbor)
        const page = await context.newPage()
        await boot(page)
        await page.goto(`${BASE}/help?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.getByTestId('help-contact-form').waitFor({ state: 'visible', timeout: 20000 })
        await page.getByTestId('help-contact-name').fill('')
        await page.getByTestId('help-contact-message').fill('')
        await page.getByTestId('help-contact-submit').click()
        await page.getByTestId('help-contact-error').waitFor({ state: 'visible', timeout: 8000 })
        const text = (await page.getByTestId('help-contact-error').textContent()) || ''
        assert.match(text, /Add your name|Add a message|Select a topic/)
        await page.getByTestId('help-contact-error').scrollIntoViewIfNeeded()
        await page.waitForTimeout(400)
        await shot(page, `form-ux-help-contact-error-${width}.png`)
        await context.close()
      }
    }

    // Copy helper shots into form-ux naming for the report
    for (const name of [
      'helper-rate-error-1440.png',
      'helper-rate-error-390.png',
      'helper-rate-empty-1440.png',
      'helper-rate-empty-390.png',
    ]) {
      const src = join(OUT, name)
      try {
        copyFileSync(src, join(OUT, `form-ux-${name}`))
        console.log('copied', join(OUT, `form-ux-${name}`))
      } catch {
        /* optional */
      }
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
