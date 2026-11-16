/**
 * Screenshots (1440 / 390):
 * - Unverified text-alert toggle (disabled + verify copy)
 * - Published helper profile with availability dot
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })

async function seedUnverifiedHelper(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
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
      p.skills = p.skills?.length ? p.skills : ['junk-removal', 'house-cleaning']
      p.hourlyRate = 50
      p.rateType = 'hourly'
    }
    state.helperVerification = {
      ...(state.helperVerification || {}),
      id: state.helperVerification?.id || 'ver-you',
      profileId: me,
      status: 'unverified',
      email: state.helperVerification?.email || 'you@example.com',
      street: state.helperVerification?.street || '1 Main St',
      city: state.helperVerification?.city || 'San Jose',
      stateCode: state.helperVerification?.stateCode || 'CA',
      zip: state.helperVerification?.zip || '95125',
      lastCheckResult: null,
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  // BeamContext keeps in-memory state across client navigations; reload to hydrate.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => {
    try {
      const s = JSON.parse(localStorage.getItem(key) || '{}')
      return s.helperVerification?.status === 'unverified'
    } catch {
      return false
    }
  }, STORAGE_KEY, { timeout: 20000 })
}

async function seedAvailableProfile(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    for (const p of state.people || []) {
      if (p.id === 'p-maya') {
        p.workStart = '00:00'
        p.workEnd = '23:30'
        p.timezone = 'UTC'
        p.isHelper = true
        p.skills = p.skills?.length ? p.skills : ['house-cleaning']
      }
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
}

async function shot(page, name, width) {
  await page.setViewportSize({ width, height: width >= 1000 ? 900 : 844 })
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log('wrote', path)
  return path
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // Unverified text alerts
  await seedUnverifiedHelper(page)
  await page.goto(`${BASE}/settings/account?demo=1#notifications`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  const sms = page.getByTestId('helper-sms-settings')
  await sms.waitFor({ state: 'visible', timeout: 20000 })
  await page.getByTestId('helper-sms-opt-in-locked').waitFor({ state: 'visible', timeout: 10000 })
  await page.getByTestId('helper-sms-get-verified').waitFor({ state: 'visible', timeout: 10000 })
  await sms.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await shot(page, 'unverified-text-alerts-1440.png', 1440)
  await shot(page, 'unverified-text-alerts-390.png', 390)

  // Published profile with availability dot
  await seedAvailableProfile(page)
  await page.goto(`${BASE}/people/p-maya?demo=1`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.getByTestId('profile-header').waitFor({ state: 'visible', timeout: 20000 })
  const avail = page.getByTestId('profile-header-availability')
  await avail.waitFor({ state: 'visible', timeout: 20000 })
  console.log('availability:', await avail.innerText())
  await page.waitForTimeout(300)
  await shot(page, 'published-availability-dot-1440.png', 1440)
  await shot(page, 'published-availability-dot-390.png', 390)

  await browser.close()
  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
