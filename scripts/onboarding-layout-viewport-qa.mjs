#!/usr/bin/env node
/**
 * Viewport-only screenshots (not fullPage) for onboarding Step 1 layout QA.
 * Confirms desktop form + benefits sit side by side without scrolling form below the fold.
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/onboarding-layout-fix'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: 'desktop-1024x768', width: 1024, height: 768 },
  { name: 'desktop-1280x720', width: 1280, height: 720 },
  { name: 'desktop-1280x800', width: 1280, height: 800 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'mobile-390x844', width: 390, height: 844 },
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

async function selectCity(page, query = 'San Jose') {
  // Already committed from a prior step in this page session.
  if ((await page.locator('[data-testid="onboarding-city-verified"]').count()) > 0) return

  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="onboarding-city-input"]')
      return el instanceof HTMLInputElement && !el.disabled
    },
    null,
    { timeout: 60000 },
  )
  const cityInput = page.getByTestId('onboarding-city-input')
  await cityInput.scrollIntoViewIfNeeded()
  await cityInput.click({ timeout: 15000 })
  await page.waitForSelector('[data-testid="onboarding-city-listbox"]')
  await cityInput.fill(query)
  await page.getByRole('option', { name: /San Jose,\s*CA/i }).first().click()
  await page.waitForSelector('[data-testid="onboarding-city-verified"]')
}

async function assertDesktopSideBySide(page, label) {
  const layout = await page.evaluate(() => {
    const form = document.querySelector('[data-testid="onboarding-form-column"]')
    const desktop = document.querySelector('[data-testid="onboarding-benefits-desktop"]')
    const panel = desktop?.querySelector('[data-testid="onboarding-benefits"]')
    const progress = form?.querySelector('[data-testid="onboarding-step-progress"]')
    const next = document.querySelector('[data-testid="onboarding-next"]')
    const roleGroup = document.querySelector('[data-testid="onboarding-role-group"]')
    const lede = form?.querySelector('p')
    if (!form || !desktop || !panel || !progress || !next || !roleGroup || !lede) return { ok: false }
    const fr = form.getBoundingClientRect()
    const br = desktop.getBoundingClientRect()
    const pr = panel.getBoundingClientRect()
    const sr = progress.getBoundingClientRect()
    const nr = next.getBoundingClientRect()
    const rr = roleGroup.getBoundingClientRect()
    const lr = lede.getBoundingClientRect()
    const vh = window.innerHeight
    return {
      ok: true,
      sideBySide: br.left > fr.right - 8,
      nextInViewport: nr.top >= 0 && nr.bottom <= vh + 1,
      rolesInViewport: rr.top >= 0 && rr.bottom <= vh + 1,
      ledeNotBelowBenefits: lr.bottom < br.bottom + 40,
      topsAligned: Math.abs(pr.top - sr.top) <= 2,
      // Content-sized panel: grid align-items start (not stretch to form height).
      panelAlignStart: (() => {
        const align = getComputedStyle(document.querySelector('.account-hc-wizard')).alignItems
        return align === 'start' || align === 'flex-start'
      })(),
      progressTop: sr.top,
      panelTop: pr.top,
      nextTop: nr.top,
      rolesTop: rr.top,
      benefitsBottom: br.bottom,
      vh,
    }
  })
  assert.equal(layout.ok, true, `${label}: missing layout nodes`)
  assert.equal(layout.sideBySide, true, `${label}: not side-by-side`)
  assert.equal(layout.rolesInViewport, true, `${label}: roles below fold (top=${layout.rolesTop})`)
  assert.equal(layout.nextInViewport, true, `${label}: Continue below fold (top=${layout.nextTop})`)
  assert.equal(layout.ledeNotBelowBenefits, true, `${label}: subtitle pushed under benefits`)
  assert.equal(
    layout.topsAligned,
    true,
    `${label}: panel top (${layout.panelTop}) must align with Step progress (${layout.progressTop})`,
  )
  assert.equal(layout.panelAlignStart, true, `${label}: wizard must use align-items start`)
}

async function assertMobileOrder(page, label) {
  const order = await page.evaluate(() => {
    const roles = document.querySelector('[data-testid="onboarding-role-group"]')
    const mobile = document.querySelector('[data-testid="onboarding-benefits-mobile"]')
    const city = [...document.querySelectorAll('label')].find((el) => /City/i.test(el.textContent || ''))
    const next = document.querySelector('[data-testid="onboarding-next"]')
    if (!roles || !mobile || !city || !next) return null
    const rr = roles.getBoundingClientRect()
    const mr = mobile.getBoundingClientRect()
    const cr = city.getBoundingClientRect()
    const nr = next.getBoundingClientRect()
    return {
      rolesThenBenefits: rr.bottom <= mr.top + 2,
      benefitsThenCity: mr.bottom <= cr.top + 8,
      cityThenContinue: cr.bottom <= nr.top + 8,
    }
  })
  assert.ok(order, `${label}: missing mobile order nodes`)
  assert.equal(order.rolesThenBenefits, true, `${label}: benefits not under roles`)
  assert.equal(order.benefitsThenCity, true, `${label}: City not under benefits`)
  assert.equal(order.cityThenContinue, true, `${label}: Continue not under City`)
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  console.log(`saved ${path}`)
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

        assert.equal(
          await page.locator('[data-testid="onboarding-header"]').count(),
          0,
          `${vp.name}: top header bar removed`,
        )
        const stepProgress = page.getByTestId('onboarding-step-progress')
        await stepProgress.waitFor({ state: 'visible' })
        const progressText = await stepProgress.innerText()
        assert.match(progressText, /Step 1 of 2/i, `${vp.name}: step progress in form`)
        assert.doesNotMatch(progressText, /\bBeam\b/, `${vp.name}: no Beam wordmark in step progress`)

        await page.getByTestId('onboarding-role-customer').click()
        await page.getByTestId('onboarding-first-name').fill('Armand')
        await page.getByTestId('onboarding-last-name').fill('Morales')
        const benefitsVisible = page.locator('[data-testid="onboarding-benefits"]:visible')
        await benefitsVisible.first().waitFor({ state: 'visible' })
        if (vp.width >= 1024) await assertDesktopSideBySide(page, `${vp.name} neighbor empty-city`)
        else await assertMobileOrder(page, `${vp.name} neighbor empty-city`)
        await shot(page, `${vp.name}-neighbor-no-city`)

        await selectCity(page)
        if (vp.width >= 1024) await assertDesktopSideBySide(page, `${vp.name} neighbor city`)
        else await assertMobileOrder(page, `${vp.name} neighbor city`)
        await shot(page, `${vp.name}-neighbor-city`)

        await page.getByTestId('onboarding-role-helper').click()
        await page
          .locator('[data-testid="onboarding-helper-verify"]:visible')
          .first()
          .waitFor({ state: 'visible' })
        if (vp.width >= 1024) await assertDesktopSideBySide(page, `${vp.name} helper city`)
        else await assertMobileOrder(page, `${vp.name} helper city`)
        await shot(page, `${vp.name}-helper-city`)

        console.log(`ok ${vp.name}`)
      } finally {
        await page.close()
      }
    }
    console.log(`onboarding layout viewport QA passed`)
    console.log(`artifacts: ${OUT}`)
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
