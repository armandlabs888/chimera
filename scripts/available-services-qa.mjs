/**
 * Photo-row Available services QA: links, scroll controls, crops, contrast, responsive.
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
  ['other', '/browse?category=other', 'Other'],
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
      ...document.querySelectorAll('[data-testid="available-services-row"] a[data-service-card] img'),
    ]
    return imgs.length === 7 && imgs.every((img) => img.complete && img.naturalWidth >= 400)
  }, null, { timeout: 20000 })

  const structure = await page.evaluate((expected) => {
    const root = document.querySelector('[data-testid="available-services"]')
    const row = document.querySelector('[data-testid="available-services-row"]')
    const cards = [...(row?.querySelectorAll('a[data-service-card]') || [])]
    const detail = document.querySelector('[data-testid="available-services-detail"]')
    const groupButtons = document.querySelector('[data-testid="available-services-group"]')
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
    const landingImgs = [...document.querySelectorAll('img')].map((img) => {
      const raw = img.getAttribute('src') || img.currentSrc || ''
      try {
        const u = new URL(raw, location.origin)
        if (u.pathname === '/_next/image') return decodeURIComponent(u.searchParams.get('url') || '')
        return u.pathname
      } catch {
        return raw
      }
    })
    return {
      heading: /Available services on Beam/i.test(root?.innerText || ''),
      hasDisclaimer: /not a live helper roster|guaranteed availability/i.test(root?.innerText || ''),
      hasSelectorPanel: !!detail || !!groupButtons,
      cardCount: cards.length,
      hrefs: cards.map((a) => a.getAttribute('href')),
      labels: cards.map((a) => (a.textContent || '').replace(/\s+/g, ' ').trim()),
      imagePaths: paths,
      imagesComplete: imgs.every((img) => img.complete && img.naturalWidth >= 400),
      minNaturalWidth: Math.min(...imgs.map((img) => img.naturalWidth || 0)),
      uniqueLandingPaths: new Set(landingImgs).size === landingImgs.length,
      landingPathCount: landingImgs.length,
      landingUnique: new Set(landingImgs).size,
      unsplashHotlink: landingImgs.some((p) => /unsplash/i.test(p)),
      rowRole: row?.getAttribute('role'),
      expectedOk: expected.every(([id, href, label], i) => {
        const card = cards[i]
        return (
          card?.getAttribute('data-testid') === `available-service-${id}` &&
          card?.getAttribute('href') === href &&
          (card?.textContent || '').includes(label)
        )
      }),
      bentoIntact: !!document.querySelector('[data-testid="categories-bento"]'),
      anchor: root?.id,
    }
  }, EXPECTED)

  const structureOk =
    structure.heading &&
    !structure.hasDisclaimer &&
    !structure.hasSelectorPanel &&
    structure.cardCount === EXPECTED.length &&
    structure.expectedOk &&
    structure.imagesComplete &&
    structure.minNaturalWidth >= 400 &&
    structure.uniqueLandingPaths &&
    !structure.unsplashHotlink &&
    structure.rowRole === 'list' &&
    structure.bentoIntact &&
    structure.anchor === 'neighborhoods'
  if (!structureOk) failed = true
  report.push({ name: 'structure', ok: structureOk, structure })
  console.log('structure', structureOk ? 'PASS' : 'FAIL', JSON.stringify(structure))

  // Keyboard: Tab to a card and activate with Enter
  await page.getByTestId('available-service-carpet-cleaning').focus()
  await page.keyboard.press('Enter')
  await page.waitForURL(/\/browse\?category=carpet-cleaning/, { timeout: 15000 })
  const enterOk = page.url().includes('/browse?category=carpet-cleaning')
  if (!enterOk) failed = true
  report.push({ name: 'keyboard-enter-link', ok: enterOk, url: page.url() })
  console.log('keyboard-enter-link', enterOk ? 'PASS' : 'FAIL')

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()

  // Touch-ish click junk card
  await page.getByTestId('available-service-junk-removal').click()
  await page.waitForURL(/\/browse\?category=junk-removal/, { timeout: 15000 })
  const clickOk = page.url().includes('/browse?category=junk-removal')
  if (!clickOk) failed = true
  report.push({ name: 'card-click-route', ok: clickOk, url: page.url() })
  console.log('card-click-route', clickOk ? 'PASS' : 'FAIL')

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()

  // Scroll controls
  const next = page.getByTestId('available-services-next')
  const prev = page.getByTestId('available-services-prev')
  const beforeScroll = await page.evaluate(
    () => document.querySelector('[data-testid="available-services-row"]')?.scrollLeft || 0,
  )
  const nextEnabled = await next.isEnabled()
  if (nextEnabled) {
    await next.click()
    await page.waitForTimeout(350)
  }
  const afterNext = await page.evaluate(
    () => document.querySelector('[data-testid="available-services-row"]')?.scrollLeft || 0,
  )
  const scrollOk = !nextEnabled || afterNext > beforeScroll + 8
  if (!scrollOk) failed = true
  report.push({
    name: 'scroll-next',
    ok: scrollOk,
    beforeScroll,
    afterNext,
    nextEnabled,
  })
  console.log('scroll-next', scrollOk ? 'PASS' : 'FAIL')

  if (await prev.isEnabled()) {
    await prev.click()
    await page.waitForTimeout(350)
  }

  // Contrast on chrome (title/body/card label on white)
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

  // Reduced motion still navigates
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByTestId('available-service-grooming').click()
  await page.waitForURL(/\/browse\?category=grooming/, { timeout: 15000 })
  const reducedOk = page.url().includes('/browse?category=grooming')
  if (!reducedOk) failed = true
  report.push({ name: 'reduced-motion', ok: reducedOk })
  console.log('reduced-motion', reducedOk ? 'PASS' : 'FAIL')

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(120)
  await page.getByTestId('available-services').screenshot({ path: join(OUT, 'desktop-1440.png') })
  copyFileSync(join(OUT, 'desktop-1440.png'), join(ART, 'available-services-desktop.png'))

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  const overflow390 = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  if (overflow390) failed = true
  report.push({ name: 'mobile-overflow', ok: !overflow390 })
  console.log('mobile-overflow', !overflow390 ? 'PASS' : 'FAIL')

  // Mobile row should be scrollable horizontally inside
  const rowOverflow = await page.evaluate(() => {
    const row = document.querySelector('[data-testid="available-services-row"]')
    return row ? row.scrollWidth > row.clientWidth + 4 : false
  })
  report.push({ name: 'mobile-row-scrollable', ok: rowOverflow, rowOverflow })
  console.log('mobile-row-scrollable', rowOverflow ? 'PASS' : 'FAIL')
  if (!rowOverflow) failed = true

  await page.getByTestId('available-services').screenshot({ path: join(OUT, 'mobile-390.png') })
  copyFileSync(join(OUT, 'mobile-390.png'), join(ART, 'available-services-mobile.png'))

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  await page.getByTestId('available-services').screenshot({ path: join(OUT, 'tablet-768.png') })
  copyFileSync(join(OUT, 'tablet-768.png'), join(ART, 'available-services-tablet.png'))

  // Guest discovery intact
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const helpersLink = await page.locator('a[href="/browse?tab=people"]').count()
  const roleOk = helpersLink >= 1
  if (!roleOk) failed = true
  report.push({ name: 'guest-discovery-intact', ok: roleOk, helpersLink })
  console.log('guest-discovery-intact', roleOk ? 'PASS' : 'FAIL')

  await page.close()
} finally {
  await browser.close()
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
copyFileSync(join(OUT, 'report.json'), join(ART, 'available-services-qa-report.json'))
console.log(failed ? '\nOVERALL: FAIL' : '\nOVERALL: PASS')
process.exit(failed ? 1 : 0)
