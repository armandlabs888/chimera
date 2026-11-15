/**
 * Screenshots for hero ZIP search (1440 + 390) and Browse after ZIP 78702.
 */
import { chromium } from 'playwright'
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

function save(src, name) {
  copyFileSync(src, join(OUT, name))
  copyFileSync(src, join(LOCAL, name))
  return join(OUT, name)
}

const summary = { ok: true, shots: [] }

const browser = await chromium.launch({ headless: true })
try {
  for (const vp of [
    { name: '1440', width: 1440, height: 900 },
    { name: '390', width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.getByTestId('hero-zip-input').waitFor({ state: 'visible' })
    // Clear prefill noise for a clean placeholder shot, then type 78702 for realism
    await page.getByTestId('hero-zip-input').fill('78702')
    const tmp = join('/tmp', `hero-zip-search-${vp.name}.png`)
    await page.locator('[data-testid="hero-search-pill"]').screenshot({ path: tmp })
    const path = save(tmp, `hero-zip-search-${vp.name}.png`)
    // Full hero viewport too
    const fullTmp = join('/tmp', `hero-zip-viewport-${vp.name}.png`)
    await page.screenshot({ path: fullTmp, fullPage: false })
    const fullPath = save(fullTmp, `hero-zip-viewport-${vp.name}.png`)
    summary.shots.push({ name: `hero-search-${vp.name}`, path, fullPath })
    console.log(`saved ${path}`)
    await context.close()
  }

  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.getByTestId('hero-zip-input').fill('78702')
    await page.getByRole('button', { name: 'Find help' }).click()
    await page.waitForURL(/\/browse/, { timeout: 15000 })
    await page.waitForTimeout(1200)
    // Area pill / distance chrome should reflect home area
    const tmp = join('/tmp', 'browse-after-zip-78702.png')
    await page.screenshot({ path: tmp, fullPage: false })
    const path = save(tmp, 'browse-after-zip-78702.png')
    summary.shots.push({ name: 'browse-after-zip-78702', path, url: page.url() })
    console.log(`saved ${path} url=${page.url()}`)
    await context.close()
  }
} catch (err) {
  summary.ok = false
  summary.error = String(err?.stack || err)
  console.error(err)
} finally {
  await browser.close()
  writeFileSync(join(OUT, 'hero-zip-screenshots.json'), JSON.stringify(summary, null, 2))
  writeFileSync(join(LOCAL, 'hero-zip-screenshots.json'), JSON.stringify(summary, null, 2))
  if (!summary.ok) process.exit(1)
}
