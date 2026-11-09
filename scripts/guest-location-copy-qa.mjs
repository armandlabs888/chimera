/**
 * Guest location-copy + Why Beam refactor visual QA.
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

function assertNoAustin(label, text) {
  if (/austin/i.test(text)) {
    throw new Error(`${label} unexpectedly contains Austin: "${text}"`)
  }
}

const EXPECTED_SERVICES = [
  'House Cleaning',
  'Carpet Cleaning',
  'Auto Detailing',
  'Junk Removal',
  'Pet Sitting',
  'Grooming',
]

const summary = { ok: true, checks: [] }

const browser = await chromium.launch({ headless: true })
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      storageState: undefined,
    })
    const page = await context.newPage()

    // ——— Guest home / hero ———
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })

    const h1 = (await page.locator('h1').innerText()).replace(/\s+/g, ' ').trim()
    if (h1 !== 'Local help, made easy.') {
      throw new Error(`Guest h1 expected "Local help, made easy." got "${h1}" @ ${vp.name}`)
    }
    assertNoAustin(`guest h1 @ ${vp.name}`, h1)

    const eyebrow = await page
      .locator('p')
      .filter({ hasText: /Local services/i })
      .first()
      .innerText()
    assertNoAustin(`guest eyebrow @ ${vp.name}`, eyebrow)
    if (!/Local services/i.test(eyebrow) || !/everyday help/i.test(eyebrow)) {
      throw new Error(`Guest eyebrow missing location-neutral copy: "${eyebrow}"`)
    }

    if ((await page.getByTestId('hero-neighborhood-trigger').count()) > 0) {
      throw new Error(`Guest hero still exposes Austin neighborhood trigger @ ${vp.name}`)
    }
    const trigger = page.getByTestId('hero-category-trigger')
    const triggerLabel = (await trigger.innerText()).trim()
    assertNoAustin(`guest search trigger @ ${vp.name}`, triggerLabel)
    if (!/All categories/i.test(triggerLabel)) {
      throw new Error(`Guest trigger expected All categories, got "${triggerLabel}"`)
    }

    await trigger.click()
    const listbox = page.getByTestId('hero-category-listbox')
    await listbox.waitFor({ state: 'visible', timeout: 10000 })
    const listText = await listbox.innerText()
    for (const name of [
      'East Austin',
      'Hyde Park',
      'Mueller',
      'Zilker',
      'South Congress',
      'Travis Heights',
      'Clarksville',
      'The Domain',
    ]) {
      if (listText.includes(name)) {
        throw new Error(`Guest hero category listbox includes Austin neighborhood "${name}" @ ${vp.name}`)
      }
    }
    const allOption = listbox.locator('button').first()
    const allText = (await allOption.innerText()).trim()
    assertNoAustin(`guest all-option @ ${vp.name}`, allText)
    if (!/All categories/i.test(allText)) {
      throw new Error(`Guest all-option expected "All categories", got "${allText}"`)
    }
    if (!/Home/i.test(listText) || !/Pets/i.test(listText) || !/Other/i.test(listText)) {
      throw new Error(`Guest category listbox missing casual parents @ ${vp.name}`)
    }
    await page.keyboard.press('Escape')
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

    const title = await page.title()
    assertNoAustin(`guest document title @ ${vp.name}`, title)
    if (!/Local help, made easy/i.test(title)) {
      throw new Error(`Guest title missing neutral headline: "${title}"`)
    }

    const heroShot = join('/tmp', `guest-hero-${vp.name}.png`)
    await page.screenshot({ path: heroShot, fullPage: false })
    const heroArtifact = saveShot(heroShot, `guest-hero-${vp.name}.png`)

    summary.checks.push({
      name: `guest-home-${vp.name}`,
      ok: true,
      h1,
      triggerLabel,
      title,
      artifact: heroArtifact,
    })
    console.log(`PASS guest-home @ ${vp.name} → ${heroArtifact}`)

    // ——— Why Beam section (factual pillars; no live offers / nested Available services) ———
    const why = page.getByTestId('why-beam-section')
    await why.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)

    const formCount = await why.locator('form').count()
    if (formCount !== 0) {
      throw new Error(`Why Beam still has ${formCount} form(s) @ ${vp.name}`)
    }
    if ((await why.getByPlaceholder('What service do you need?').count()) > 0) {
      throw new Error(`Why Beam still shows duplicate service input @ ${vp.name}`)
    }
    if ((await why.locator('select').count()) > 0) {
      throw new Error(`Why Beam still has native select @ ${vp.name}`)
    }
    if ((await why.getByTestId('available-services').count()) > 0) {
      throw new Error(`Available services still nested inside Why Beam @ ${vp.name}`)
    }
    if ((await page.getByTestId('why-beam-live-offers').count()) > 0) {
      throw new Error(`Hardcoded live offers restored @ ${vp.name}`)
    }
    if ((await page.getByTestId('why-beam-showcase').count()) > 0) {
      throw new Error(`Why Beam showcase collage still present @ ${vp.name}`)
    }

    const whyHeading = (
      await why.getByRole('heading', { level: 2, name: /Know what you.?re choosing/i }).innerText()
    )
      .replace(/\s+/g, ' ')
      .trim()
    if (!/Know what you.?re choosing/i.test(whyHeading)) {
      throw new Error(`Why Beam h2 mismatch: "${whyHeading}"`)
    }
    assertNoAustin(`why-beam body @ ${vp.name}`, await why.innerText())
    for (const claim of [/same-day/i, /vetted/i, /verified badge/i, /\+\d{2,}/]) {
      if (claim.test(await why.innerText())) {
        throw new Error(`Why Beam still invents claim matching ${claim} @ ${vp.name}`)
      }
    }

    // Available services is an independent sibling section (not nested in Why Beam)
    const servicesRoot = page.getByTestId('available-services')
    await servicesRoot.scrollIntoViewIfNeeded()
    if (!(await page.getByText(/Available services on Beam/i).count())) {
      throw new Error(`Missing Available services heading @ ${vp.name}`)
    }
    if ((await page.getByTestId('available-services-detail').count()) > 0) {
      throw new Error(`Selector/detail panel still present @ ${vp.name}`)
    }
    const serviceCards = servicesRoot.locator('[data-testid="available-services-grid"] a[data-service-card]')
    const serviceCount = await serviceCards.count()
    if (serviceCount !== EXPECTED_SERVICES.length) {
      throw new Error(`Expected ${EXPECTED_SERVICES.length} service cards, got ${serviceCount} @ ${vp.name}`)
    }
    if ((await page.getByTestId('available-service-other').count()) > 0) {
      throw new Error(`Other card still present in Available services @ ${vp.name}`)
    }
    if ((await page.getByTestId('available-services-controls').count()) > 0) {
      throw new Error(`Carousel controls still present @ ${vp.name}`)
    }
    await page.waitForFunction(() => {
      const imgs = [
        ...document.querySelectorAll('[data-testid="available-services-grid"] a[data-service-card] img'),
      ]
      return imgs.length === 6 && imgs.every((img) => img.complete && img.naturalWidth >= 200)
    }, null, { timeout: 20000 })
    const serviceLabels = []
    for (let i = 0; i < serviceCount; i++) {
      serviceLabels.push((await serviceCards.nth(i).innerText()).replace(/\s+/g, ' ').trim())
    }
    for (const expected of EXPECTED_SERVICES) {
      if (!serviceLabels.some((l) => l.includes(expected))) {
        throw new Error(`Missing service "${expected}" @ ${vp.name}: ${serviceLabels.join(', ')}`)
      }
    }
    if (serviceLabels.some((l) => l === 'Moving' || l === 'Cleaning' || l === 'Handyman')) {
      throw new Error(`Legacy shortLabel tiles still present @ ${vp.name}`)
    }
    const cardMeta = await servicesRoot.evaluate((root) => {
      return Array.from(root.querySelectorAll('[data-testid="available-services-grid"] a[data-service-card]')).map(
        (a) => {
          const img = a.querySelector('img')
          const cs = getComputedStyle(a)
          return {
            href: a.getAttribute('href'),
            bg: cs.backgroundColor,
            hasImg: !!img && img.complete && img.naturalWidth >= 200,
            text: (a.textContent || '').trim(),
          }
        },
      )
    })
    if (cardMeta.some((c) => !c.hasImg)) {
      throw new Error(`Service card image missing/broken @ ${vp.name}`)
    }
    if (cardMeta.some((c) => !/^\/browse\?category=/.test(c.href || ''))) {
      throw new Error(`Service card href not leaf Browse @ ${vp.name}: ${JSON.stringify(cardMeta)}`)
    }
    const nonWhiteCards = cardMeta.filter((c) => {
      const m = c.bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (!m) return true
      const [, r, g, b] = m.map(Number)
      return !(r >= 245 && g >= 245 && b >= 245)
    })
    if (nonWhiteCards.length) {
      throw new Error(`Service cards not white chrome @ ${vp.name}: ${JSON.stringify(nonWhiteCards)}`)
    }

    const whyShot = join('/tmp', `why-beam-${vp.name}.png`)
    await why.screenshot({ path: whyShot })
    const whyArtifact = saveShot(whyShot, `why-beam-${vp.name}.png`)

    const servicesShot = join('/tmp', `available-services-${vp.name}.png`)
    await servicesRoot.screenshot({ path: servicesShot })
    const servicesArtifact = saveShot(servicesShot, `available-services-strip-${vp.name}.png`)

    summary.checks.push({
      name: `why-beam-${vp.name}`,
      ok: true,
      serviceLabels,
      artifacts: { why: whyArtifact, services: servicesArtifact },
    })
    console.log(`PASS why-beam @ ${vp.name} → ${whyArtifact}`)

    // ——— Guest browse ———
    await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('text=Browse Local Jobs', { timeout: 15000 })
    const browseBody = await page.locator('body').innerText()
    if (/across Austin neighborhoods/i.test(browseBody)) {
      throw new Error(`Guest /browse still assumes Austin @ ${vp.name}`)
    }
    // Guest subtitle must stay location-neutral (no Austin assumption in heading/subtitle).
    const browseH1 = (await page.locator('h1').first().innerText()).replace(/\s+/g, ' ').trim()
    assertNoAustin(`guest browse h1 @ ${vp.name}`, browseH1)
    if (!/Browse Local Jobs/i.test(browseH1)) {
      throw new Error(`Guest /browse missing location-neutral title @ ${vp.name}: ${browseH1}`)
    }
    if (/Austin/i.test(browseBody.split('\n').slice(0, 12).join('\n'))) {
      // First viewport chrome + header should stay Austin-free for guests
      const headerSlice = browseBody.split('\n').slice(0, 16).join('\n')
      if (/across Austin|in Austin|Austin neighborhoods/i.test(headerSlice)) {
        throw new Error(`Guest /browse header assumes Austin @ ${vp.name}: ${headerSlice}`)
      }
    }
    if ((await page.getByTestId('browse-neighborhood-trigger').count()) > 0) {
      throw new Error(`Guest /browse still shows Austin neighborhood trigger @ ${vp.name}`)
    }
    // Timing lives in Filters sidebar (xl) or mobile Filters sheet.
    const filtersBtn = page.getByRole('button', { name: 'Filters' })
    if ((await filtersBtn.count()) > 0 && (await filtersBtn.isVisible())) {
      await filtersBtn.click()
    }
    const whenInFilters = page.getByRole('button', { name: /^ASAP$/ })
    if ((await whenInFilters.count()) < 1) {
      throw new Error(`Guest /browse missing timing filters @ ${vp.name}`)
    }
    // Category filters must be casual parents, not legacy Austin-era taxonomy.
    for (const bad of ['Moving & lifting', 'Handyman & assembly', 'Tutoring & tech help']) {
      if ((await page.getByRole('button', { name: new RegExp(bad) }).count()) > 0) {
        throw new Error(`Guest browse still exposes legacy category "${bad}" @ ${vp.name}`)
      }
    }

    const sortTrigger = page.getByTestId('browse-sort-trigger')
    await sortTrigger.click()
    const sortList = page.getByTestId('browse-sort-listbox')
    await sortList.waitFor({ state: 'visible', timeout: 10000 })
    const sortText = await sortList.innerText()
    if (!/Newest first/i.test(sortText)) {
      throw new Error(`Guest sort missing Newest first @ ${vp.name}`)
    }
    await page.keyboard.press('Escape')

    const browseShot = join('/tmp', `guest-browse-${vp.name}.png`)
    await page.screenshot({ path: browseShot, fullPage: false })
    const browseArtifact = saveShot(browseShot, `guest-browse-${vp.name}.png`)
    summary.checks.push({ name: `guest-browse-${vp.name}`, ok: true, artifact: browseArtifact })
    console.log(`PASS guest-browse @ ${vp.name} → ${browseArtifact}`)

    await context.close()
  }

  // Auth marketing for signed-out guests
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle', timeout: 60000 })
    const authText = await page.locator('body').innerText()
    if (/Local help in Austin/i.test(authText)) {
      throw new Error('Guest /auth still shows "Local help in Austin"')
    }
    summary.checks.push({ name: 'guest-auth-headline', ok: true })
    console.log('PASS guest-auth-headline')
    await context.close()
  }
} catch (err) {
  summary.ok = false
  summary.error = String(err?.stack || err)
  console.error('FAIL', err)
} finally {
  await browser.close()
}

const summaryPath = join(OUT, 'guest-why-beam-qa.json')
writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
writeFileSync(join(LOCAL_OUT, 'guest-why-beam-qa.json'), JSON.stringify(summary, null, 2))
console.log(summary.ok ? 'ALL PASS' : 'FAILED')
console.log(summaryPath)
process.exit(summary.ok ? 0 : 1)
