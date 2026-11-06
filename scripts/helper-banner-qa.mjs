#!/usr/bin/env node
/**
 * Playwright visual QA for the helper setup top banner.
 * Saves screenshots to /opt/cursor/artifacts/helper-banner-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/helper-banner-qa'
const STORAGE_KEY = 'beam-demo-v1'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
]

async function seedHelperIncomplete(page) {
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
            onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
            safetyDisclaimerAcceptedAt:
              p.safetyDisclaimerAcceptedAt || new Date().toISOString(),
          }
        : p,
    )
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function probeBanner(page) {
  return page.evaluate(() => {
    const banner = document.querySelector('[data-testid="helper-setup-callout"]')
    const nav = document.querySelector('[data-testid="app-topnav"]')
    const cta = document.querySelector('[data-testid="helper-setup-banner-cta"]')
    const bannerBox = banner?.getBoundingClientRect()
    const navBox = nav?.getBoundingClientRect()
    return {
      bannerCount: banner ? 1 : 0,
      navCount: nav ? 1 : 0,
      ctaCount: cta ? 1 : 0,
      bannerY: bannerBox?.y ?? null,
      bannerH: bannerBox?.height ?? null,
      navY: navBox?.y ?? null,
      overflowX:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      bodyText: document.body.innerText.slice(0, 400),
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
      await seedHelperIncomplete(page)
      await page.goto(`${BASE_URL}/browse`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-testid="helper-setup-callout"]', { timeout: 15000 })
      await page.waitForSelector('[data-testid="app-topnav"]')

      const browseProbe = await probeBanner(page)
      assert.equal(browseProbe.bannerCount, 1, `${vp.name} banner visible`)
      assert.equal(browseProbe.ctaCount, 1, `${vp.name} CTA visible`)
      assert.ok(
        browseProbe.bannerY < browseProbe.navY,
        `${vp.name} banner above nav (${browseProbe.bannerY} < ${browseProbe.navY})`,
      )
      assert.ok(
        browseProbe.bannerY + browseProbe.bannerH <= browseProbe.navY + 1,
        `${vp.name} banner bottoms at nav top`,
      )
      assert.equal(browseProbe.overflowX, false, `${vp.name} no horizontal overflow`)

      await page.screenshot({
        path: join(OUT, `browse-banner-${vp.name}.png`),
        fullPage: false,
      })

      await page.getByTestId('helper-setup-banner-cta').click()
      await page.waitForURL(/\/onboarding\/helper/, { timeout: 15000 })
      await page.waitForSelector('[data-testid="app-topnav"]', { timeout: 15000 })
      const helperProbe = await probeBanner(page)
      assert.equal(helperProbe.bannerCount, 0, `${vp.name} banner hidden on helper onboarding`)
      assert.equal(helperProbe.navCount, 1, `${vp.name} topnav still present`)

      await page.screenshot({
        path: join(OUT, `helper-onboarding-no-banner-${vp.name}.png`),
        fullPage: false,
      })

      console.log(
        `ok ${vp.name}: browse banner y=${browseProbe.bannerY} h=${browseProbe.bannerH} navY=${browseProbe.navY}; helper page banner hidden`,
      )
      await page.close()
    }
    console.log(`helper-banner-qa screenshots → ${OUT}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
