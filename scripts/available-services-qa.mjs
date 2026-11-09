/**
 * Available services 3×2 grid QA: six cards, no Other, no carousel, routes, overflow.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/tmp/beam-available-services-qa'
const ART = '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })
mkdirSync(ART, { recursive: true })

function parseRgb(s) {
  const m = String(s).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}
function lin(c) {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
function lum([r, g, b]) {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
function contrast(a, b) {
  const L1 = lum(a)
  const L2 = lum(b)
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (hi + 0.05) / (lo + 0.05)
}

const EXPECTED = [
  ['house-cleaning', '/browse?category=house-cleaning', 'House Cleaning'],
  ['carpet-cleaning', '/browse?category=carpet-cleaning', 'Carpet Cleaning'],
  ['auto-detailing', '/browse?category=auto-detailing', 'Auto Detailing'],
  ['junk-removal', '/browse?category=junk-removal', 'Junk Removal'],
  ['pet-sitting', '/browse?category=pet-sitting', 'Pet Sitting'],
  ['grooming', '/browse?category=grooming', 'Grooming'],
]

let failed = false
const report = []

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => {
    const imgs = [
      ...document.querySelectorAll('[data-testid="available-services-grid"] a[data-service-card] img'),
    ]
    return imgs.length === 6 && imgs.every((img) => img.complete && img.naturalWidth >= 400)
  }, null, { timeout: 20000 })

  const structure = await page.evaluate((expected) => {
    const root = document.querySelector('[data-testid="available-services"]')
    const grid = document.querySelector('[data-testid="available-services-grid"]')
    const cards = [...(grid?.querySelectorAll('a[data-service-card]') || [])]
    const other = document.querySelector('[data-testid="available-service-other"]')
    const controls = document.querySelector('[data-testid="available-services-controls"]')
    const prev = document.querySelector('[data-testid="available-services-prev"]')
    const next = document.querySelector('[data-testid="available-services-next"]')
    const row = document.querySelector('[data-testid="available-services-row"]')
    const detail = document.querySelector('[data-testid="available-services-detail"]')
    const bentoCustom = document.querySelector('[data-testid="categories-tile-custom"]')
    const imgs = cards.map((a) => a.querySelector('img')).filter(Boolean)
    const paths = imgs.map((img) => {
      const raw = img.getAttribute('src') || img.currentSrc || ''
      try {
        const u = new URL(raw, location.origin)
        if (u.pathname === '/_next/image') return decodeURIComponent(u.searchParams.get('url') || '')
        return u.pathname
      } catch {
        return raw
      }
    })
    const gridCs = grid ? getComputedStyle(grid) : null
    return {
      heading: /Available services on Beam/i.test(root?.innerText || ''),
      cardCount: cards.length,
      hasOther: !!other,
      hasControls: !!controls || !!prev || !!next,
      hasCarouselRow: !!row,
      hasDetailPanel: !!detail,
      hrefs: cards.map((a) => a.getAttribute('href')),
      labels: cards.map((a) => (a.textContent || '').replace(/\s+/g, ' ').trim()),
      imagePaths: paths,
      imagesComplete: imgs.every((img) => img.complete && img.naturalWidth >= 400),
      minNaturalWidth: Math.min(...imgs.map((img) => img.naturalWidth || 0)),
      gridDisplay: gridCs?.display || null,
      gridTemplateColumns: gridCs?.gridTemplateColumns || null,
      columnCount: gridCs?.gridTemplateColumns
        ? gridCs.gridTemplateColumns.split(' ').filter(Boolean).length
        : 0,
      expectedOk: expected.every(([id, href, label], i) => {
        const card = cards[i]
        return (
          card?.getAttribute('data-testid') === `available-service-${id}` &&
          card?.getAttribute('href') === href &&
          (card?.textContent || '').includes(label)
        )
      }),
      bentoCustomIntact: !!bentoCustom,
      bentoIntact: !!document.querySelector('[data-testid="categories-bento"]'),
      anchor: root?.id,
    }
  }, EXPECTED)

  const desktopCols = structure.columnCount
  const structureOk =
    structure.heading &&
    structure.cardCount === 6 &&
    !structure.hasOther &&
    !structure.hasControls &&
    !structure.hasCarouselRow &&
    !structure.hasDetailPanel &&
    structure.expectedOk &&
    structure.imagesComplete &&
    structure.minNaturalWidth >= 400 &&
    structure.gridDisplay === 'grid' &&
    desktopCols === 3 &&
    structure.bentoIntact &&
    structure.bentoCustomIntact &&
    structure.anchor === 'neighborhoods'
  if (!structureOk) failed = true
  report.push({ name: 'structure-desktop-3x2', ok: structureOk, structure, desktopCols })
  console.log('structure-desktop-3x2', structureOk ? 'PASS' : 'FAIL', JSON.stringify({ desktopCols, cardCount: structure.cardCount, hasOther: structure.hasOther, hasControls: structure.hasControls }))

  // Geometry: 3 columns × 2 rows of equal cards
  const geometry = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid="available-services-grid"] a[data-service-card]')]
    const rects = cards.map((c) => {
      const r = c.getBoundingClientRect()
      return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }
    })
    const row1 = rects.filter((r) => Math.abs(r.top - rects[0].top) < 8)
    const row2 = rects.filter((r) => Math.abs(r.top - rects[0].top) > 40)
    const widthsClose = rects.every((r) => Math.abs(r.width - rects[0].width) <= 4)
    return {
      row1Count: row1.length,
      row2Count: row2.length,
      widthsClose,
      rects,
    }
  })
  const geometryOk = geometry.row1Count === 3 && geometry.row2Count === 3 && geometry.widthsClose
  if (!geometryOk) failed = true
  report.push({ name: 'geometry-desktop-3x2', ok: geometryOk, geometry })
  console.log('geometry-desktop-3x2', geometryOk ? 'PASS' : 'FAIL')

  // Keyboard Enter on a card
  await page.getByTestId('available-service-carpet-cleaning').focus()
  await page.keyboard.press('Enter')
  await page.waitForURL(/\/browse\?category=carpet-cleaning/, { timeout: 15000 })
  const enterOk = page.url().includes('/browse?category=carpet-cleaning')
  if (!enterOk) failed = true
  report.push({ name: 'keyboard-enter-link', ok: enterOk, url: page.url() })
  console.log('keyboard-enter-link', enterOk ? 'PASS' : 'FAIL')

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()

  await page.getByTestId('available-service-junk-removal').click()
  await page.waitForURL(/\/browse\?category=junk-removal/, { timeout: 15000 })
  const clickOk = page.url().includes('/browse?category=junk-removal')
  if (!clickOk) failed = true
  report.push({ name: 'card-click-route', ok: clickOk, url: page.url() })
  console.log('card-click-route', clickOk ? 'PASS' : 'FAIL')

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()

  const colors = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="available-services"]')
    const title = root.querySelector('h2')
    const body = root.querySelector('h2 + p')
    const card = root.querySelector('a[data-service-card]')
    const label = card?.querySelector('span')
    return {
      sectionBg: getComputedStyle(root).backgroundColor,
      title: getComputedStyle(title).color,
      body: getComputedStyle(body).color,
      cardBg: getComputedStyle(card).backgroundColor,
      label: label ? getComputedStyle(label).color : null,
      border: getComputedStyle(card).borderTopColor,
      radius: getComputedStyle(card).borderTopLeftRadius,
    }
  })
  const sectionBg = parseRgb(colors.sectionBg)
  const titleC = parseRgb(colors.title)
  const bodyC = parseRgb(colors.body)
  const cardBg = parseRgb(colors.cardBg)
  const labelC = colors.label ? parseRgb(colors.label) : null
  const borderC = parseRgb(colors.border)
  const pairs = {
    title: Number(contrast(titleC, sectionBg).toFixed(2)),
    body: Number(contrast(bodyC, sectionBg).toFixed(2)),
    labelOnCard: labelC ? Number(contrast(labelC, cardBg).toFixed(2)) : 0,
    borderOnSection: borderC ? Number(contrast(borderC, sectionBg).toFixed(2)) : 0,
  }
  const contrastOk =
    pairs.title >= 4.5 &&
    pairs.body >= 4.5 &&
    pairs.labelOnCard >= 4.5 &&
    pairs.borderOnSection >= 3 &&
    colors.radius === '10px'
  if (!contrastOk) failed = true
  report.push({ name: 'contrast', ok: contrastOk, colors, pairs })
  console.log('contrast', contrastOk ? 'PASS' : 'FAIL', JSON.stringify(pairs))

  // Reduced motion: hover transforms disabled; navigation still works
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByTestId('available-service-grooming').click()
  await page.waitForURL(/\/browse\?category=grooming/, { timeout: 15000 })
  const reducedOk = page.url().includes('/browse?category=grooming')
  if (!reducedOk) failed = true
  report.push({ name: 'reduced-motion-nav', ok: reducedOk })
  console.log('reduced-motion-nav', reducedOk ? 'PASS' : 'FAIL')

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(120)
  await page.getByTestId('available-services').screenshot({ path: join(OUT, 'desktop-1440.png') })
  copyFileSync(join(OUT, 'desktop-1440.png'), join(ART, 'available-services-desktop.png'))

  // Tablet — expect 2 columns
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  const tablet = await page.evaluate(() => {
    const grid = document.querySelector('[data-testid="available-services-grid"]')
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    const cards = [...document.querySelectorAll('[data-testid="available-services-grid"] a[data-service-card]')]
    const tops = cards.map((c) => Math.round(c.getBoundingClientRect().top))
    const row1 = tops.filter((t) => Math.abs(t - tops[0]) < 8).length
    return { cols, overflow, row1, cardCount: cards.length }
  })
  const tabletOk = tablet.cols === 2 && !tablet.overflow && tablet.cardCount === 6 && tablet.row1 === 2
  if (!tabletOk) failed = true
  report.push({ name: 'tablet-2col', ok: tabletOk, tablet })
  console.log('tablet-2col', tabletOk ? 'PASS' : 'FAIL', JSON.stringify(tablet))
  await page.getByTestId('available-services').screenshot({ path: join(OUT, 'tablet-768.png') })
  copyFileSync(join(OUT, 'tablet-768.png'), join(ART, 'available-services-tablet.png'))

  // Mobile 390 — 1 col (below 420) or 2; no page overflow; no horizontal carousel
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  const mobile = await page.evaluate(() => {
    const grid = document.querySelector('[data-testid="available-services-grid"]')
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    const scrollableX = grid.scrollWidth > grid.clientWidth + 4
    return { cols, overflow, scrollableX, cardCount: document.querySelectorAll('[data-testid="available-services-grid"] a[data-service-card]').length }
  })
  const mobileOk =
    mobile.cardCount === 6 &&
    !mobile.overflow &&
    !mobile.scrollableX &&
    (mobile.cols === 1 || mobile.cols === 2)
  if (!mobileOk) failed = true
  report.push({ name: 'mobile-grid', ok: mobileOk, mobile })
  console.log('mobile-grid', mobileOk ? 'PASS' : 'FAIL', JSON.stringify(mobile))
  await page.getByTestId('available-services').screenshot({ path: join(OUT, 'mobile-390.png') })
  copyFileSync(join(OUT, 'mobile-390.png'), join(ART, 'available-services-mobile.png'))

  // Other still available outside this section (bento custom)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const otherElsewhere = await page.evaluate(() => {
    const inSection = !!document.querySelector(
      '[data-testid="available-services"] [data-testid="available-service-other"]',
    )
    const custom = document.querySelector('[data-testid="categories-tile-custom"]')
    return {
      otherInAvailableServices: inSection,
      customHref: custom?.getAttribute('href') || null,
    }
  })
  const otherOk =
    !otherElsewhere.otherInAvailableServices &&
    otherElsewhere.customHref === '/browse?category=other'
  if (!otherOk) failed = true
  report.push({ name: 'other-elsewhere-intact', ok: otherOk, otherElsewhere })
  console.log('other-elsewhere-intact', otherOk ? 'PASS' : 'FAIL')

  // Helper jobs-only gating: demo helper must not expose peer discovery; customer must.
  const STORAGE_KEY = 'beam-demo-v1'
  await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const state = JSON.parse(raw)
    const me = state.people?.find((p) => p.id === state.currentUserId) || state.people?.[0]
    if (me) {
      me.accountRole = 'helper'
      me.isHelper = true
      localStorage.setItem(key, JSON.stringify(state))
    }
  }, STORAGE_KEY)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const helperGated = (await page.locator('a[href="/browse?tab=people"]').count()) === 0
  await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const state = JSON.parse(raw)
    const me = state.people?.find((p) => p.id === state.currentUserId) || state.people?.[0]
    if (me) {
      me.accountRole = 'customer'
      me.isHelper = false
      me.skills = []
      localStorage.setItem(key, JSON.stringify(state))
    }
  }, STORAGE_KEY)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const customerSees = (await page.locator('a[href="/browse?tab=people"]').count()) >= 1
  const roleOk = helperGated && customerSees
  if (!roleOk) failed = true
  report.push({
    name: 'guest-discovery-intact',
    ok: roleOk,
    helperGated,
    customerSees,
  })
  console.log('guest-discovery-intact', roleOk ? 'PASS' : 'FAIL', { helperGated, customerSees })

  await page.close()
} finally {
  await browser.close()
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
copyFileSync(join(OUT, 'report.json'), join(ART, 'available-services-qa-report.json'))
console.log(failed ? '\nOVERALL: FAIL' : '\nOVERALL: PASS')
process.exit(failed ? 1 : 0)
