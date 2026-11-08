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

const EXPECTED_PILLS = [
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

    const eyebrow = await page.locator('p').filter({ hasText: /Rated/ }).first().innerText()
    assertNoAustin(`guest eyebrow @ ${vp.name}`, eyebrow)
    if (!/Trusted across local neighborhoods/i.test(eyebrow)) {
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

    // ——— Why Beam section ———
    const why = page.getByTestId('why-beam-section')
    await why.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)

    // No duplicate mini-form
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

    const whyHeading = (await why.locator('h2').innerText()).replace(/\s+/g, ' ').trim()
    if (whyHeading !== 'Why choose Beam') {
      throw new Error(`Why Beam h2 mismatch: "${whyHeading}"`)
    }
    assertNoAustin(`why-beam subtitle @ ${vp.name}`, await why.getByTestId('why-beam-copy').innerText())

    // Live offers card present
    const offers = page.getByTestId('why-beam-live-offers')
    await offers.waitFor({ state: 'visible' })
    const offersText = await offers.innerText()
    if (!/Help carry dresser/i.test(offersText) || !/\$65/.test(offersText) || !/\$75/.test(offersText)) {
      throw new Error(`Live offers card missing expected content @ ${vp.name}: ${offersText.slice(0, 120)}`)
    }

    // Showcase image must load
    const imgOk = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="why-beam-showcase"]')
      if (!root) return { ok: false, reason: 'showcase missing' }
      const imgs = Array.from(root.querySelectorAll('img'))
      const broken = imgs.filter((img) => !img.complete || img.naturalWidth === 0)
      const hero = imgs[0]
      return {
        ok: broken.length === 0 && !!hero && hero.naturalWidth >= 800,
        count: imgs.length,
        naturalWidth: hero?.naturalWidth ?? 0,
        broken: broken.map((i) => i.src),
      }
    })
    if (!imgOk.ok) {
      throw new Error(`Why Beam showcase images failed @ ${vp.name}: ${JSON.stringify(imgOk)}`)
    }

    // Layout geometry: two columns flush on desktop
    if (vp.width >= 1024) {
      const geo = await page.evaluate(() => {
        const copy = document.querySelector('[data-testid="why-beam-copy"]')
        const showcase = document.querySelector('[data-testid="why-beam-showcase"]')
        const container = copy?.closest('.beam-container')
        if (!copy || !showcase || !container) return { ok: false, reason: 'missing nodes' }
        const c = copy.getBoundingClientRect()
        const s = showcase.getBoundingClientRect()
        const box = container.getBoundingClientRect()
        const topDelta = Math.abs(c.top - s.top)
        const bottomDelta = Math.abs(c.bottom - s.bottom)
        const leftFlush = Math.abs(c.left - (box.left + 20)) < 48 || c.left >= box.left
        const rightFlush = Math.abs(s.right - box.right) < 48 || s.right <= box.right + 2
        return {
          ok: topDelta < 8 && bottomDelta < 48 && leftFlush && rightFlush && c.width > 200 && s.width > 200,
          topDelta,
          bottomDelta,
          copyH: Math.round(c.height),
          showcaseH: Math.round(s.height),
          gap: Math.round(s.left - c.right),
        }
      })
      if (!geo.ok) {
        throw new Error(`Why Beam columns not balanced @ ${vp.name}: ${JSON.stringify(geo)}`)
      }
      summary.checks.push({ name: `why-beam-geometry-${vp.name}`, ok: true, geo })
    }

    // Task pills: casual-launch services (no legacy Moving/Handyman/Tutoring)
    const pillsRoot = page.getByTestId('why-beam-task-pills')
    await pillsRoot.scrollIntoViewIfNeeded()
    const pillLinks = pillsRoot.locator('a')
    const pillCount = await pillLinks.count()
    if (pillCount !== EXPECTED_PILLS.length) {
      throw new Error(`Expected ${EXPECTED_PILLS.length} task pills, got ${pillCount} @ ${vp.name}`)
    }
    const pillLabels = []
    for (let i = 0; i < pillCount; i++) {
      pillLabels.push((await pillLinks.nth(i).innerText()).replace(/\s+/g, ' ').trim())
    }
    for (const expected of EXPECTED_PILLS) {
      if (!pillLabels.some((l) => l.includes(expected))) {
        throw new Error(`Missing pill "${expected}" @ ${vp.name}: ${pillLabels.join(', ')}`)
      }
    }
    // No bare "Moving" / "Cleaning" category short labels as extra pills
    if (pillLabels.some((l) => l === 'Moving' || l === 'Cleaning')) {
      throw new Error(`Duplicate CATEGORIES shortLabel pills still present @ ${vp.name}`)
    }

    const pillStyles = await pillsRoot.evaluate((root) => {
      return Array.from(root.querySelectorAll('a')).map((a) => {
        const cs = getComputedStyle(a)
        return {
          bg: cs.backgroundColor,
          text: (a.textContent || '').trim(),
        }
      })
    })
    const nonWhite = pillStyles.filter((p) => {
      // white-ish
      const m = p.bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (!m) return true
      const [, r, g, b] = m.map(Number)
      return !(r >= 245 && g >= 245 && b >= 245)
    })
    if (nonWhite.length) {
      throw new Error(`Non-white task pills @ ${vp.name}: ${JSON.stringify(nonWhite)}`)
    }

    const whyShot = join('/tmp', `why-beam-${vp.name}.png`)
    await why.screenshot({ path: whyShot })
    const whyArtifact = saveShot(whyShot, `why-beam-${vp.name}.png`)

    const pillsShot = join('/tmp', `why-beam-pills-${vp.name}.png`)
    await pillsRoot.screenshot({ path: pillsShot })
    const pillsArtifact = saveShot(pillsShot, `why-beam-pills-${vp.name}.png`)

    summary.checks.push({
      name: `why-beam-${vp.name}`,
      ok: true,
      pillLabels,
      imgNaturalWidth: imgOk.naturalWidth,
      artifacts: { why: whyArtifact, pills: pillsArtifact },
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
