/**
 * Visual + hit-target QA for the hero neighborhood dropdown stacking fix.
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

async function assertDropdownOnTop(page, viewportName) {
  const trigger = page.getByTestId('hero-neighborhood-trigger')
  await trigger.click()
  const listbox = page.getByTestId('hero-neighborhood-listbox')
  await listbox.waitFor({ state: 'visible' })

  const hit = await page.evaluate(() => {
    const box = document.querySelector('[data-testid="hero-neighborhood-listbox"]')
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
      const inListbox = !!(el && (el.closest('[data-testid="hero-neighborhood-listbox"]') || el === box))
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

  const tmp = join('/tmp', `hero-dropdown-open-${viewportName}.png`)
  await page.screenshot({ path: tmp, fullPage: false })
  const artifact = saveShot(tmp, `hero-dropdown-open-${viewportName}.png`)

  if (!hit.ok) {
    throw new Error(
      `Dropdown obstructed @ ${viewportName}: ${JSON.stringify(hit, null, 2)} (shot=${artifact})`,
    )
  }

  // Select East Austin and verify trigger label
  await listbox.getByRole('option', { name: 'East Austin' }).click()
  await page.waitForTimeout(150)
  const label = await trigger.innerText()
  if (!label.includes('East Austin')) {
    throw new Error(`Trigger label not updated after select: "${label}"`)
  }

  // Re-open briefly for escape/outside-click checks on desktop only once later
  return { artifact, hit }
}

async function assertFindHelpNavigation(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
  const trigger = page.getByTestId('hero-neighborhood-trigger')
  await trigger.click()
  await page.getByTestId('hero-neighborhood-listbox').getByRole('option', { name: 'East Austin' }).click()
  await page.getByRole('button', { name: 'Find help' }).click()
  await page.waitForURL(/\/browse\?.*neighborhood=east-austin/, { timeout: 15000 })
  const url = page.url()
  if (!url.includes('neighborhood=east-austin')) {
    throw new Error(`Find help did not navigate with neighborhood filter: ${url}`)
  }
  return url
}

async function assertDismissBehaviors(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
  const trigger = page.getByTestId('hero-neighborhood-trigger')
  await trigger.click()
  await page.getByTestId('hero-neighborhood-listbox').waitFor({ state: 'visible' })
  await page.keyboard.press('Escape')
  await page.getByTestId('hero-neighborhood-listbox').waitFor({ state: 'hidden', timeout: 3000 })

  await trigger.click()
  await page.getByTestId('hero-neighborhood-listbox').waitFor({ state: 'visible' })
  // Click outside on the headline
  await page.locator('h1').click({ position: { x: 10, y: 10 } })
  await page.getByTestId('hero-neighborhood-listbox').waitFor({ state: 'hidden', timeout: 3000 })
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
      name: `dropdown-on-top-${vp.name}`,
      ok: true,
      artifact: result.artifact,
      hit: result.hit,
    })
    console.log(`PASS dropdown-on-top @ ${vp.name} → ${result.artifact}`)
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
