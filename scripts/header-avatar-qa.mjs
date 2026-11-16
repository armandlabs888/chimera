/**
 * Signed-in header avatar QA for /match (jobs + helpers) at desktop + mobile.
 * Demo mode treats the seed user as signed-in (avatar menu, not guest chrome).
 */
import { chromium } from 'playwright'
import { mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/header-avatar-qa'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

const summary = { ok: true, checks: [], failures: [] }

function record(ok, msg, detail = null) {
  summary.checks.push({ ok, msg, detail })
  if (!ok) {
    summary.ok = false
    summary.failures.push(msg)
    console.error(`FAIL  ${msg}${detail ? ` — ${detail}` : ''}`)
  } else {
    console.log(`PASS  ${msg}`)
  }
}

async function shot(page, name) {
  const path = join(LOCAL, name)
  await page.screenshot({ path, fullPage: false })
  copyFileSync(path, join(OUT, name))
  return path
}

async function assertSignedInHeader(page, label) {
  const topnav = page.locator('[data-testid="app-topnav"]')
  await topnav.waitFor({ state: 'visible', timeout: 15000 })
  const trigger = page.locator('[data-testid="account-menu-trigger"]')
  const guestAuth = page.locator('[data-testid="guest-auth-links"]')
  const triggerCount = await trigger.count()
  const guestCount = await guestAuth.count()
  record(triggerCount >= 1, `${label}: account-menu-trigger present`, `count=${triggerCount}`)
  record(guestCount === 0, `${label}: no guest Log in / Sign up chrome`)
  return trigger
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // --- Jobs results, desktop ---
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/match?zip=95131&intent=jobs`, { waitUntil: 'networkidle' })
  await page.getByTestId('match-page').waitFor({ state: 'visible', timeout: 20000 })
  let trigger = await assertSignedInHeader(page, 'jobs-1440')
  // Desktop: trigger must be visible (not only in DOM for mobile sheet)
  const deskVisible = await trigger.first().isVisible()
  record(deskVisible, 'jobs-1440: avatar trigger visible')
  await shot(page, 'match-jobs-1440x900-avatar.png')

  await trigger.first().click()
  await page.getByTestId('account-menu').waitFor({ state: 'visible', timeout: 5000 })
  record(true, 'jobs-1440: account menu opens')
  const hasProfile = (await page.getByTestId('account-menu-profile').count()) >= 1
  const hasSettings = (await page.getByTestId('account-menu-settings').count()) >= 1
  const hasSignOut = (await page.getByTestId('account-sign-out').count()) >= 1
  record(hasProfile && hasSettings && hasSignOut, 'jobs-1440: menu has profile, settings, sign out')
  await shot(page, 'match-jobs-1440x900-avatar-menu-open.png')
  await page.keyboard.press('Escape')

  // --- Helpers results, desktop ---
  await page.goto(`${BASE}/match?zip=95131&intent=helpers`, { waitUntil: 'networkidle' })
  await page.getByTestId('match-page').waitFor({ state: 'visible', timeout: 20000 })
  trigger = await assertSignedInHeader(page, 'helpers-1440')
  record(await trigger.first().isVisible(), 'helpers-1440: avatar trigger visible')
  await shot(page, 'match-helpers-1440x900-avatar.png')

  // --- Jobs results, mobile ---
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/match?zip=95131&intent=jobs`, { waitUntil: 'networkidle' })
  await page.getByTestId('match-page').waitFor({ state: 'visible', timeout: 20000 })
  // On mobile the desktop avatar is hidden; open hamburger and check mobile account links
  const menuBtn = page.locator('.browse-hc-menu-btn')
  await menuBtn.click()
  await page.getByTestId('mobile-account-links').waitFor({ state: 'visible', timeout: 5000 })
  record(true, 'jobs-390: mobile account links visible')
  const mobSignOut = (await page.getByTestId('mobile-account-sign-out').count()) >= 1
  record(mobSignOut, 'jobs-390: mobile sign out present')
  await shot(page, 'match-jobs-390x844-avatar-menu.png')

  // --- Helpers results, mobile ---
  await page.goto(`${BASE}/match?zip=95131&intent=helpers`, { waitUntil: 'networkidle' })
  await page.getByTestId('match-page').waitFor({ state: 'visible', timeout: 20000 })
  await page.locator('.browse-hc-menu-btn').click()
  await page.getByTestId('mobile-account-links').waitFor({ state: 'visible', timeout: 5000 })
  record(true, 'helpers-390: mobile account links visible')
  await shot(page, 'match-helpers-390x844-avatar-menu.png')

  // Spot-check other public routes keep avatar in demo
  for (const path of ['/browse', '/terms', '/privacy']) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    await assertSignedInHeader(page, path)
  }

  // Landing overlay: signed-in (demo) should expose account trigger
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('landing-nav').waitFor({ state: 'visible', timeout: 15000 })
  const landingTrigger = page.locator('[data-testid="account-menu-trigger"]')
  record((await landingTrigger.count()) >= 1, 'landing: account-menu-trigger present')
  if ((await landingTrigger.count()) >= 1 && (await landingTrigger.first().isVisible())) {
    await landingTrigger.first().click()
    await page.getByTestId('account-menu').waitFor({ state: 'visible', timeout: 5000 })
    record(true, 'landing: account menu opens')
    await shot(page, 'landing-1440x900-avatar-menu-open.png')
  }

  await browser.close()

  console.log(JSON.stringify(summary, null, 2))
  if (!summary.ok) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
