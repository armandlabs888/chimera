#!/usr/bin/env node
/**
 * Popular gigs landing QA: layout, links, city-scoped heading, responsive grid.
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
  // Demo seed has open jobs once city is known: wait for cards or empty.
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
  assert.equal(await page.getByTestId('popular-gigs-location').count(), 0, 'no location chip')
  assert.equal(await page.getByRole('button', { name: /Choose a city/i }).count(), 0)

  const heading = await page.getByTestId('popular-gigs-heading').innerText()
  assert.match(heading, /Popular gigs in Austin, TX/i)
  assert.doesNotMatch(heading, /—|–/)
  assert.match(
    await page.getByTestId('popular-gigs-subtext').innerText(),
    /All open jobs neighbors have posted in Austin, Texas\./i,
  )
  assert.match(
    await page.locator('[data-testid="popular-gigs"] .gg-eb').innerText(),
    /Open in your city/i,
  )

  const cards = page.getByTestId('popular-gig-card')
  const cardCount = await cards.count()
  assert.ok(cardCount > 0, `expected real cards, got ${cardCount}`)

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

  await shot(page, '1440-hero-top')
  await page.locator('[data-testid="popular-gigs"]').scrollIntoViewIfNeeded()
  await shot(page, '1440-gigs-section')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
  await shotFull(page, '1440-full')
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

  // --- 768: 3 columns ---
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await waitGigs(page)
  const at768 = await page.locator('[data-testid="popular-gigs-grid"]').evaluate((el) => {
    const cols = getComputedStyle(el).gridTemplateColumns.split(' ').length
    return { cols, count: el.children.length }
  })
  assert.equal(at768.cols, 3, '768 uses 3 columns')
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

  // Hero: Find help only (no Post a task / Browse services under search)
  const hero = page.getByTestId('landing-hero')
  assert.equal(await hero.getByRole('link', { name: /^Post a task$/i }).count(), 0)
  assert.equal(await hero.getByRole('link', { name: /^Browse services$/i }).count(), 0)
  assert.ok(await hero.getByRole('button', { name: /^Find help$/i }).count() >= 1)

  console.log('popular-gigs-qa passed')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
