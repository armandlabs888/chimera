#!/usr/bin/env node
/**
 * Neighbor vs helper account menu + /people neighbor gate screenshots.
 * Captures:
 *  - account menu open: neighbor + helper @ 1280x800 and 390
 *  - /people/<neighbor id> for a neighbor viewer @ 1280x800 and 390
 */
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/neighbor-helper-gate'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name, { fullPage = false } = {}) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log('wrote', join(OUT, name))
}

async function seedRole(page, { asHelper }) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, asHelper }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id !== me) continue
        if (asHelper) {
          p.accountRole = 'helper'
          p.isHelper = true
          p.skills = p.skills?.length ? p.skills : ['junk-removal', 'house-cleaning']
          p.hourlyRate = p.hourlyRate || 35
          p.rateType = p.rateType || 'hourly'
          p.serviceRadiusMiles = p.serviceRadiusMiles || 5
          p.availableNow = true
          p.availability = p.availability?.length ? p.availability : ['afternoons', 'evenings']
        } else {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
          p.availableNow = false
          p.availability = []
          p.hourlyRate = 0
          p.rateType = 'hourly'
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, asHelper },
  )
}

async function openDesktopAccountMenu(page) {
  const trigger = page.getByTestId('account-menu-trigger')
  await trigger.waitFor({ state: 'visible', timeout: 15000 })
  await trigger.click()
  await page.getByTestId('account-menu').waitFor({ state: 'visible', timeout: 10000 })
}

async function openMobileAccountMenu(page) {
  const menuBtn = page.getByRole('button', { name: /menu/i }).first()
  await menuBtn.waitFor({ state: 'visible', timeout: 15000 })
  await menuBtn.click()
  await page.getByTestId('mobile-account-links').waitFor({ state: 'visible', timeout: 10000 })
}

async function assertHelperMenuLabel(page, expected) {
  const link = page.getByTestId('account-menu-helper-link')
  await link.waitFor({ state: 'visible', timeout: 10000 })
  const text = (await link.innerText()).trim()
  assert.equal(text, expected, `expected menu label "${expected}", got "${text}"`)
  const href = await link.getAttribute('href')
  assert.ok(href?.includes('/onboarding/helper'), 'helper link should go to onboarding/helper')
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const report = { ok: true, shots: [] }
  try {
    // Neighbor account menu — desktop
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedRole(page, { asHelper: false })
      await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await openDesktopAccountMenu(page)
      await assertHelperMenuLabel(page, 'Become a helper')
      await page.waitForTimeout(200)
      await shot(page, 'account-menu-neighbor-desk.png')
      report.shots.push('account-menu-neighbor-desk.png')
      await context.close()
    }

    // Helper account menu — desktop
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedRole(page, { asHelper: true })
      await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await openDesktopAccountMenu(page)
      await assertHelperMenuLabel(page, 'Helper profile')
      await page.waitForTimeout(200)
      await shot(page, 'account-menu-helper-desk.png')
      report.shots.push('account-menu-helper-desk.png')
      await context.close()
    }

    // Neighbor account menu — mobile 390
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      })
      const page = await context.newPage()
      await seedRole(page, { asHelper: false })
      await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await openMobileAccountMenu(page)
      await assertHelperMenuLabel(page, 'Become a helper')
      await page.waitForTimeout(200)
      await shot(page, 'account-menu-neighbor-mob.png')
      report.shots.push('account-menu-neighbor-mob.png')
      await context.close()
    }

    // Helper account menu — mobile 390
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      })
      const page = await context.newPage()
      await seedRole(page, { asHelper: true })
      await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await openMobileAccountMenu(page)
      await assertHelperMenuLabel(page, 'Helper profile')
      await page.waitForTimeout(200)
      await shot(page, 'account-menu-helper-mob.png')
      report.shots.push('account-menu-helper-mob.png')
      await context.close()
    }

    // Neighbor viewing /people/<neighbor id> — desktop + mobile
    for (const vp of [
      { name: 'desk', width: 1280, height: 800, mobile: false },
      { name: 'mob', width: 390, height: 844, mobile: true },
    ]) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        ...(vp.mobile ? { isMobile: true, hasTouch: true } : {}),
      })
      const page = await context.newPage()
      await seedRole(page, { asHelper: false })
      const neighborId = await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) || '{}')
        return state.currentUserId || 'user-you'
      }, STORAGE_KEY)
      await page.goto(`${BASE}/people/${neighborId}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.getByTestId('public-helper-not-found').waitFor({ state: 'visible', timeout: 20000 })
      const body = await page.getByTestId('public-helper-not-found').innerText()
      assert.match(body, /This profile isn't available/i)
      assert.equal(await page.getByTestId('public-helper-profile').count(), 0)
      await page.waitForTimeout(200)
      const name = `people-neighbor-unavailable-${vp.name}.png`
      await shot(page, name)
      report.shots.push(name)
      await context.close()
    }

    // Neighbor hitting /you?tab=helper falls back to default you view
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedRole(page, { asHelper: false })
      await page.goto(`${BASE}/you?tab=helper&demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.getByTestId('you-page').waitFor({ state: 'visible', timeout: 20000 })
      await page.waitForFunction(() => !new URL(location.href).searchParams.get('tab'), null, {
        timeout: 10000,
      })
      assert.equal(await page.getByTestId('you-helper-section').count(), 0)
      await page.getByTestId('you-become-helper').waitFor({ state: 'visible' })
      await context.close()
    }

    writeFileSync(join(OUT, 'neighbor-helper-gate-qa.json'), JSON.stringify(report, null, 2))
    writeFileSync(join(LOCAL, 'neighbor-helper-gate-qa.json'), JSON.stringify(report, null, 2))
    console.log('neighbor-helper-gate-qa PASS')
  } catch (err) {
    report.ok = false
    report.error = String(err)
    writeFileSync(join(OUT, 'neighbor-helper-gate-qa.json'), JSON.stringify(report, null, 2))
    throw err
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
