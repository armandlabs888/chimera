/**
 * Capture desktop (1280) + mobile (390) screenshots of the ZIP posting form:
 * resolved ZIP state and invalid ZIP error.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log('wrote', path)
}

async function capture(context, suffix, width, height) {
  const page = await context.newPage()
  await page.setViewportSize({ width, height })
  await page.goto(`${BASE}/post?demo=1`, { waitUntil: 'networkidle' })

  const zip = page.getByTestId('post-zip')
  await zip.waitFor({ state: 'visible', timeout: 20000 })
  await zip.scrollIntoViewIfNeeded()

  // Resolved ZIP
  await zip.fill('95124')
  await page.getByTestId('post-zip-resolved').waitFor({ state: 'visible', timeout: 10000 })
  await shot(page, `post-zip-resolved-${suffix}.png`)

  // Invalid ZIP error
  await zip.fill('00000')
  await page.getByTestId('post-zip-error').waitFor({ state: 'visible', timeout: 10000 })
  await shot(page, `post-zip-invalid-${suffix}.png`)

  await page.close()
}

const browser = await chromium.launch({ headless: true })
try {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })
  await capture(desktop, 'desktop', 1280, 900)
  await desktop.close()

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  await capture(mobile, 'mobile', 390, 844)
  await mobile.close()
} finally {
  await browser.close()
}

console.log('done')
