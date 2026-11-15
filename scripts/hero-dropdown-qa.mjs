/**
 * Visual + behavior QA for the hero ZIP field (replaces Austin neighborhood picker).
 * Demo / signed-in: ZIP input. Live guests keep category (covered elsewhere).
 */
import { chromium } from 'playwright'
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const LOCAL_OUT = '/workspace/artifacts'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL_OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '390x844', width: 390, height: 844 },
]

function saveShot(src, name) {
  const dest = join(OUT, name)
  copyFileSync(src, dest)
  copyFileSync(src, join(LOCAL_OUT, name))
  return dest
}

async function assertHeroZip(page, viewportName) {
  if ((await page.getByTestId('hero-neighborhood-trigger').count()) > 0) {
    throw new Error(`Hero still exposes neighborhood trigger @ ${viewportName}`)
  }
  if ((await page.getByTestId('hero-neighborhood-listbox').count()) > 0) {
    throw new Error(`Hero still exposes neighborhood listbox @ ${viewportName}`)
  }

  const zip = page.getByTestId('hero-zip-input')
  await zip.waitFor({ state: 'visible', timeout: 15000 })
  const placeholder = await zip.getAttribute('placeholder')
  if (placeholder !== 'ZIP code') {
    throw new Error(`ZIP placeholder expected "ZIP code", got "${placeholder}"`)
  }
  const inputMode = await zip.getAttribute('inputmode')
  if (inputMode !== 'numeric') {
    throw new Error(`ZIP inputMode expected numeric, got "${inputMode}"`)
  }
  const maxLength = await zip.getAttribute('maxlength')
  if (maxLength !== '5') {
    throw new Error(`ZIP maxLength expected 5, got "${maxLength}"`)
  }

  await zip.fill('12a3b')
  const digitsOnly = await zip.inputValue()
  if (digitsOnly !== '123') {
    throw new Error(`ZIP should keep digits only, got "${digitsOnly}"`)
  }

  const shotName =
    viewportName === '1440x900'
      ? 'hero-zip-search-1440x900.png'
      : `hero-zip-search-${viewportName}.png`
  const tmp = join('/tmp', shotName)
  await page.locator('[data-testid="hero-search-pill"]').screenshot({ path: tmp })
  const artifact = saveShot(tmp, shotName)
  return { artifact }
}

async function assertFindHelpNavigation(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
  const zip = page.getByTestId('hero-zip-input')
  await zip.fill('78702')
  await page.getByRole('button', { name: 'Find help' }).click()
  await page.waitForURL(/\/browse/, { timeout: 15000 })
  // URL may briefly include zip= before Browse strips it after applying the pin.
  await page.waitForTimeout(800)
  const url = page.url()
  if (/neighborhood=/.test(url)) {
    throw new Error(`Find help unexpectedly set neighborhood: ${url}`)
  }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByTestId('hero-zip-input').fill('787')
  await page.getByRole('button', { name: 'Find help' }).click()
  await page.getByTestId('hero-zip-error').waitFor({ state: 'visible', timeout: 5000 })
  const err = await page.getByTestId('hero-zip-error').innerText()
  if (!/Enter a 5-digit ZIP/.test(err)) {
    throw new Error(`Expected gentle ZIP error, got "${err}"`)
  }
  if (!page.url().includes('/') || /\/browse/.test(page.url().replace(BASE, ''))) {
    // Still on landing when invalid
  }
  if (new URL(page.url()).pathname !== '/') {
    throw new Error(`Invalid ZIP should stay on landing, got ${page.url()}`)
  }
  return url
}

const summary = { ok: true, checks: [] }

const browser = await chromium.launch({ headless: true })
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
    const result = await assertHeroZip(page, vp.name)
    summary.checks.push({
      name: `hero-zip-${vp.name}`,
      ok: true,
      artifact: result.artifact,
    })
    console.log(`PASS hero-zip @ ${vp.name} → ${result.artifact}`)
    await context.close()
  }

  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    const url = await assertFindHelpNavigation(page)
    summary.checks.push({ name: 'find-help-zip-navigation', ok: true, url })
    console.log(`PASS find-help-zip-navigation → ${url}`)
    await context.close()
  }
} catch (err) {
  summary.ok = false
  summary.error = String(err?.stack || err)
  console.error('FAIL', err)
} finally {
  await browser.close()
  writeFileSync(join(OUT, 'hero-zip-qa.json'), JSON.stringify(summary, null, 2))
  writeFileSync(join(LOCAL_OUT, 'hero-zip-qa.json'), JSON.stringify(summary, null, 2))
  if (!summary.ok) process.exit(1)
}
