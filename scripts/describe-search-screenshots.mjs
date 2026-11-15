/**
 * Screenshots for describe-your-request hero + /match (1440 and 390).
 * Demo mode is fine.
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

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
]

const summary = { ok: true, shots: [], failures: [] }

const browser = await chromium.launch({ headless: true })
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    // 1) Hero idle
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.getByTestId('landing-hero').waitFor({ state: 'visible', timeout: 15000 })
    await page.getByTestId('hero-search-pill').waitFor({ state: 'visible' })
    await page.evaluate(() => document.documentElement.setAttribute('data-shot', '1'))
    // Prefer empty ZIP for cleaner hero shot when no known location in demo.
    const zip = page.getByTestId('hero-zip-input')
    if (await zip.count()) await zip.fill('')
    await page.waitForTimeout(400)
    {
      const tmp = join('/tmp', `describe-hero-${vp.name}.png`)
      await page.screenshot({ path: tmp, fullPage: false })
      summary.shots.push(save(tmp, `describe-hero-${vp.name}.png`))
    }

    // 2) Hero while typing (suggestions open)
    await page.getByTestId('describe-query-input').fill('Looking for a weekly house cleaner')
    await page.getByTestId('hero-zip-input').fill('95131')
    await page.waitForTimeout(500)
    await page.getByTestId('describe-suggest-listbox').waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300)
    {
      const tmp = join('/tmp', `describe-hero-typing-${vp.name}.png`)
      await page.screenshot({ path: tmp, fullPage: false })
      summary.shots.push(save(tmp, `describe-hero-typing-${vp.name}.png`))
    }

    // 3) Neighbor match results
    await page.goto(
      `${BASE}/match?q=${encodeURIComponent('Looking for a weekly house cleaner')}&zip=95131&intent=helpers&category=house-cleaning`,
      { waitUntil: 'networkidle', timeout: 60000 },
    )
    await page.getByTestId('match-page').waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(800)
    {
      const tmp = join('/tmp', `describe-match-helpers-${vp.name}.png`)
      await page.screenshot({ path: tmp, fullPage: false })
      summary.shots.push(save(tmp, `describe-match-helpers-${vp.name}.png`))
    }

    // 4) Helper / jobs match results
    await page.goto(
      `${BASE}/match?q=${encodeURIComponent('I need to find new jobs')}&zip=95131&intent=jobs`,
      { waitUntil: 'networkidle', timeout: 60000 },
    )
    await page.getByTestId('match-page').waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForTimeout(800)
    {
      const tmp = join('/tmp', `describe-match-jobs-${vp.name}.png`)
      await page.screenshot({ path: tmp, fullPage: false })
      summary.shots.push(save(tmp, `describe-match-jobs-${vp.name}.png`))
    }

    await context.close()
  }
} catch (err) {
  summary.ok = false
  summary.failures.push(String(err?.stack || err))
  console.error(err)
} finally {
  await browser.close()
  writeFileSync(join(OUT, 'describe-search-screenshots.json'), JSON.stringify(summary, null, 2))
  writeFileSync(join(LOCAL, 'describe-search-screenshots.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
  if (!summary.ok) process.exit(1)
}
