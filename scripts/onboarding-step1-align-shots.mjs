#!/usr/bin/env node
/**
 * Artifact screenshots for onboarding Step 1 benefits-panel vertical centering.
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

async function assertVerticallyCentered(page, label) {
  if (page.viewportSize()?.width < 1024) return
  const layout = await page.evaluate(() => {
    const form = document.querySelector('[data-testid="onboarding-form-column"]')
    const desktop = document.querySelector('[data-testid="onboarding-benefits-desktop"]')
    const panel = desktop?.querySelector('[data-testid="onboarding-benefits"]')
    if (!form || !desktop || !panel) return { ok: false }
    const fr = form.getBoundingClientRect()
    const pr = panel.getBoundingClientRect()
    const formCenter = (fr.top + fr.bottom) / 2
    const panelCenter = (pr.top + pr.bottom) / 2
    const selfAlign = getComputedStyle(desktop).alignSelf
    return {
      ok: true,
      centerDelta: Math.abs(panelCenter - formCenter),
      formCenter,
      panelCenter,
      panelShorter: pr.height < fr.height - 8,
      alignSelfCenter: selfAlign === 'center',
    }
  })
  assert.equal(layout.ok, true, `${label}: missing form/panel`)
  assert.ok(
    layout.centerDelta <= 8,
    `${label}: centers delta=${layout.centerDelta} (form=${layout.formCenter}, panel=${layout.panelCenter})`,
  )
  assert.equal(layout.alignSelfCenter, true, `${label}: align-self center`)
  assert.equal(layout.panelShorter, true, `${label}: panel must stay content-sized`)
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
        await assertVerticallyCentered(page, `${vp.name} neighbor`)
        const neighborPath = join(OUT, `onboarding_step1_${vp.name}_neighbor.png`)
        await page.screenshot({ path: neighborPath, fullPage: false })
        console.log(`saved ${neighborPath}`)

        await page.getByTestId('onboarding-role-helper').click()
        await page
          .locator('[data-testid="onboarding-helper-verify"]:visible')
          .first()
          .waitFor({ state: 'visible' })
        await assertVerticallyCentered(page, `${vp.name} helper`)
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
    console.log('onboarding step1 center shots passed')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
