/**
 * Visual + hit-target QA for the guest hero Category dropdown stacking fix.
 * Signed-out guests must never see Austin neighborhood picker options.
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

const AUSTIN_NEIGHBORHOODS = [
  'East Austin',
  'Hyde Park',
  'Mueller',
  'Zilker',
  'South Congress',
  'Travis Heights',
  'Clarksville',
  'The Domain',
]

function saveShot(src, name) {
  const dest = join(OUT, name)
  copyFileSync(src, dest)
  copyFileSync(src, join(LOCAL_OUT, name))
  return dest
}

async function assertNoAustinNeighborhoodOptions(page, scopeLabel) {
  const body = await page.locator('body').innerText()
  // Open dropdown text is checked separately; closed page may still show card metadata.
  // Specifically assert the hero listbox never exposes Austin neighborhood options.
  const hasNeighborhoodTrigger = (await page.getByTestId('hero-neighborhood-trigger').count()) > 0
  if (hasNeighborhoodTrigger) {
    throw new Error(`Guest hero still exposes neighborhood trigger @ ${scopeLabel}`)
  }
  const listboxCount = await page.getByTestId('hero-neighborhood-listbox').count()
  if (listboxCount > 0) {
    throw new Error(`Guest hero still exposes neighborhood listbox @ ${scopeLabel}`)
  }
  return body
}

async function assertDropdownOnTop(page, viewportName) {
  await assertNoAustinNeighborhoodOptions(page, viewportName)

  const trigger = page.getByTestId('hero-category-trigger')
  await trigger.click()
  const listbox = page.getByTestId('hero-category-listbox')
  await listbox.waitFor({ state: 'visible' })

  const listText = await listbox.innerText()
  for (const name of AUSTIN_NEIGHBORHOODS) {
    if (listText.includes(name)) {
      throw new Error(`Guest hero category listbox includes Austin neighborhood "${name}"`)
    }
  }
  if (!/All categories/i.test(listText) || !/Moving & lifting/i.test(listText)) {
    throw new Error(`Guest hero category listbox missing expected options: ${listText.slice(0, 200)}`)
  }

  const hit = await page.evaluate(() => {
    const box = document.querySelector('[data-testid="hero-category-listbox"]')
    if (!box) return { ok: false, reason: 'listbox missing' }
    const rect = box.getBoundingClientRect()
    const points = [
      { label: 'center', x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      { label: 'bottom', x: rect.left + rect.width / 2, y: rect.bottom - 8 },
      { label: 'lower-third', x: rect.left + rect.width / 2, y: rect.top + (rect.height * 2) / 3 },
    ]
    const fan = document.querySelector('[data-testid="hero-fan-stack"]')
    const results = points.map(({ label, x, y }) => {
      const el = document.elementFromPoint(x, y)
      const inListbox = !!(el && (el.closest('[data-testid="hero-category-listbox"]') || el === box))
      const inFan = !!(el && fan && (fan.contains(el) || el.closest('[data-testid="hero-fan-stack"]')))
      return {
        label,
        x,
        y,
        tag: el?.tagName?.toLowerCase() ?? null,
        testId: el?.closest?.('[data-testid]')?.getAttribute('data-testid') ?? null,
        inListbox,
        inFan,
        text: (el?.textContent || '').trim().slice(0, 40),
      }
    })
    return {
      ok: results.every((r) => r.inListbox && !r.inFan),
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height },
      results,
    }
  })

  const shotName =
    viewportName === '1440x900'
      ? 'guest-hero-category-open-1440x900.png'
      : `guest-hero-category-open-${viewportName}.png`
  const tmp = join('/tmp', shotName)
  await page.screenshot({ path: tmp, fullPage: false })
  const artifact = saveShot(tmp, shotName)

  if (!hit.ok) {
    throw new Error(
      `Category dropdown obstructed @ ${viewportName}: ${JSON.stringify(hit, null, 2)} (shot=${artifact})`,
    )
  }

  await listbox.getByRole('option', { name: 'Moving & lifting' }).click()
  await page.waitForTimeout(150)
  const label = await trigger.innerText()
  if (!label.includes('Moving & lifting')) {
    throw new Error(`Trigger label not updated after select: "${label}"`)
  }

  return { artifact, hit }
}

async function assertFindHelpNavigation(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
  const trigger = page.getByTestId('hero-category-trigger')
  await trigger.click()
  await page.getByTestId('hero-category-listbox').getByRole('option', { name: 'Home cleaning' }).click()
  await page.getByRole('button', { name: 'Find help' }).click()
  await page.waitForURL(/\/browse\?.*category=cleaning/, { timeout: 15000 })
  const url = page.url()
  if (!url.includes('category=cleaning')) {
    throw new Error(`Find help did not navigate with category filter: ${url}`)
  }
  if (/neighborhood=/.test(url)) {
    throw new Error(`Guest Find help unexpectedly set neighborhood: ${url}`)
  }
  return url
}

async function assertDismissBehaviors(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
  const trigger = page.getByTestId('hero-category-trigger')
  await trigger.click()
  await page.getByTestId('hero-category-listbox').waitFor({ state: 'visible' })
  await page.keyboard.press('Escape')
  await page.getByTestId('hero-category-listbox').waitFor({ state: 'hidden', timeout: 3000 })

  await trigger.click()
  await page.getByTestId('hero-category-listbox').waitFor({ state: 'visible' })
  await page.locator('h1').click({ position: { x: 10, y: 10 } })
  await page.getByTestId('hero-category-listbox').waitFor({ state: 'hidden', timeout: 3000 })
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
    const result = await assertDropdownOnTop(page, vp.name)
    summary.checks.push({
      name: `category-dropdown-on-top-${vp.name}`,
      ok: true,
      artifact: result.artifact,
      hit: result.hit,
    })
    console.log(`PASS category-dropdown-on-top @ ${vp.name} → ${result.artifact}`)
    await context.close()
  }

  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await assertDismissBehaviors(page)
    summary.checks.push({ name: 'escape-and-outside-click', ok: true })
    console.log('PASS escape-and-outside-click')

    const url = await assertFindHelpNavigation(page)
    summary.checks.push({ name: 'find-help-navigation', ok: true, url })
    console.log(`PASS find-help-navigation → ${url}`)
    await context.close()
  }
} catch (err) {
  summary.ok = false
  summary.error = String(err?.stack || err)
  console.error('FAIL', err)
} finally {
  await browser.close()
}

writeFileSync(join(OUT, 'hero-dropdown-qa-summary.json'), JSON.stringify(summary, null, 2))
writeFileSync(join(LOCAL_OUT, 'hero-dropdown-qa-summary.json'), JSON.stringify(summary, null, 2))
console.log('\nSUMMARY', JSON.stringify({ ok: summary.ok, checks: summary.checks.map((c) => c.name) }))
if (!summary.ok) process.exit(1)
