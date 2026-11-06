/**
 * Browse marketplace guest location-neutral filter/sort visual QA.
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
      guestAustinHeader: /across Austin neighborhoods|Open requests and nearby helpers across Austin/i.test(
        bodyText.split('\n').slice(0, 20).join('\n'),
      ),
      unequalRows,
      h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      whenLabel:
        document.querySelector('[data-testid="browse-when-trigger"]')?.textContent?.replace(
          /\s+/g,
          ' ',
        ).trim() || '',
      availLabel:
        document
          .querySelector('[data-testid="browse-availability-trigger"]')
          ?.textContent?.replace(/\s+/g, ' ')
          .trim() || '',
      neighborhoodTrigger: !!document.querySelector('[data-testid="browse-neighborhood-trigger"]'),
      sortLabel:
        document.querySelector('[data-testid="browse-sort-trigger"]')?.textContent?.replace(
          /\s+/g,
          ' ',
        ).trim() || '',
    }
  })
}

async function assertNoAustinPickerInOpenListbox(page, listboxTestId) {
  const text = await page.getByTestId(listboxTestId).innerText()
  for (const name of AUSTIN_NEIGHBORHOODS) {
    if (text.includes(name)) {
      fail(`Guest listbox ${listboxTestId} includes Austin neighborhood "${name}"`)
    }
  }
  if (/Nearest/i.test(text) && listboxTestId === 'browse-sort-listbox') {
    fail('Guest sort listbox still offers Nearest')
  }
}

const browser = await chromium.launch({ headless: true })
try {
  {
    const vp = VIEWPORTS[0]
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('text=Browse Local Jobs', { timeout: 15000 })

    let metrics = await measurePage(page)
    if (metrics.scrollWidth > metrics.innerWidth + 1) {
      fail(`Horizontal overflow on /browse @ ${vp.name}: ${metrics.scrollWidth}>${metrics.innerWidth}`)
    }
    if (metrics.broken.length) fail(`Broken images on /browse: ${metrics.broken.join(', ')}`)
    if (metrics.hasDebugFree || metrics.hasDebugQ) fail('Raw debug filter strings visible on /browse')
    if (metrics.guestAustinHeader) fail('Guest /browse header assumes Austin')
    if (metrics.neighborhoodTrigger) fail('Guest /browse still shows neighborhood trigger')
    if (!/Any timing/i.test(metrics.whenLabel)) {
      fail(`Guest timing default should be Any timing, got "${metrics.whenLabel}"`)
    }
    if (!/Newest first/i.test(metrics.sortLabel)) {
      fail(`Guest default sort should be Newest first, got "${metrics.sortLabel}"`)
    }
    if (metrics.unequalRows.length) {
      fail(`Unequal card heights on /browse: ${JSON.stringify(metrics.unequalRows)}`)
    }

    const reqShot = join('/tmp', 'guest-browse-requests-1440x900.png')
    await page.screenshot({ path: reqShot, fullPage: false })
    saveShot(reqShot, 'guest-browse-requests-1440x900.png')
    // Keep legacy filename for continuity
    saveShot(reqShot, 'browse-requests-1440x900.png')
    summary.checks.push({ name: 'guest-browse-requests-1440x900', ok: true, metrics })

    // Timing dropdown
    await page.getByTestId('browse-when-trigger').click()
    await page.getByTestId('browse-when-listbox').waitFor({ state: 'visible' })
    await assertNoAustinPickerInOpenListbox(page, 'browse-when-listbox')
    const whenText = await page.getByTestId('browse-when-listbox').innerText()
    if (!/ASAP|Today|Tomorrow|This week/i.test(whenText)) {
      fail(`Timing listbox missing expected options: ${whenText}`)
    }
    const whenShot = join('/tmp', 'guest-browse-when-open-1440x900.png')
    await page.screenshot({ path: whenShot, fullPage: false })
    saveShot(whenShot, 'guest-browse-when-open-1440x900.png')
    summary.checks.push({ name: 'guest-browse-when-open-1440x900', ok: true })

    await page.getByRole('option', { name: 'ASAP' }).click()
    await page.getByRole('button', { name: /^Moving$/ }).click()
    await page.getByLabel('Search browse').fill('couch')
    await page.waitForTimeout(400)
    const filterText = await page.locator('body').innerText()
    if (/free=1|\bq:\s/.test(filterText)) fail('Debug filter pills still present after filtering')
    if (!/Search:\s*couch/i.test(filterText)) fail('Missing human Search filter pill')
    if (!/\bASAP\b/.test(filterText) || !/Moving/i.test(filterText)) {
      fail('Missing human timing/category filter pills')
    }
    // Card metadata may still name seed neighborhoods; command-bar picker is asserted above.
    const filterShot = join('/tmp', 'browse-filters-1440x900.png')
    await page.screenshot({ path: filterShot, fullPage: false })
    saveShot(filterShot, 'browse-filters-1440x900.png')
    summary.checks.push({ name: 'browse-filters-1440x900', ok: true })

    // Guest sort — no Nearest
    await page.getByTestId('browse-sort-trigger').click()
    await page.getByTestId('browse-sort-listbox').waitFor({ state: 'visible' })
    await assertNoAustinPickerInOpenListbox(page, 'browse-sort-listbox')
    const sortText = await page.getByTestId('browse-sort-listbox').innerText()
    if (!/Newest first/i.test(sortText) || !/Highest budget/i.test(sortText)) {
      fail(`Guest request sort options unexpected: ${sortText}`)
    }
    if (/Nearest/i.test(sortText)) fail('Guest request sort still includes Nearest')
    await page.keyboard.press('Escape')

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
    if (metrics.neighborhoodTrigger) fail('Guest helpers still shows neighborhood trigger')
    if (!/Any availability/i.test(metrics.availLabel)) {
      fail(`Guest availability default should be Any availability, got "${metrics.availLabel}"`)
    }
    if (!/Top rated/i.test(metrics.sortLabel)) {
      fail(`Guest helpers default sort should be Top rated, got "${metrics.sortLabel}"`)
    }

    await page.getByTestId('browse-availability-trigger').click()
    await page.getByTestId('browse-availability-listbox').waitFor({ state: 'visible' })
    await assertNoAustinPickerInOpenListbox(page, 'browse-availability-listbox')
    const availText = await page.getByTestId('browse-availability-listbox').innerText()
    if (!/Afternoons|Evenings|Mornings|Weekends/i.test(availText)) {
      fail(`Availability listbox missing expected options: ${availText}`)
    }
    await page.getByRole('option', { name: 'Afternoons' }).click()
    await page.waitForTimeout(200)
    const helperFilterText = await page.locator('body').innerText()
    if (!/Afternoons/i.test(helperFilterText)) fail('Missing Afternoons filter pill on helpers')

    await page.getByTestId('browse-sort-trigger').click()
    await page.getByTestId('browse-sort-listbox').waitFor({ state: 'visible' })
    const helperSortText = await page.getByTestId('browse-sort-listbox').innerText()
    if (!/Top rated/i.test(helperSortText) || !/Lowest rate/i.test(helperSortText)) {
      fail(`Guest helper sort options unexpected: ${helperSortText}`)
    }
    if (/Nearest/i.test(helperSortText)) fail('Guest helper sort still includes Nearest')
    await page.keyboard.press('Escape')

    const helpersShot = join('/tmp', 'guest-browse-helpers-1440x900.png')
    await page.screenshot({ path: helpersShot, fullPage: false })
    saveShot(helpersShot, 'guest-browse-helpers-1440x900.png')
    saveShot(helpersShot, 'browse-helpers-1440x900.png')
    summary.checks.push({ name: 'guest-browse-helpers-1440x900', ok: true, metrics })

    await context.close()
  }

  for (const vp of VIEWPORTS.slice(1)) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('text=Browse Local Jobs', { timeout: 15000 })
    let metrics = await measurePage(page)
    if (metrics.scrollWidth > metrics.innerWidth + 1) {
      fail(`Horizontal overflow /browse @ ${vp.name}`)
    }
    if (metrics.broken.length) fail(`Broken images /browse @ ${vp.name}`)
    if (metrics.hasDebugFree || metrics.hasDebugQ) fail(`Debug strings @ ${vp.name}`)
    if (metrics.guestAustinHeader) fail(`Austin header @ ${vp.name}`)
    if (metrics.neighborhoodTrigger) fail(`Neighborhood trigger @ ${vp.name}`)

    await page.goto(`${BASE}/browse?tab=people`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('text=Local helpers', { timeout: 15000 })
    metrics = await measurePage(page)
    if (metrics.scrollWidth > metrics.innerWidth + 1) {
      fail(`Horizontal overflow helpers @ ${vp.name}`)
    }

    if (vp.name === '390x844') {
      const mobileShot = join('/tmp', 'guest-browse-mobile-390x844.png')
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('text=Browse Local Jobs', { timeout: 15000 })
      await page.screenshot({ path: mobileShot, fullPage: false })
      saveShot(mobileShot, 'guest-browse-mobile-390x844.png')
      saveShot(mobileShot, 'browse-mobile-390x844.png')
      summary.checks.push({ name: 'guest-browse-mobile-390x844', ok: true })
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
