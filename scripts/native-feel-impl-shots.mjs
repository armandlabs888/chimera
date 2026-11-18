#!/usr/bin/env node
import { mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'
mkdirSync(OUT, { recursive: true })

async function seedHelper(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 30000 })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    for (const p of state.people || []) {
      if (p.id !== me) continue
      p.accountRole = 'helper'
      p.isHelper = true
      p.skills = p.skills?.length ? p.skills : ['junk-removal', 'house-cleaning']
      p.hourlyRate = p.hourlyRate || 35
      p.onboardingCompletedAt = p.onboardingCompletedAt || new Date().toISOString()
      p.safetyDisclaimerAcceptedAt = p.safetyDisclaimerAcceptedAt || new Date().toISOString()
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.evaluate(() => {
    const fn = window.__BEAM_SET_DEMO_VERIFICATION__
    if (typeof fn === 'function') fn('approved')
  })
}

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log('wrote', name)
}

const browser = await chromium.launch({ headless: true })

// Phone shots
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  await seedHelper(page)

  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(800)
  await shot(page, 'impl_browse_390x844.png')

  // Filters sheet
  const filterBtn = page.getByTestId('browse-mobile-filters-trigger')
  if (await filterBtn.count()) {
    await filterBtn.click()
    await page.waitForSelector('[data-testid="browse-mobile-filters-panel"]', { timeout: 5000 })
    await page.waitForTimeout(300)
    await shot(page, 'impl_filters_sheet_390x844.png')
    await page.getByTestId('browse-mobile-filters-close').click().catch(() => {})
    await page.waitForTimeout(200)
  }

  // Job bottom sheet
  const row = page.locator('[data-testid="browse-job-row"], [data-testid="browse-job-card"]').first()
  await row.click()
  await page.waitForSelector('[data-testid="browse-job-sheet"]', { timeout: 10000 })
  await page.waitForTimeout(400)
  await shot(page, 'impl_job_sheet_390x844.png')
  await page.getByTestId('browse-drawer-close').click().catch(async () => {
    await page.getByTestId('browse-job-sheet-backdrop').click()
  })
  await page.waitForTimeout(300)

  await page.goto(`${BASE}/post?demo=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(600)
  await shot(page, 'impl_post_390x844.png')

  await page.goto(`${BASE}/messages?demo=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(600)
  await shot(page, 'impl_messages_390x844.png')

  const thread = page.locator('[data-testid^="messages-thread-row-"]').first()
  if (await thread.count()) {
    await thread.click()
    await page.waitForTimeout(700)
    await shot(page, 'impl_conversation_390x844.png')
  }

  await page.goto(`${BASE}/settings?demo=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(600)
  await shot(page, 'impl_profile_390x844.png')

  await page.goto(`${BASE}/settings/account?demo=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(600)
  await shot(page, 'impl_settings_back_390x844.png')

  await context.close()
}

// Desktop before/after proof (unchanged chrome)
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await seedHelper(page)
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(800)
  await shot(page, 'impl_browse_1440.png')
  // Ensure job selected for detail panel
  const row = page.locator('[data-testid="browse-job-row"], [data-testid="browse-job-card"]').first()
  if (await row.count()) await row.click().catch(() => {})
  await page.waitForTimeout(600)
  await shot(page, 'impl_job_details_1440.png')
  await context.close()
}

await browser.close()
console.log('done')
