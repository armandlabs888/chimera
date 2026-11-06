#!/usr/bin/env node
/**
 * Playwright visual QA for:
 * - /onboarding/helper (white studio, no post CTA, UsCityCombobox)
 * - /requests/[id] (2-column desktop, subtle radii, open-budget empty price)
 * - /browse (subtle 12px card corners)
 *
 * Screenshots → /opt/cursor/artifacts/helper-request-visual-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/helper-request-visual-qa'
const STORAGE_KEY = 'beam-demo-v1'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
]

async function seedHelperPrefill(page) {
  await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!localStorage.getItem('beam-demo-v1'), null, {
    timeout: 15000,
  })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    state.people = (state.people || []).map((p) =>
      p.id === state.currentUserId
        ? {
            ...p,
            accountRole: 'helper',
            isHelper: false,
            name: p.name || 'Kuni',
            city: 'San Jose',
            stateCode: 'CA',
            locationLabel: 'San Jose, CA',
            skills: ['moving'],
            hourlyRate: 35,
            rateType: 'hourly',
            serviceRadiusMiles: 5,
            onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
            safetyDisclaimerAcceptedAt:
              p.safetyDisclaimerAcceptedAt || new Date().toISOString(),
          }
        : p,
    )
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function probeHelper(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="helper-onboarding-root"]')
    const form = document.querySelector('[data-testid="helper-onboarding-form"]')
    const shell = document.querySelector('.app-shell')
    const legends = document.querySelectorAll('legend').length
    const postCta = document.querySelectorAll('[data-testid="topnav-post-cta"]').length
    const uppercaseKickers = /HELPER SETUP|SERVICE RADIUS|\bSKILLS\b|\bRATE\b/.test(
      document.body.innerText,
    )
    const formShadow = form ? getComputedStyle(form).boxShadow : 'none'
    const shellBg = shell ? getComputedStyle(shell).backgroundColor : ''
    return {
      hasRoot: !!root,
      legends,
      postCta,
      uppercaseKickers,
      formShadow,
      shellBg,
      overflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      cityVerified: !!document.querySelector('[data-testid="onboarding-city-verified"]'),
      cityInput: !!document.querySelector('[data-testid="onboarding-city-input"]'),
      skills: !!document.querySelector('[data-testid="helper-skills-grid"]'),
    }
  })
}

async function probeRequest(page) {
  return page.evaluate(() => {
    const left = document.querySelector('[data-testid="request-detail-left"]')
    const right = document.querySelector('[data-testid="request-detail-right"]')
    const lr = left?.getBoundingClientRect()
    const rr = right?.getBoundingClientRect()
    const cards = [
      ...document.querySelectorAll(
        '[data-testid="request-budget-card"], [data-testid="request-detail-left"] article',
      ),
    ]
    return {
      hasGrid: !!document.querySelector('[data-testid="request-detail-grid"]'),
      sideBySide: Boolean(lr && rr && rr.left >= lr.right - 4),
      bothAboveFold: Boolean(lr && rr && lr.top < window.innerHeight && rr.top < window.innerHeight),
      maxRadius: Math.max(
        0,
        ...cards.map((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0),
      ),
      hasUppercaseEta: /WHEN YOU CAN START/.test(document.body.innerText),
      overflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      offerPrice: document.querySelector('[data-testid="offer-price-input"]')?.value ?? null,
    }
  })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      })

      // --- Helper onboarding ---
      await seedHelperPrefill(page)
      await page.goto(`${BASE_URL}/onboarding/helper`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-testid="helper-onboarding-root"]', { timeout: 15000 })
      // Select a couple skills for the filled screenshot
      await page.getByTestId('helper-skill-moving').click().catch(() => {})
      await page.getByTestId('helper-skill-handyman').click().catch(() => {})

      const helperProbe = await probeHelper(page)
      assert.equal(helperProbe.hasRoot, true, `${vp.name} helper root`)
      assert.equal(helperProbe.postCta, 0, `${vp.name} no topnav-post-cta`)
      assert.equal(helperProbe.legends, 0, `${vp.name} no legends`)
      assert.equal(helperProbe.uppercaseKickers, false, `${vp.name} no uppercase kickers`)
      assert.equal(helperProbe.overflow, false, `${vp.name} helper overflow`)
      assert.ok(
        helperProbe.formShadow === 'none' ||
          /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(helperProbe.formShadow),
        `${vp.name} no outer form card shadow (${helperProbe.formShadow})`,
      )
      assert.ok(
        helperProbe.cityVerified || helperProbe.cityInput,
        `${vp.name} UsCityCombobox present`,
      )

      await page.screenshot({
        path: join(OUT, `helper-onboarding-${vp.name}.png`),
        fullPage: true,
      })
      if (vp.width === 390) {
        await page.evaluate(() => window.scrollTo(0, 600))
        await page.screenshot({
          path: join(OUT, `helper-onboarding-${vp.name}-scrolled.png`),
          fullPage: false,
        })
      }

      // --- Request detail: helper offer view (req-1) ---
      await page.goto(`${BASE_URL}/requests/req-1`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-testid="request-detail-root"]', { timeout: 15000 })
      const helperView = await probeRequest(page)
      assert.equal(helperView.hasGrid, true, `${vp.name} request grid`)
      assert.equal(helperView.hasUppercaseEta, false, `${vp.name} no WHEN YOU CAN START`)
      assert.equal(helperView.overflow, false, `${vp.name} request overflow`)
      assert.ok(helperView.maxRadius <= 14, `${vp.name} request card radius ${helperView.maxRadius}`)
      if (vp.width >= 1024) {
        assert.equal(helperView.sideBySide, true, `${vp.name} 2-column side-by-side`)
        assert.equal(helperView.bothAboveFold, true, `${vp.name} both columns above fold`)
      }
      await page.screenshot({
        path: join(OUT, `request-helper-offer-${vp.name}.png`),
        fullPage: true,
      })

      // Open-budget empty price
      await page.goto(`${BASE_URL}/requests/req-3`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-testid="request-detail-root"]', { timeout: 15000 })
      const openBudget = await probeRequest(page)
      if (openBudget.offerPrice != null) {
        assert.notEqual(openBudget.offerPrice, '0', `${vp.name} open budget not 0`)
        assert.equal(openBudget.offerPrice, '', `${vp.name} open budget empty`)
      }
      await page.screenshot({
        path: join(OUT, `request-open-budget-${vp.name}.png`),
        fullPage: false,
      })

      // --- Request detail: owner incoming offers ---
      await page.goto(`${BASE_URL}/requests/req-you-open`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-testid="request-detail-root"]', { timeout: 15000 })
      assert.ok(
        (await page.getByTestId('request-incoming-offers').count()) +
          (await page.getByTestId('request-nearby-matches').count()) >=
          1,
        `${vp.name} owner panels present`,
      )
      await page.screenshot({
        path: join(OUT, `request-owner-offers-${vp.name}.png`),
        fullPage: true,
      })

      // --- Browse subtle cards ---
      await page.goto(`${BASE_URL}/browse`, { waitUntil: 'networkidle' })
      await page.waitForSelector('a[href^="/requests/"]', { timeout: 15000 })
      const browseMax = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('a[href^="/requests/"]')].slice(0, 6)
        return Math.max(0, ...cards.map((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0))
      })
      assert.ok(browseMax > 0 && browseMax <= 14, `${vp.name} browse radius ${browseMax}`)
      await page.screenshot({
        path: join(OUT, `browse-cards-${vp.name}.png`),
        fullPage: false,
      })

      console.log(`ok ${vp.name}`)
      await page.close()
    }
    console.log(`helper-request-visual-qa screenshots → ${OUT}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
