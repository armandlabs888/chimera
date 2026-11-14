#!/usr/bin/env node
/**
 * /you Profile & account redesign screenshots.
 * Seeds a demo helper and demo neighbor, captures 1280x800 and 390-wide viewports
 * (viewport crops, not full-page).
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

async function seedRole(page, role) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, role: nextRole }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id !== me) continue
        if (nextRole === 'helper') {
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
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, role },
  )
}

async function setDemoVerification(page, status) {
  await page.evaluate((s) => {
    const fn = window.__BEAM_SET_DEMO_VERIFICATION__
    if (typeof fn !== 'function') throw new Error('Demo verification hook missing')
    fn(s)
  }, status)
  await page.waitForTimeout(150)
}

async function captureVariant(browser, role, prefix) {
  for (const vp of [
    { name: 'desk', width: 1280, height: 800 },
    { name: 'mob', width: 390, height: 844, isMobile: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: Boolean(vp.isMobile),
      hasTouch: Boolean(vp.isMobile),
    })
    const page = await context.newPage()
    await seedRole(page, role)
    await page.goto(`${BASE}/you?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.getByTestId('you-page').waitFor({ state: 'visible', timeout: 20000 })
    await page.getByTestId('helper-profile-hero').waitFor({ state: 'visible' })
    if (role === 'helper') {
      await setDemoVerification(page, 'unverified')
      await page.getByTestId('you-link-get-verified').waitFor({ state: 'visible' })
    } else {
      await page.getByTestId('you-become-helper').waitFor({ state: 'visible' })
    }
    await page.waitForTimeout(250)
    await shot(page, `${prefix}-${vp.name}.png`)
    await context.close()
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    await captureVariant(browser, 'helper', 'you-helper')
    await captureVariant(browser, 'neighbor', 'you-neighbor')
  } finally {
    await browser.close()
  }
  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
