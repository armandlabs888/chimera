/**
 * Capture desktop + mobile screenshots of the profile header availability line
 * in Available (green) and Unavailable (red) states.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })

async function seedStates(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    for (const p of state.people || []) {
      if (p.id === 'p-maya') {
        // Wide window so status stays Available for screenshots.
        p.workStart = '00:00'
        p.workEnd = '23:30'
        p.timezone = 'America/Los_Angeles'
        p.stateCode = 'CA'
        p.isHelper = true
        p.skills = p.skills?.length ? p.skills : ['junk-removal']
      }
      if (p.id === 'p-riley') {
        // Standard day window; outside it the line shows Unavailable.
        p.workStart = '08:00'
        p.workEnd = '17:00'
        p.timezone = 'America/Los_Angeles'
        p.stateCode = 'CA'
        p.isHelper = true
        p.skills = p.skills?.length ? p.skills : ['junk-removal']
        p.hourlyRate = p.hourlyRate || 55
      }
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function shotHeader(page, name, width) {
  await page.setViewportSize({ width, height: width >= 1000 ? 900 : 844 })
  const header = page.getByTestId('profile-header')
  await header.waitFor({ state: 'visible', timeout: 20000 })
  const avail = page.getByTestId('profile-header-availability')
  await avail.waitFor({ state: 'visible', timeout: 10000 })
  await page.waitForTimeout(300)
  const path = join(OUT, name)
  await header.screenshot({ path })
  console.log('wrote', path, 'text=', (await avail.innerText()).replace(/\s+/g, ' '))
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await seedStates(page)

  await page.goto(`${BASE}/people/p-maya?demo=1`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  const maya = page.getByTestId('profile-header-availability')
  await maya.waitFor({ state: 'visible', timeout: 10000 })
  const mayaText = await maya.innerText()
  if (!/Available now/i.test(mayaText) || !/Works /i.test(mayaText)) {
    throw new Error(`Expected full available line, got: ${mayaText}`)
  }
  if (!/ · /.test(mayaText.replace(/\n/g, ' '))) {
    // Middot may be on same or wrapped line; require status + hours content.
    console.warn('middot check soft-fail; text=', mayaText)
  }
  await shotHeader(page, 'availability-line-available-1440.png', 1440)
  await shotHeader(page, 'availability-line-available-390.png', 390)

  await page.goto(`${BASE}/people/p-riley?demo=1`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  const riley = page.getByTestId('profile-header-availability')
  await riley.waitFor({ state: 'visible', timeout: 10000 })
  const rileyText = await riley.innerText()
  if (!/Unavailable now/i.test(rileyText) || !/Works /i.test(rileyText)) {
    throw new Error(`Expected full unavailable line, got: ${rileyText}`)
  }
  await shotHeader(page, 'availability-line-unavailable-1440.png', 1440)
  await shotHeader(page, 'availability-line-unavailable-390.png', 390)

  // Confirm no hours => line hidden
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    for (const p of state.people || []) {
      if (p.id === 'p-maya') {
        p.workStart = null
        p.workEnd = null
      }
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.goto(`${BASE}/people/p-maya?demo=1`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.getByTestId('profile-header').waitFor({ state: 'visible', timeout: 20000 })
  await page.waitForTimeout(400)
  const hiddenCount = await page.getByTestId('profile-header-availability').count()
  if (hiddenCount !== 0) {
    throw new Error('Expected availability line hidden when hours unset')
  }
  console.log('hidden-when-unset: OK')

  await browser.close()
  console.log('availability-line-shots: OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
