/**
 * Capture 1440 / 390 screenshots for helper rate + working hours UI.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })

async function seedEditor(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    for (const p of state.people || []) {
      if (p.id !== me) continue
      p.accountRole = 'helper'
      p.isHelper = true
      p.skills = p.skills?.length ? p.skills : ['junk-removal', 'house-cleaning']
      p.hourlyRate = 50
      p.rateType = 'hourly'
      p.availableNow = false
      p.workStart = '08:00'
      p.workEnd = '17:00'
      p.timezone = 'America/Chicago'
      p.serviceRadiusMiles = 5
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function seedBrowse(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  // Force predictable Available / Unavailable for screenshots regardless of local clock.
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    for (const p of state.people || []) {
      if (p.id === 'p-maya') {
        p.workStart = '00:00'
        p.workEnd = '23:30'
        p.timezone = 'UTC'
        p.isHelper = true
      }
      if (p.id === 'p-riley') {
        p.workStart = '00:30'
        p.workEnd = '01:00'
        p.timezone = 'UTC'
        p.isHelper = true
        p.hourlyRate = p.hourlyRate || 55
      }
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function shot(page, name, width) {
  await page.setViewportSize({ width, height: width >= 1000 ? 900 : 844 })
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log('wrote', path)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // Editor section
  await seedEditor(page)
  await page.goto(`${BASE}/settings/profile?demo=1#services`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.getByTestId('edit-profile-form').waitFor({ state: 'visible', timeout: 20000 })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByTestId('you-helper-hours-fields').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await shot(page, 'editor-rate-hours-1440.png', 1440)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByTestId('you-helper-hours-fields').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await shot(page, 'editor-rate-hours-390.png', 390)

  // Also capture onboarding helper editor
  await page.goto(`${BASE}/onboarding/helper?demo=1`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.getByTestId('helper-hourly-rate').waitFor({ state: 'visible', timeout: 20000 })
  await page.getByTestId('helper-hourly-rate').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await shot(page, 'onboarding-rate-hours-1440.png', 1440)
  await shot(page, 'onboarding-rate-hours-390.png', 390)

  // Available profile (Maya: 00:00-23:30)
  await seedBrowse(page)
  await page.goto(`${BASE}/people/p-maya?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByTestId('profile-header').waitFor({ state: 'visible', timeout: 20000 })
  await page.waitForTimeout(400)
  const mayaStatus = page.getByTestId('profile-header-availability')
  await mayaStatus.waitFor({ state: 'visible', timeout: 10000 })
  const mayaText = await mayaStatus.innerText()
  console.log('maya status:', mayaText)
  await shot(page, 'profile-available-1440.png', 1440)
  await shot(page, 'profile-available-390.png', 390)

  // Unavailable profile (Riley: 00:30-01:00)
  await page.goto(`${BASE}/people/p-riley?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByTestId('profile-header').waitFor({ state: 'visible', timeout: 20000 })
  await page.waitForTimeout(400)
  const rileyStatus = page.getByTestId('profile-header-availability')
  await rileyStatus.waitFor({ state: 'visible', timeout: 10000 })
  const rileyText = await rileyStatus.innerText()
  console.log('riley status:', rileyText)
  await shot(page, 'profile-unavailable-1440.png', 1440)
  await shot(page, 'profile-unavailable-390.png', 390)

  // Helper cards on browse (viewer must be a neighbor so helpers tab is visible)
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    for (const p of state.people || []) {
      if (p.id === me) {
        p.accountRole = 'customer'
        p.isHelper = false
        p.skills = []
      }
      if (p.id === 'p-maya') {
        p.workStart = '00:00'
        p.workEnd = '23:30'
        p.timezone = 'UTC'
        p.isHelper = true
      }
      if (p.id === 'p-riley') {
        p.workStart = '00:30'
        p.workEnd = '01:00'
        p.timezone = 'UTC'
        p.isHelper = true
      }
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.goto(`${BASE}/browse?demo=1&tab=people&radius=any`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(1200)
  // Prefer a card that shows Available status if present.
  const availableCard = page.locator('[data-testid="helper-availability-status"][data-status="available"]').first()
  if ((await availableCard.count()) > 0) {
    await availableCard.scrollIntoViewIfNeeded()
  }
  await shot(page, 'browse-helpers-available-1440.png', 1440)
  await shot(page, 'browse-helpers-available-390.png', 390)

  const unavailableCard = page
    .locator('[data-testid="helper-availability-status"][data-status="unavailable"]')
    .first()
  if ((await unavailableCard.count()) > 0) {
    await unavailableCard.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await shot(page, 'browse-helpers-unavailable-1440.png', 1440)
    await shot(page, 'browse-helpers-unavailable-390.png', 390)
  }

  await browser.close()
  console.log('working-hours-shots: OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
