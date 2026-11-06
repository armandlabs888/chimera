/**
 * Browse marketplace daylight refactor visual QA.
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
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
]

function saveShot(src, name) {
  const dest = join(OUT, name)
  copyFileSync(src, dest)
  copyFileSync(src, join(LOCAL_OUT, name))
  return dest
}

const summary = { ok: true, checks: [] }

function fail(msg) {
  summary.ok = false
  throw new Error(msg)
}

async function measurePage(page) {
  return page.evaluate(() => {
    const broken = Array.from(document.images).filter(
      (img) => img.complete && img.naturalWidth === 0 && img.src,
    )
    const bodyText = document.body?.innerText || ''
    const cardLinks = Array.from(
      document.querySelectorAll('a[href^="/requests/"], a[href^="/people/"]'),
    ).filter((a) => a.querySelector('h3'))
    const rows = new Map()
    for (const el of cardLinks) {
      const r = el.getBoundingClientRect()
      if (r.width < 40 || r.height < 40) continue
      const key = Math.round(r.top)
      if (!rows.has(key)) rows.set(key, [])
      rows.get(key).push(Math.round(r.height))
    }
    const unequalRows = []
    for (const [top, heights] of rows) {
      if (heights.length < 2) continue
      const max = Math.max(...heights)
      const min = Math.min(...heights)
      if (max - min > 2) unequalRows.push({ top, min, max, heights })
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      broken: broken.map((i) => i.src),
      hasDebugFree: /free=1/.test(bodyText),
      hasDebugQ: /\bq:\s/.test(bodyText),
      hasEastAustinChipWall: (bodyText.match(/East Austin/g) || []).length > 2,
      guestAustinHeader: /across Austin neighborhoods|Open requests and nearby helpers across Austin/i.test(
        bodyText.split('\n').slice(0, 20).join('\n'),
      ),
      unequalRows,
      h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      areaLabel:
        document.querySelector('[data-testid="browse-neighborhood-trigger"]')?.textContent?.replace(
          /\s+/g,
          ' ',
        ).trim() || '',
    }
  })
}

const browser = await chromium.launch({ headless: true })
try {
  // Desktop requests + dropdown + filters
  {
    const vp = VIEWPORTS[0]
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('text=Browse tasks', { timeout: 15000 })

    let metrics = await measurePage(page)
    if (metrics.scrollWidth > metrics.innerWidth + 1) {
      fail(`Horizontal overflow on /browse @ ${vp.name}: ${metrics.scrollWidth}>${metrics.innerWidth}`)
    }
    if (metrics.broken.length) fail(`Broken images on /browse: ${metrics.broken.join(', ')}`)
    if (metrics.hasDebugFree || metrics.hasDebugQ) fail('Raw debug filter strings visible on /browse')
    if (metrics.guestAustinHeader) fail('Guest /browse header assumes Austin')
    if (!/All neighborhoods/i.test(metrics.areaLabel)) {
      fail(`Area default should be All neighborhoods, got "${metrics.areaLabel}"`)
    }
    if (metrics.unequalRows.length) {
      fail(`Unequal card heights on /browse: ${JSON.stringify(metrics.unequalRows)}`)
    }

    const reqShot = join('/tmp', 'browse-requests-1440x900.png')
    await page.screenshot({ path: reqShot, fullPage: false })
    saveShot(reqShot, 'browse-requests-1440x900.png')
    summary.checks.push({ name: 'browse-requests-1440x900', ok: true, metrics })

    // Open neighborhood dropdown
    await page.getByTestId('browse-neighborhood-trigger').click()
    await page.getByTestId('browse-neighborhood-listbox').waitFor({ state: 'visible' })
    const dropShot = join('/tmp', 'browse-dropdown-1440x900.png')
    await page.screenshot({ path: dropShot, fullPage: false })
    saveShot(dropShot, 'browse-dropdown-1440x900.png')
    summary.checks.push({ name: 'browse-dropdown-1440x900', ok: true })

    // Activate filters for human pills
    await page.getByRole('option', { name: 'East Austin' }).click()
    await page.getByRole('button', { name: /^Moving$/ }).click()
    await page.getByLabel('Search browse').fill('couch')
    await page.waitForTimeout(400)
    const filterText = await page.locator('body').innerText()
    if (/free=1|\bq:\s/.test(filterText)) fail('Debug filter pills still present after filtering')
    if (!/Search:\s*couch/i.test(filterText)) fail('Missing human Search filter pill')
    if (!/East Austin/i.test(filterText) || !/Moving/i.test(filterText)) {
      fail('Missing human neighborhood/category filter pills')
    }
    const filterShot = join('/tmp', 'browse-filters-1440x900.png')
    await page.screenshot({ path: filterShot, fullPage: false })
    saveShot(filterShot, 'browse-filters-1440x900.png')
    summary.checks.push({ name: 'browse-filters-1440x900', ok: true })

    // Helpers tab desktop
    await page.goto(`${BASE}/browse?tab=people`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('text=Local helpers', { timeout: 15000 })
    metrics = await measurePage(page)
    if (metrics.scrollWidth > metrics.innerWidth + 1) {
      fail(`Horizontal overflow on helpers @ ${vp.name}`)
    }
    if (metrics.broken.length) fail(`Broken images on helpers: ${metrics.broken.join(', ')}`)
    if (metrics.unequalRows.length) {
      fail(`Unequal helper card heights: ${JSON.stringify(metrics.unequalRows)}`)
    }
    const helpersShot = join('/tmp', 'browse-helpers-1440x900.png')
    await page.screenshot({ path: helpersShot, fullPage: false })
    saveShot(helpersShot, 'browse-helpers-1440x900.png')
    summary.checks.push({ name: 'browse-helpers-1440x900', ok: true, metrics })

    await context.close()
  }

  // Remaining viewports smoke geometry
  for (const vp of VIEWPORTS.slice(1)) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('text=Browse tasks', { timeout: 15000 })
    let metrics = await measurePage(page)
    if (metrics.scrollWidth > metrics.innerWidth + 1) {
      fail(`Horizontal overflow /browse @ ${vp.name}`)
    }
    if (metrics.broken.length) fail(`Broken images /browse @ ${vp.name}`)
    if (metrics.hasDebugFree || metrics.hasDebugQ) fail(`Debug strings @ ${vp.name}`)
    if (metrics.guestAustinHeader) fail(`Austin header @ ${vp.name}`)

    await page.goto(`${BASE}/browse?tab=people`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('text=Local helpers', { timeout: 15000 })
    metrics = await measurePage(page)
    if (metrics.scrollWidth > metrics.innerWidth + 1) {
      fail(`Horizontal overflow helpers @ ${vp.name}`)
    }

    if (vp.name === '390x844') {
      const mobileShot = join('/tmp', 'browse-mobile-390x844.png')
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('text=Browse tasks', { timeout: 15000 })
      await page.screenshot({ path: mobileShot, fullPage: false })
      saveShot(mobileShot, 'browse-mobile-390x844.png')
      summary.checks.push({ name: 'browse-mobile-390x844', ok: true })
    }

    summary.checks.push({ name: `browse-geometry-${vp.name}`, ok: true, metrics })
    console.log(`PASS geometry @ ${vp.name}`)
    await context.close()
  }

  console.log('ALL PASS')
} catch (err) {
  summary.ok = false
  summary.error = String(err?.stack || err)
  console.error('FAIL', err)
} finally {
  await browser.close()
}

const summaryPath = join(OUT, 'browse-marketplace-qa.json')
writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
writeFileSync(join(LOCAL_OUT, 'browse-marketplace-qa.json'), JSON.stringify(summary, null, 2))
console.log(summaryPath)
process.exit(summary.ok ? 0 : 1)
