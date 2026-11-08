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

  // Reduced motion: CSS scroll-behavior auto + imperative scroll is instant (not smooth)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(50)
  const reducedScrollStyle = await page.evaluate(() => {
    const row = document.querySelector('[data-testid="available-services-row"]')
    return row ? getComputedStyle(row).scrollBehavior : null
  })
  const styleOk = reducedScrollStyle === 'auto'
  if (!styleOk) failed = true
  report.push({ name: 'reduced-motion-scroll-style', ok: styleOk, reducedScrollStyle })
  console.log('reduced-motion-scroll-style', styleOk ? 'PASS' : 'FAIL', reducedScrollStyle)

  // Reset row to start, then click next and assert jump completes without mid-animation lag
  await page.evaluate(() => {
    const row = document.querySelector('[data-testid="available-services-row"]')
    if (row) row.scrollLeft = 0
  })
  await page.waitForTimeout(40)
  const nextUnderReduce = page.getByTestId('available-services-next')
  const canScrollReduce = await nextUnderReduce.isEnabled()
  let instantScrollOk = !canScrollReduce
  let scrollProbe = null
  if (canScrollReduce) {
    scrollProbe = await page.evaluate(async () => {
      const row = document.querySelector('[data-testid="available-services-row"]')
      const card = row?.querySelector('[data-service-card]')
      const delta = (card?.getBoundingClientRect().width || 220) + 16
      const before = row.scrollLeft
      // Mirror component: reduced-motion → instant
      row.scrollBy({ left: delta, behavior: 'instant' })
      const mid = row.scrollLeft
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const after = row.scrollLeft
      return {
        before,
        mid,
        after,
        delta,
        jumpedImmediately: mid >= before + delta * 0.85,
        stayedPut: Math.abs(after - mid) < 2,
        scrollBehavior: getComputedStyle(row).scrollBehavior,
      }
    })
    // Also click the real control and confirm position advances immediately
    const beforeClick = await page.evaluate(
      () => document.querySelector('[data-testid="available-services-row"]')?.scrollLeft || 0,
    )
    await nextUnderReduce.click()
    // Sample ASAP — smooth animation would still be mid-tween; instant should already be near target
    const samples = []
    for (let i = 0; i < 4; i++) {
      samples.push(
        await page.evaluate(
          () => document.querySelector('[data-testid="available-services-row"]')?.scrollLeft || 0,
        ),
      )
      await page.waitForTimeout(16)
    }
    const first = samples[0]
    const last = samples[samples.length - 1]
    instantScrollOk =
      first > beforeClick + 8 &&
      Math.abs(last - first) < 4 && // no continuing smooth tween
      scrollProbe?.jumpedImmediately === true &&
      scrollProbe?.stayedPut === true
    scrollProbe = { ...scrollProbe, beforeClick, samples, first, last }
  }
  if (!instantScrollOk) failed = true
  report.push({ name: 'reduced-motion-instant-scroll', ok: instantScrollOk, scrollProbe })
  console.log('reduced-motion-instant-scroll', instantScrollOk ? 'PASS' : 'FAIL')

  // Reduced motion still navigates via card link
  await page.getByTestId('available-service-grooming').click()
  await page.waitForURL(/\/browse\?category=grooming/, { timeout: 15000 })
  const reducedNavOk = page.url().includes('/browse?category=grooming')
  if (!reducedNavOk) failed = true
  report.push({ name: 'reduced-motion-nav', ok: reducedNavOk })
  console.log('reduced-motion-nav', reducedNavOk ? 'PASS' : 'FAIL')

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
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

  // Content-hash uniqueness for currently rendered landing photos (not just paths)
  const rendered = await page.evaluate(() => {
    function normalizeSrc(raw) {
      if (!raw) return ''
      try {
        const url = new URL(raw, location.origin)
        if (url.pathname === '/_next/image') {
          const nested = url.searchParams.get('url')
          if (nested) return decodeURIComponent(nested)
        }
        return url.pathname
      } catch {
        return raw
      }
    }
    return [...document.querySelectorAll('img')].map((img, i) => ({
      i,
      path: normalizeSrc(img.getAttribute('src') || img.currentSrc || ''),
      currentSrc: img.currentSrc || img.src || '',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      alt: (img.getAttribute('alt') || '').slice(0, 80),
    }))
  })

  const { createHash } = await import('node:crypto')
  const hashRows = []
  for (const img of rendered) {
    const res = await page.request.get(img.currentSrc)
    const buf = Buffer.from(await res.body())
    const sha = createHash('sha256').update(buf).digest('hex')
    hashRows.push({ ...img, bytes: buf.length, sha256: sha })
  }
  const byHash = new Map()
  for (const row of hashRows) {
    const list = byHash.get(row.sha256) || []
    list.push(row.path)
    byHash.set(row.sha256, list)
  }
  const contentDupes = [...byHash.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([sha, paths]) => ({ sha, paths }))
  const contentUniqueOk = contentDupes.length === 0
  if (!contentUniqueOk) failed = true
  report.push({
    name: 'landing-photo-content-hashes',
    ok: contentUniqueOk,
    count: hashRows.length,
    uniqueHashes: byHash.size,
    contentDupes,
    hashes: hashRows.map((r) => ({ path: r.path, sha256: r.sha256, bytes: r.bytes, nw: r.naturalWidth })),
  })
  console.log(
    'landing-photo-content-hashes',
    contentUniqueOk ? 'PASS' : 'FAIL',
    `${byHash.size}/${hashRows.length} unique content hashes`,
  )
  writeFileSync(join(OUT, 'landing-photo-hashes.json'), JSON.stringify(hashRows, null, 2))
  copyFileSync(join(OUT, 'landing-photo-hashes.json'), join(ART, 'landing-photo-hashes.json'))

  // Contact sheet of rendered landing photos (evidence)
  const sheet = await browser.newPage({ viewport: { width: 1400, height: 1800 } })
  const cells = hashRows
    .map(
      (r) => `
      <figure style="margin:0;border:1px solid #C7D7F0;border-radius:10px;overflow:hidden;background:#fff">
        <img src="${r.currentSrc}" alt="" style="display:block;width:100%;height:140px;object-fit:cover" />
        <figcaption style="padding:8px 10px;font:12px/1.35 ui-sans-serif,system-ui;color:#071330">
          <div style="font-weight:700;word-break:break-all">${r.path}</div>
          <div style="color:#475569;margin-top:4px">${r.sha256.slice(0, 12)}… · ${r.naturalWidth}×${r.naturalHeight}</div>
        </figcaption>
      </figure>`,
    )
    .join('')
  await sheet.setContent(`<!doctype html><html><body style="margin:0;padding:24px;background:#EEF4FF;font-family:ui-sans-serif,system-ui">
    <h1 style="margin:0 0 8px;color:#071330;font-size:22px">Landing photos — content uniqueness</h1>
    <p style="margin:0 0 18px;color:#334155;font-size:14px">${hashRows.length} rendered · ${byHash.size} unique sha256 · dupes ${contentDupes.length}</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${cells}</div>
  </body></html>`)
  await sheet.waitForTimeout(400)
  await sheet.screenshot({ path: join(OUT, 'landing-photo-contact-sheet.png'), fullPage: true })
  copyFileSync(join(OUT, 'landing-photo-contact-sheet.png'), join(ART, 'landing-photo-contact-sheet.png'))
  await sheet.close()

  await page.close()
} finally {
  await browser.close()
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
copyFileSync(join(OUT, 'report.json'), join(ART, 'available-services-qa-report.json'))
console.log(failed ? '\nOVERALL: FAIL' : '\nOVERALL: PASS')
process.exit(failed ? 1 : 0)
