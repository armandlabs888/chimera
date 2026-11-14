#!/usr/bin/env node
/**
 * Playwright screenshots for Refer a helper mockup screens.
 * Desktop 1280x800 + mobile 390x844.
 *
 * Run (demo mode):
 *   NEXT_PUBLIC_BEAM_DEMO_MODE=1 npm run build && npm start
 *   BASE_URL=http://127.0.0.1:43123 node scripts/refer-helper-picker-mock-screenshots.mjs
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'

mkdirSync(OUT, { recursive: true })

const VIEWS = [
  {
    name: 'picker-default',
    path: '/mock/refer-helper?view=picker&state=default&demo=1',
    ready: 'refer-helper-picker',
  },
  {
    name: 'picker-search-selected',
    path: '/mock/refer-helper?view=picker&state=search&demo=1',
    ready: 'refer-helper-picker',
  },
  {
    name: 'picker-success',
    path: '/mock/refer-helper?view=picker&state=success&demo=1',
    ready: 'refer-helper-success',
  },
  {
    name: 'helper-inbox-card',
    path: '/mock/refer-helper?view=inbox&demo=1',
    ready: 'referral-inbox-card',
  },
  {
    name: 'owner-suggested-helpers',
    path: '/mock/refer-helper?view=owner&demo=1',
    ready: 'suggested-helpers',
  },
  {
    name: 'owner-browse-panel',
    path: '/mock/refer-helper?view=owner-panel&demo=1',
    ready: 'mock-owner-browse-panel',
  },
]

const VIEWPORTS = [
  { label: '1280x800', width: 1280, height: 800, mobile: false },
  { label: '390x844', width: 390, height: 844, mobile: true },
]

async function shot(page, filename) {
  const path = join(OUT, filename)
  await page.screenshot({ path, fullPage: false })
  console.log('wrote', path)
  return path
}

async function openView(page, view) {
  await page.goto(`${BASE}${view.path}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page.getByTestId('refer-helper-mock-root').waitFor({ state: 'visible', timeout: 30000 })
  if (view.name.startsWith('picker-')) {
    // Dialog opens on picker views; ensure mock state applied.
    await page.waitForTimeout(200)
  }
  await page.getByTestId(view.ready).waitFor({ state: 'visible', timeout: 20000 })
  await page.waitForTimeout(150)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const written = []
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
      })
      const page = await context.newPage()
      for (const view of VIEWS) {
        await openView(page, view)
        const file = `refer-helper-${view.name}-${vp.label}.png`
        written.push(await shot(page, file))
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }
  console.log(JSON.stringify({ count: written.length, written }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
