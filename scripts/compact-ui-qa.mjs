#!/usr/bin/env node
/**
 * Visual QA for centered helper banner + compact browse command bar.
 * Screenshots → /opt/cursor/artifacts/
 */
import assert from 'node:assert/strict'
import { mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts'
const STORAGE_KEY = 'beam-demo-v1'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
]

function save(src, name) {
  copyFileSync(src, join(OUT, name))
  copyFileSync(src, join(LOCAL, name))
}

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

async function measure(page) {
  return page.evaluate(() => {
    const banner = document.querySelector('[data-testid="helper-setup-callout"]')
    const cta = document.querySelector('[data-testid="helper-setup-banner-cta"]')
    const copy = banner?.querySelector('p')
    const commandBar =
      document.querySelector('[data-testid="browse-command-bar"] > div') ||
      document.querySelector('[data-testid="browse-command-bar"]')
    const radius =
      document.querySelector('[data-testid="browse-radius-trigger"]') ||
      document.querySelector('[data-testid="browse-when-trigger"]') ||
      document.querySelector('[data-testid="browse-availability-trigger"]')
    const ctaBox = cta?.getBoundingClientRect()
    const copyBox = copy?.getBoundingClientRect()
    let contentMidX = null
    let textCtaGap = null
    if (copyBox && ctaBox) {
      const left = Math.min(copyBox.left, ctaBox.left)
      const right = Math.max(copyBox.right, ctaBox.right)
      contentMidX = (left + right) / 2
      textCtaGap = Math.max(0, ctaBox.left - copyBox.right)
    }
    return {
      overflowX:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      contentMidX,
      textCtaGap,
      viewportMidX: window.innerWidth / 2,
      commandBarWidth: commandBar?.getBoundingClientRect().width ?? null,
      radiusWidth: radius?.getBoundingClientRect().width ?? null,
      bannerVisible: !!banner,
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
      await page.waitForSelector('[data-testid="browse-command-bar"]')

      const m = await measure(page)
      assert.equal(m.overflowX, false, `${vp.name} no x-overflow`)
      assert.equal(m.bannerVisible, true, `${vp.name} banner visible`)
      if (vp.width === 1440) {
        assert.ok(
          Math.abs(m.contentMidX - m.viewportMidX) <= 40,
          `${vp.name} banner centered mid=${m.contentMidX}`,
        )
        assert.ok(m.textCtaGap <= 400, `${vp.name} gap=${m.textCtaGap}`)
        assert.ok(m.commandBarWidth <= 780, `${vp.name} bar=${m.commandBarWidth}`)
        assert.ok(m.radiusWidth <= 220, `${vp.name} radius=${m.radiusWidth}`)
      }

      const tmp = join('/tmp', `browse-compact-${vp.name}.png`)
      await page.screenshot({ path: tmp, fullPage: false })
      save(tmp, `browse-compact-banner-${vp.name}.png`)
      console.log(
        `ok ${vp.name}: mid=${m.contentMidX?.toFixed?.(1)} gap=${m.textCtaGap?.toFixed?.(1)} bar=${m.commandBarWidth?.toFixed?.(1)} radius=${m.radiusWidth?.toFixed?.(1)}`,
      )
      await page.close()
    }

    // Guest browse (no banner) — compact bar still holds
    const guest = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await guest.goto(`${BASE_URL}/browse`, { waitUntil: 'networkidle' })
    await guest.waitForSelector('[data-testid="browse-command-bar"]')
    const gm = await measure(guest)
    assert.equal(gm.overflowX, false, 'guest no x-overflow')
    assert.ok(gm.commandBarWidth <= 780, `guest bar=${gm.commandBarWidth}`)
    assert.ok(gm.radiusWidth <= 220, `guest middle=${gm.radiusWidth}`)
    const gtmp = join('/tmp', 'browse-compact-guest-1440x900.png')
    await guest.screenshot({ path: gtmp, fullPage: false })
    save(gtmp, 'browse-compact-guest-1440x900.png')
    console.log(
      `ok guest-1440: bar=${gm.commandBarWidth?.toFixed?.(1)} middle=${gm.radiusWidth?.toFixed?.(1)}`,
    )
    await guest.close()
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
