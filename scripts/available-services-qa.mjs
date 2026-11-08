/**
 * Interaction + contrast + responsive QA for Available services on Beam strip.
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
  'house-cleaning',
  'carpet-cleaning',
  'auto-detailing',
  'junk-removal',
  'pet-sitting',
  'grooming',
  'other',
]

let failed = false
const report = []

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()

  // Structure + framing
  const structure = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="available-services"]')
    const group = document.querySelector('[data-testid="available-services-group"]')
    const buttons = [...(group?.querySelectorAll('button') || [])]
    const scallop = !!document.querySelector('.scallop-band')
    const nestedLinksInButtons = buttons.some((b) => b.querySelector('a'))
    return {
      hasHeading: /Available services on Beam/i.test(root?.innerText || ''),
      anchorId: root?.id || null,
      role: group?.getAttribute('role'),
      buttonCount: buttons.length,
      ids: buttons.map((b) => b.getAttribute('data-testid')),
      pressed: buttons.map((b) => b.getAttribute('aria-pressed')),
      optionRoles: buttons.map((b) => b.getAttribute('role')),
      scallop,
      nestedLinksInButtons,
      categoriesBentoIntact: !!document.querySelector('#categories'),
    }
  })
  const structureOk =
    structure.hasHeading &&
    structure.anchorId === 'neighborhoods' &&
    structure.role === 'group' &&
    structure.buttonCount === EXPECTED.length &&
    EXPECTED.every((id) => structure.ids.includes(`available-service-${id}`)) &&
    structure.pressed.filter((p) => p === 'true').length === 1 &&
    structure.optionRoles.every((r) => r == null) &&
    !structure.scallop &&
    !structure.nestedLinksInButtons &&
    structure.categoriesBentoIntact
  if (!structureOk) failed = true
  report.push({ name: 'structure', ok: structureOk, structure })
  console.log('structure', structureOk ? 'PASS' : 'FAIL', JSON.stringify(structure))

  // Keyboard select (Enter) → detail + browse href
  const carpet = page.getByTestId('available-service-carpet-cleaning')
  await carpet.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="available-service-carpet-cleaning"]')?.getAttribute('aria-pressed') ===
      'true',
  )
  const afterEnter = {
    pressed: await carpet.getAttribute('aria-pressed'),
    blurb: await page.getByTestId('available-services-blurb').innerText(),
    href: await page.getByTestId('available-services-browse').getAttribute('href'),
    label: await page.getByTestId('available-services-browse').innerText(),
  }
  const enterOk =
    afterEnter.pressed === 'true' &&
    /carpet/i.test(afterEnter.blurb) &&
    afterEnter.href === '/browse?category=carpet-cleaning' &&
    /Carpet Cleaning/i.test(afterEnter.label)
  if (!enterOk) failed = true
  report.push({ name: 'keyboard-enter', ok: enterOk, afterEnter })
  console.log('keyboard-enter', enterOk ? 'PASS' : 'FAIL')

  // Space on Other
  const other = page.getByTestId('available-service-other')
  await other.focus()
  await page.keyboard.press('Space')
  await page.waitForTimeout(200)
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="available-service-other"]')?.getAttribute('aria-pressed') === 'true',
  )
  const afterSpace = {
    pressed: await other.getAttribute('aria-pressed'),
    carpetPressed: await carpet.getAttribute('aria-pressed'),
    href: await page.getByTestId('available-services-browse').getAttribute('href'),
  }
  const spaceOk =
    afterSpace.pressed === 'true' &&
    afterSpace.carpetPressed === 'false' &&
    afterSpace.href === '/browse?category=other'
  if (!spaceOk) failed = true
  report.push({ name: 'keyboard-space', ok: spaceOk, afterSpace })
  console.log('keyboard-space', spaceOk ? 'PASS' : 'FAIL')

  // Touch-ish click junk
  await page.getByTestId('available-service-junk-removal').tap().catch(async () => {
    await page.getByTestId('available-service-junk-removal').click()
  })
  await page.waitForTimeout(80)
  const junkHref = await page.getByTestId('available-services-browse').getAttribute('href')
  const touchOk = junkHref === '/browse?category=junk-removal'
  if (!touchOk) failed = true
  report.push({ name: 'touch-select', ok: touchOk, junkHref })
  console.log('touch-select', touchOk ? 'PASS' : 'FAIL')

  // Follow browse link route
  await page.getByTestId('available-services-browse').click()
  await page.waitForURL(/\/browse\?category=junk-removal/, { timeout: 15000 })
  const routeOk = page.url().includes('/browse?category=junk-removal')
  if (!routeOk) failed = true
  report.push({ name: 'browse-route', ok: routeOk, url: page.url() })
  console.log('browse-route', routeOk ? 'PASS' : 'FAIL', page.url())

  // Back to landing for contrast + screenshots
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()
  await page.getByTestId('available-service-pet-sitting').click()
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="available-service-pet-sitting"]')?.getAttribute('aria-pressed') ===
      'true',
  )
  await page.mouse.move(0, 0)
  await page.waitForTimeout(150)

  const colors = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="available-services"]')
    const group = root.querySelector('[data-testid="available-services-group"]')
    const title = root.querySelector('h2')
    const body = root.querySelector('h2 + p')
    const selected = group.querySelector('[data-testid="available-service-pet-sitting"]')
    const unselected = group.querySelector('[data-testid="available-service-house-cleaning"]')
    const blurb = root.querySelector('[data-testid="available-services-blurb"]')
    const detail = root.querySelector('[data-testid="available-services-detail"]')
    return {
      sectionBg: getComputedStyle(root).backgroundColor,
      title: getComputedStyle(title).color,
      body: getComputedStyle(body).color,
      selectedBg: getComputedStyle(selected).backgroundColor,
      selectedFg: getComputedStyle(selected).color,
      unselectedBg: getComputedStyle(unselected).backgroundColor,
      unselectedFg: getComputedStyle(unselected).color,
      unselectedBorder: getComputedStyle(unselected).borderTopColor,
      blurb: getComputedStyle(blurb).color,
      detailBg: getComputedStyle(detail).backgroundColor,
      selectedPressed: selected?.getAttribute('aria-pressed'),
      unselectedPressed: unselected?.getAttribute('aria-pressed'),
      selectedTestId: selected?.getAttribute('data-testid'),
      unselectedTestId: unselected?.getAttribute('data-testid'),
    }
  })
  const sectionBg = parseRgb(colors.sectionBg)
  const titleC = parseRgb(colors.title)
  const bodyC = parseRgb(colors.body)
  const selBg = parseRgb(colors.selectedBg)
  const selFg = parseRgb(colors.selectedFg)
  const unsBg = parseRgb(colors.unselectedBg)
  const unsFg = parseRgb(colors.unselectedFg)
  const unsBorder = parseRgb(colors.unselectedBorder)
  const blurbC = parseRgb(colors.blurb)
  const detailBg = parseRgb(colors.detailBg)
  const pairs = {
    titleOnSection: Number(contrast(titleC, sectionBg).toFixed(2)),
    bodyOnSection: Number(contrast(bodyC, sectionBg).toFixed(2)),
    selectedFgOnBg: Number(contrast(selFg, selBg).toFixed(2)),
    unselectedFgOnBg: Number(contrast(unsFg, unsBg).toFixed(2)),
    blurbOnDetail: Number(contrast(blurbC, detailBg).toFixed(2)),
    unselectedBorderOnSection: unsBorder ? Number(contrast(unsBorder, sectionBg).toFixed(2)) : 0,
  }
  const contrastOk =
    pairs.titleOnSection >= 4.5 &&
    pairs.bodyOnSection >= 4.5 &&
    pairs.selectedFgOnBg >= 4.5 &&
    pairs.unselectedFgOnBg >= 4.5 &&
    pairs.blurbOnDetail >= 4.5 &&
    pairs.unselectedBorderOnSection >= 3
  if (!contrastOk) failed = true
  report.push({ name: 'contrast', ok: contrastOk, colors, pairs })
  console.log('contrast', contrastOk ? 'PASS' : 'FAIL', JSON.stringify(pairs))

  // Reduced motion still interactive
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByTestId('available-service-grooming').click()
  const reducedHref = await page.getByTestId('available-services-browse').getAttribute('href')
  const reducedOk = reducedHref === '/browse?category=grooming'
  if (!reducedOk) failed = true
  report.push({ name: 'reduced-motion', ok: reducedOk, reducedHref })
  console.log('reduced-motion', reducedOk ? 'PASS' : 'FAIL')

  await page.mouse.move(0, 0)
  await page.waitForTimeout(100)
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
  await page.getByTestId('available-services').screenshot({ path: join(OUT, 'mobile-390.png') })
  copyFileSync(join(OUT, 'mobile-390.png'), join(ART, 'available-services-mobile.png'))

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.getByTestId('available-services').scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  await page.getByTestId('available-services').screenshot({ path: join(OUT, 'tablet-768.png') })
  copyFileSync(join(OUT, 'tablet-768.png'), join(ART, 'available-services-tablet.png'))

  // Role regression: guest still sees Meet helpers path in helpers section (discovery intact)
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
