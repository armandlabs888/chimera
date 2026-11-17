#!/usr/bin/env node
/**
 * Artifact screenshots for onboarding Step 1 benefits-panel top alignment.
 * Captures Neighbor + Helper at 1440x900, 1280x720, and 390px mobile.
 */
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '390x844', width: 390, height: 844 },
]

async function clearDemoOnboardingSeed(page) {
  await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => !!localStorage.getItem('beam-demo-v1'), null, {
    timeout: 20000,
  })
  await page.evaluate(() => {
    const key = 'beam-demo-v1'
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId
    state.people = (state.people || []).map((p) =>
      p.id === me
        ? {
            ...p,
            accountRole: null,
            isHelper: false,
            skills: [],
            hourlyRate: 0,
            city: null,
            stateCode: null,
            locationLabel: '',
            onboardingCompletedAt: null,
            safetyDisclaimerAcceptedAt: null,
          }
        : p,
    )
    localStorage.setItem(key, JSON.stringify(state))
  })
}

async function assertTopsAligned(page, label) {
  if (page.viewportSize()?.width < 1024) return
  const layout = await page.evaluate(() => {
    const form = document.querySelector('[data-testid="onboarding-form-column"]')
    const panel = document.querySelector(
      '[data-testid="onboarding-benefits-desktop"] [data-testid="onboarding-benefits"]',
    )
    const progress = form?.querySelector('[data-testid="onboarding-step-progress"]')
    if (!panel || !progress) return { ok: false }
    const pr = panel.getBoundingClientRect()
    const sr = progress.getBoundingClientRect()
    const wizard = document.querySelector('.account-hc-wizard')
    const align = wizard ? getComputedStyle(wizard).alignItems : ''
    return {
      ok: true,
      delta: Math.abs(pr.top - sr.top),
      panelTop: pr.top,
      progressTop: sr.top,
      alignStart: align === 'start' || align === 'flex-start',
    }
  })
  assert.equal(layout.ok, true, `${label}: missing panel/progress`)
  assert.ok(layout.delta <= 2, `${label}: tops delta=${layout.delta}`)
  assert.equal(layout.alignStart, true, `${label}: align-items start`)
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
      try {
        await clearDemoOnboardingSeed(page)
        await page.goto(`${BASE_URL}/onboarding?preview=1`, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-testid="onboarding-step-1"]')

        await page.getByTestId('onboarding-role-customer').click()
        await page
          .locator('[data-testid="onboarding-benefits"][data-role="neighbor"]:visible')
          .first()
          .waitFor({ state: 'visible' })
        await assertTopsAligned(page, `${vp.name} neighbor`)
        const neighborPath = join(OUT, `onboarding_step1_${vp.name}_neighbor.png`)
        await page.screenshot({ path: neighborPath, fullPage: false })
        console.log(`saved ${neighborPath}`)

        await page.getByTestId('onboarding-role-helper').click()
        await page
          .locator('[data-testid="onboarding-helper-verify"]:visible')
          .first()
          .waitFor({ state: 'visible' })
        await assertTopsAligned(page, `${vp.name} helper`)
        const helperPath = join(OUT, `onboarding_step1_${vp.name}_helper.png`)
        await page.screenshot({ path: helperPath, fullPage: false })
        console.log(`saved ${helperPath}`)

        console.log(`ok ${vp.name}`)
      } finally {
        await page.close()
      }
    }
    // Stable aliases matching the request wording.
    copyFileSync(
      join(OUT, 'onboarding_step1_390x844_neighbor.png'),
      join(OUT, 'onboarding_step1_390_neighbor.png'),
    )
    copyFileSync(
      join(OUT, 'onboarding_step1_390x844_helper.png'),
      join(OUT, 'onboarding_step1_390_helper.png'),
    )
    console.log('onboarding step1 align shots passed')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
