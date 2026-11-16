/**
 * Capture 1440 / 390 screenshots for helper Hourly | Flat rate editor
 * and flat-rate helper card + public profile.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })

async function seedHelperEditor(page, rateType = 'hourly') {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, rateType: rt }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id !== me) continue
        p.accountRole = 'helper'
        p.isHelper = true
        p.skills = p.skills?.length ? p.skills : ['junk-removal', 'house-cleaning']
        p.hourlyRate = 50
        p.rateType = rt
        p.availableNow = false
        p.workStart = '08:00'
        p.workEnd = '17:00'
        p.timezone = 'America/Chicago'
        p.serviceRadiusMiles = 5
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, rateType },
  )
}

async function seedFlatHelper(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    let viewer = null
    for (const p of state.people || []) {
      if (p.id === me) {
        p.accountRole = 'customer'
        p.isHelper = false
        p.skills = []
        viewer = p
      }
    }
    for (const p of state.people || []) {
      if (p.id !== 'p-casey') continue
      p.isHelper = true
      p.hourlyRate = 50
      p.rateType = 'flat'
      p.skills = p.skills?.length ? p.skills : ['auto-detailing', 'junk-removal']
      p.serviceRadiusMiles = 25
      // Colocate with viewer so distance filters do not hide the card.
      if (viewer) {
        p.lat = viewer.lat
        p.lng = viewer.lng
        p.city = viewer.city
        p.stateCode = viewer.stateCode
        p.locationLabel = viewer.locationLabel
        p.neighborhood = viewer.neighborhood
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

async function shotEditor(page, rateType, width) {
  await seedHelperEditor(page, rateType)
  await page.goto(`${BASE}/settings/profile?demo=1#services`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.getByTestId('edit-profile-form').waitFor({ state: 'visible', timeout: 20000 })
  await page.getByTestId('you-helper-rate-wrap').waitFor({ state: 'visible', timeout: 10000 })
  // Ensure the segmented control shows the requested option
  await page.getByTestId(`you-helper-rate-type-${rateType}`).click()
  await page.getByTestId('you-helper-rate-wrap').scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  await shot(page, `editor-rate-${rateType}-${width}.png`, width)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // Editor: Hourly + Flat at 1440 and 390
  for (const width of [1440, 390]) {
    await shotEditor(page, 'hourly', width)
    await shotEditor(page, 'flat', width)
  }

  // Flat helper card on browse + public profile booking card
  await seedFlatHelper(page)
  await page.goto(`${BASE}/browse?demo=1&tab=people&radius=any`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(1200)
  // Ensure Any distance if URL param did not stick
  const anyBtn = page.getByRole('button', { name: 'Any' }).first()
  if ((await anyBtn.count()) > 0) {
    await anyBtn.click()
    await page.waitForTimeout(400)
  }
  const caseyRow = page.locator('[data-testid="browse-helper-row"]').filter({ hasText: 'Casey' }).first()
  if ((await caseyRow.count()) > 0) {
    await caseyRow.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
  } else {
    const flatRate = page.locator('text=/\\$\\d+ flat/').first()
    if ((await flatRate.count()) > 0) await flatRate.scrollIntoViewIfNeeded()
  }
  await shot(page, 'browse-helper-flat-1440.png', 1440)
  await shot(page, 'browse-helper-flat-390.png', 390)

  await page.goto(`${BASE}/people/p-casey?demo=1`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.getByTestId('public-helper-profile').waitFor({
    state: 'visible',
    timeout: 20000,
  })
  await page.waitForTimeout(400)
  const bookCard = page.getByTestId('public-helper-total')
  if ((await bookCard.count()) > 0) {
    await bookCard.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
  } else {
    // Fallback: scroll booking form into view
    const bookBtn = page.getByTestId('public-helper-request-book')
    if ((await bookBtn.count()) > 0) await bookBtn.scrollIntoViewIfNeeded()
  }
  await shot(page, 'profile-flat-rate-1440.png', 1440)
  await shot(page, 'profile-flat-rate-390.png', 390)

  await browser.close()
  console.log('flat-rate-shots: OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
