#!/usr/bin/env node
/**
 * Own-profile redesign screenshots (helper).
 * Captures 1440 and 390 viewports for profile, edit, settings, activity, menu.
 */
import { mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/you-profile'
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

async function seedHelper(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    for (const p of state.people || []) {
      if (p.id !== me) continue
      p.accountRole = 'helper'
      p.isHelper = true
      p.name = p.name || 'Kuni'
      p.bio = ''
      p.skills = ['moving']
      p.hourlyRate = 35
      p.rateType = 'hourly'
      p.serviceRadiusMiles = 5
      p.availableNow = false
      p.availability = []
      p.rating = 5
      p.reviewCount = 1
      p.jobsCompleted = 1
      p.locationLabel = 'San Jose, CA'
      p.city = 'San Jose'
      p.stateCode = 'CA'
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function capture(browser, path, testId, prefix) {
  for (const vp of [
    { name: '1440', width: 1440, height: 900 },
    { name: '390', width: 390, height: 844, isMobile: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: Boolean(vp.isMobile),
      hasTouch: Boolean(vp.isMobile),
    })
    const page = await context.newPage()
    await seedHelper(page)
    await page.goto(`${BASE}${path}${path.includes('?') ? '&' : '?'}demo=1`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 20000 })
    await page.waitForTimeout(300)
    await shot(page, `${prefix}-${vp.name}.png`)
    await context.close()
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    await capture(browser, '/you', 'you-page', 'profile')
    await capture(browser, '/settings/profile', 'edit-profile-form', 'edit')
    await capture(browser, '/settings/account', 'settings-page', 'settings')
    await capture(browser, '/home', 'my-activity-page', 'activity')
    // Mobile settings hub only (desktop /settings shows account settings).
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      })
      const page = await context.newPage()
      await seedHelper(page)
      await page.goto(`${BASE}/settings?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.getByTestId('you-settings-menu').waitFor({ state: 'visible', timeout: 20000 })
      await page.waitForTimeout(300)
      await shot(page, 'settings-menu-390.png')
      await context.close()
    }
    // Desktop account menu
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedHelper(page)
      await page.goto(`${BASE}/you?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.getByTestId('you-page').waitFor({ state: 'visible' })
      await page.getByTestId('account-menu-trigger').click()
      await page.getByTestId('account-menu').waitFor({ state: 'visible' })
      await page.waitForTimeout(200)
      await shot(page, 'account-menu-1440.png')
      await context.close()
    }
  } finally {
    await browser.close()
  }
  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
