#!/usr/bin/env node
/**
 * Popular gigs landing QA — layout, links, location chip, responsive 10th-card hide.
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts/popular-gigs'
mkdirSync(OUT, { recursive: true })
mkdirSync('artifacts/popular-gigs', { recursive: true })

async function shot(page, name) {
  const path = `${OUT}/${name}.png`
  await page.screenshot({ path, fullPage: false })
  await page.screenshot({ path: `artifacts/popular-gigs/${name}.png`, fullPage: false })
  console.log(`saved ${path}`)
}

async function shotFull(page, name) {
  const path = `${OUT}/${name}.png`
  await page.screenshot({ path, fullPage: true })
  await page.screenshot({ path: `artifacts/popular-gigs/${name}.png`, fullPage: true })
  console.log(`saved ${path}`)
}

async function waitGigs(page) {
  await page.waitForSelector('[data-testid="popular-gigs"][data-ready="true"]', {
    timeout: 20000,
  })
  // Demo seed has open jobs — wait for cards or empty.
  await page.waitForFunction(() => {
    const section = document.querySelector('[data-testid="popular-gigs"]')
    if (!section) return false
    return (
      section.querySelectorAll('[data-testid="popular-gig-card"]').length > 0 ||
      !!section.querySelector('[data-testid="popular-gigs-empty"]')
    )
  }, null, { timeout: 20000 })
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // --- 1440 ---
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await waitGigs(page)

  assert.equal(await page.getByTestId('landing-browse-preview').count(), 0, 'preview removed')
  assert.equal(await page.getByTestId('popular-gigs').count(), 1)
  assert.doesNotMatch(
    await page.locator('[data-testid="popular-gigs"]').innerText(),
    /Design preview|Sample listings, not live activity/i,
  )

  const cards = page.getByTestId('popular-gig-card')
  const cardCount = await cards.count()
  assert.ok(cardCount > 0 && cardCount <= 10, `expected 1–10 real cards, got ${cardCount}`)

  const firstHref = await cards.first().getAttribute('href')
  assert.match(firstHref || '', /\/browse\?job=/)

  const seeAll = page.getByTestId('popular-gigs-see-all')
  assert.equal(await seeAll.getAttribute('href'), '/browse')

  // Grid is 5 columns at 1440
  const gridStyle = await page.locator('[data-testid="popular-gigs-grid"]').evaluate((el) => {
    const cs = getComputedStyle(el)
    return { cols: cs.gridTemplateColumns.split(' ').length, gap: cs.columnGap }
  })
  assert.equal(gridStyle.cols, 5, 'desktop 5 columns')

  // First card opens browse job
  await cards.first().click()
  await page.waitForURL(/\/browse\?.*job=/)
  assert.match(page.url(), /job=/)

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await waitGigs(page)

  // Location chip opens dialog
  await page.getByTestId('popular-gigs-location').click()
  await page.waitForSelector('[role="dialog"]', { timeout: 8000 })
  await page.keyboard.press('Escape')

  await shot(page, '1440-hero-top')
  await page.locator('[data-testid="popular-gigs"]').scrollIntoViewIfNeeded()
  await shot(page, '1440-gigs-section')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
  // Hero + gigs money shot: scroll so gigs fills below hero
  await shotFull(page, '1440-full')
  // Cropped hero+gigs: set viewport tall enough or scroll mid
  await page.setViewportSize({ width: 1440, height: 1400 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, '1440-hero-gigs')

  // --- 1024: still 5 columns ---
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await waitGigs(page)
  const cols1024 = await page.locator('[data-testid="popular-gigs-grid"]').evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
  )
  assert.equal(cols1024, 5, '1024 keeps 5 columns')
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, '1024-hero-gigs')

  // --- 768: 3 columns; 10th hidden when count=10 ---
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await waitGigs(page)
  const at768 = await page.locator('[data-testid="popular-gigs-grid"]').evaluate((el) => {
    const cols = getComputedStyle(el).gridTemplateColumns.split(' ').length
    const items = [...el.children]
    const tenth = items[9]
    const tenthHidden = tenth
      ? getComputedStyle(tenth).display === 'none'
      : null
    return { cols, count: items.length, tenthHidden }
  })
  assert.equal(at768.cols, 3, '768 uses 3 columns')
  if (at768.count === 10) {
    assert.equal(at768.tenthHidden, true, '10th card hidden at tablet when 10 jobs')
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, '768-hero-gigs')

  // --- 390 ---
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await waitGigs(page)
  assert.equal(await page.getByTestId('landing-browse-preview').count(), 0)
  const at390 = await page.locator('[data-testid="popular-gigs-grid"]').evaluate((el) => {
    const cols = getComputedStyle(el).gridTemplateColumns.split(' ').length
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    return { cols, overflow }
  })
  assert.equal(at390.cols, 2, 'mobile 2 columns')
  assert.equal(at390.overflow, false, 'no horizontal overflow')
  assert.ok(await page.getByTestId('popular-gigs-see-all-mobile').isVisible())
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, '390-hero-top')
  await page.locator('[data-testid="popular-gigs"]').scrollIntoViewIfNeeded()
  await shot(page, '390-gigs-viewport')

  // Overflow check desktop
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await waitGigs(page)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  assert.equal(overflow, false, 'no horizontal overflow at 1440')

  console.log('popular-gigs-qa passed')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
