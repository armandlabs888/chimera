/**
 * Interaction + contrast QA for Paper #how-it-works tabbed sample demos.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/tmp/beam-how-interactive-qa'
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

let failed = false
const report = []

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.locator('#how-it-works').scrollIntoViewIfNeeded()

  const structure = await page.evaluate(() => {
    const section = document.querySelector('#how-it-works')
    const tabs = [...section.querySelectorAll('[data-testid="how-it-works-steps"] [role="tab"]')]
    const bottomPost = [...section.querySelectorAll('a,button')].filter((el) =>
      /^Post a task$/i.test((el.textContent || '').trim()),
    )
    const best = /BEST/i.test(section.innerText)
    return {
      tabCount: tabs.length,
      selected: tabs.map((t) => t.getAttribute('aria-selected')),
      labels: tabs.map((t) => (t.textContent || '').trim()),
      sampleCount: (section.innerText.match(/Sample|Illustrative example/gi) || []).length,
      bottomPost: bottomPost.length,
      best,
      hasInteractive:
        !!section.querySelector('[data-testid="how-demo-tasks"]') &&
        !!section.querySelector('[data-testid="how-tab-compare"]') &&
        !!section.querySelector('[data-testid="how-tab-chat"]'),
      heading: (section.querySelector('h2')?.textContent || '').trim(),
    }
  })
  const structureOk =
    structure.tabCount === 3 &&
    structure.selected.join(',') === 'true,false,false' &&
    structure.sampleCount >= 1 &&
    structure.bottomPost === 0 &&
    !structure.best &&
    structure.hasInteractive &&
    /From to-do to done/i.test(structure.heading)
  if (!structureOk) failed = true
  report.push({ name: 'structure', ok: structureOk, structure })
  console.log('structure', structureOk ? 'PASS' : 'FAIL', JSON.stringify(structure))

  // Task demo interaction (default post tab)
  await page.getByTestId('how-demo-task-clean').click()
  await page.waitForTimeout(80)
  const taskText = await page.getByTestId('how-demo-task-summary').innerText()
  const taskPressed = await page.getByTestId('how-demo-task-clean').getAttribute('aria-pressed')
  const taskOk =
    /Kitchen reset/i.test(taskText) &&
    taskPressed === 'true' &&
    /Illustrative example/i.test(await page.getByTestId('how-panel-post').innerText())
  if (!taskOk) failed = true
  report.push({ name: 'task-click', ok: taskOk, taskText, taskPressed })
  console.log('task-click', taskOk ? 'PASS' : 'FAIL')

  // Switch to compare tab
  await page.getByTestId('how-tab-compare').click()
  await page.waitForTimeout(100)
  const compareVisible = await page.getByTestId('how-demo-offers').isVisible()
  if (!compareVisible) failed = true
  report.push({ name: 'tab-compare', ok: compareVisible })
  console.log('tab-compare', compareVisible ? 'PASS' : 'FAIL')

  const offerSemantics = await page.evaluate(() => {
    const group = document.querySelector('[data-testid="how-demo-offers"]')
    const buttons = [...group.querySelectorAll('button')]
    return {
      role: group.getAttribute('role'),
      labelledBy: group.getAttribute('aria-labelledby'),
      hasListbox: group.getAttribute('role') === 'listbox',
      optionRoles: buttons.map((b) => b.getAttribute('role')),
      pressedAttrs: buttons.map((b) => b.getAttribute('aria-pressed')),
    }
  })
  const offerSemanticsOk =
    offerSemantics.role === 'group' &&
    Boolean(offerSemantics.labelledBy) &&
    !offerSemantics.hasListbox &&
    offerSemantics.optionRoles.every((r) => r == null) &&
    offerSemantics.pressedAttrs.every((p) => p === 'true' || p === 'false') &&
    offerSemantics.pressedAttrs.filter((p) => p === 'true').length === 1
  if (!offerSemanticsOk) failed = true
  report.push({ name: 'offer-semantics', ok: offerSemanticsOk, offerSemantics })
  console.log('offer-semantics', offerSemanticsOk ? 'PASS' : 'FAIL')

  const offerCaleb = page.getByTestId('how-demo-offer-caleb')
  await offerCaleb.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(80)
  const offerStatus = await page.getByTestId('how-demo-offer-status').innerText()
  const offerPressed = await offerCaleb.getAttribute('aria-pressed')
  const offerSofiaPressed = await page.getByTestId('how-demo-offer-sofia').getAttribute('aria-pressed')
  const offerOk =
    /Caleb R/i.test(offerStatus) && offerPressed === 'true' && offerSofiaPressed === 'false'
  if (!offerOk) failed = true
  report.push({ name: 'offer-keyboard', ok: offerOk, offerStatus, offerPressed, offerSofiaPressed })
  console.log('offer-keyboard', offerOk ? 'PASS' : 'FAIL')

  await page.getByTestId('how-tab-chat').click()
  await page.waitForTimeout(100)
  const chatVisible = await page.getByTestId('how-demo-rating').isVisible()
  if (!chatVisible) failed = true
  report.push({ name: 'tab-chat', ok: chatVisible })
  console.log('tab-chat', chatVisible ? 'PASS' : 'FAIL')

  const star3 = page.getByTestId('how-demo-star-3')
  await star3.focus()
  await page.keyboard.press('Space')
  await page.waitForTimeout(80)
  const ratingStatus = await page.getByTestId('how-demo-rating-status').innerText()
  const starPressed = await star3.getAttribute('aria-pressed')
  const ratingOk = /3\s*\/\s*5/.test(ratingStatus) && starPressed === 'true'
  if (!ratingOk) failed = true
  report.push({ name: 'rating-keyboard', ok: ratingOk, ratingStatus, starPressed })
  console.log('rating-keyboard', ratingOk ? 'PASS' : 'FAIL')

  // Back to post via next link from chat, then pets task
  await page.getByTestId('how-next-chat').click()
  await page.waitForTimeout(80)
  await page.getByTestId('how-demo-task-walk').tap().catch(async () => {
    await page.getByTestId('how-demo-task-walk').click()
  })
  await page.waitForTimeout(80)
  const walkText = await page.getByTestId('how-demo-task-summary').innerText()
  const touchOk = /dog walk/i.test(walkText)
  if (!touchOk) failed = true
  report.push({ name: 'task-touch', ok: touchOk, walkText })
  console.log('task-touch', touchOk ? 'PASS' : 'FAIL')

  // Contrast on actual backgrounds + rating UI controls (≥3:1)
  await page.getByTestId('how-tab-chat').click()
  await page.waitForTimeout(80)
  await page.getByTestId('how-demo-star-5').click()
  const colors = await page.evaluate(() => {
    const section = document.querySelector('#how-it-works')
    const title = section.querySelector('h2')
    const body = section.querySelector('h2 + p')
    const cardBody = section.querySelector('[data-testid="how-panel-chat"] p')
    const panel = section.querySelector('[data-testid="how-panel-chat"] > div')
    const activeStar = section.querySelector('[data-testid="how-demo-star-1"][data-active="true"] svg')
    const idleStar = section.querySelector('[data-testid="how-demo-star-5"][data-active="false"] svg')
    // Force a mixed state for idle measurement
    return {
      sectionBg: getComputedStyle(section).backgroundColor,
      title: getComputedStyle(title).color,
      body: getComputedStyle(body).color,
      cardBody: cardBody ? getComputedStyle(cardBody).color : getComputedStyle(title).color,
      panelRadius: panel ? getComputedStyle(panel).borderTopLeftRadius : null,
      activeStarColor: activeStar ? getComputedStyle(activeStar).color : null,
      idleStarColor: idleStar ? getComputedStyle(idleStar).color : null,
    }
  })
  // Set rating to 3 so we have idle stars for contrast
  await page.getByTestId('how-demo-star-3').click()
  await page.waitForTimeout(60)
  const starColors = await page.evaluate(() => {
    const section = document.querySelector('#how-it-works')
    const activeStar = section.querySelector('[data-testid="how-demo-star-1"][data-active="true"] svg')
    const idleStar = section.querySelector('[data-testid="how-demo-star-5"][data-active="false"] svg')
    return {
      activeStarColor: activeStar ? getComputedStyle(activeStar).color : null,
      idleStarColor: idleStar ? getComputedStyle(idleStar).color : null,
    }
  })
  const sectionBg = parseRgb(colors.sectionBg)
  const titleC = parseRgb(colors.title)
  const bodyC = parseRgb(colors.body)
  const cardBodyC = parseRgb(colors.cardBody)
  const white = [255, 255, 255]
  const activeStarC = starColors.activeStarColor ? parseRgb(starColors.activeStarColor) : null
  const idleStarC = starColors.idleStarColor ? parseRgb(starColors.idleStarColor) : null
  const contrastPairs = {
    title: Number(contrast(titleC, sectionBg).toFixed(2)),
    body: Number(contrast(bodyC, sectionBg).toFixed(2)),
    cardBodyOnWhite: Number(contrast(cardBodyC, white).toFixed(2)),
    selectedStarOnWhite: activeStarC ? Number(contrast(activeStarC, white).toFixed(2)) : 0,
    unselectedStarOnWhite: idleStarC ? Number(contrast(idleStarC, white).toFixed(2)) : 0,
  }
  const radius = parseFloat(colors.panelRadius || '0')
  const textContrastOk =
    contrastPairs.title >= 4.5 && contrastPairs.body >= 4.5 && contrastPairs.cardBodyOnWhite >= 4.5
  const ratingContrastOk =
    contrastPairs.selectedStarOnWhite >= 3 &&
    contrastPairs.unselectedStarOnWhite >= 3 &&
    Boolean(starColors.activeStarColor) &&
    Boolean(starColors.idleStarColor)
  const contrastOk = textContrastOk && ratingContrastOk && radius >= 10 && radius <= 12
  if (!contrastOk) failed = true
  report.push({
    name: 'contrast',
    ok: contrastOk,
    colors,
    starColors,
    contrastPairs,
    radius,
    textContrastOk,
    ratingContrastOk,
  })
  console.log('contrast', contrastOk ? 'PASS' : 'FAIL', JSON.stringify(contrastPairs))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByTestId('how-demo-star-5').click()
  await page.waitForTimeout(80)
  const rating5 = await page.getByTestId('how-demo-rating-status').innerText()
  const reducedOk = /5\s*\/\s*5/.test(rating5)
  if (!reducedOk) failed = true
  report.push({ name: 'reduced-motion', ok: reducedOk, rating5 })
  console.log('reduced-motion', reducedOk ? 'PASS' : 'FAIL')

  await page.mouse.move(0, 0)
  await page.locator('body').click({ position: { x: 8, y: 8 } }).catch(() => {})
  await page.waitForTimeout(120)
  await page.locator('#how-it-works').screenshot({ path: join(OUT, 'desktop-1440.png') })
  copyFileSync(join(OUT, 'desktop-1440.png'), join(ART, 'how-interactive-desktop.png'))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('#how-it-works').scrollIntoViewIfNeeded()
  await page.getByTestId('how-demo-star-5').click()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(200)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  if (overflow) failed = true
  report.push({ name: 'mobile-overflow', ok: !overflow })
  console.log('mobile-overflow', !overflow ? 'PASS' : 'FAIL')
  await page.locator('#how-it-works').screenshot({ path: join(OUT, 'mobile-390.png') })
  copyFileSync(join(OUT, 'mobile-390.png'), join(ART, 'how-interactive-mobile.png'))

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.locator('#how-it-works').scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(200)
  await page.locator('#how-it-works').screenshot({ path: join(OUT, 'tablet-768.png') })
  copyFileSync(join(OUT, 'tablet-768.png'), join(ART, 'how-interactive-tablet.png'))

  await page.setViewportSize({ width: 320, height: 720 })
  await page.locator('#how-it-works').scrollIntoViewIfNeeded()
  const overflow320 = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  if (overflow320) failed = true
  report.push({ name: 'mobile-320-overflow', ok: !overflow320 })
  console.log('mobile-320-overflow', !overflow320 ? 'PASS' : 'FAIL')

  await page.close()
} finally {
  await browser.close()
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
copyFileSync(join(OUT, 'report.json'), join(ART, 'how-interactive-qa-report.json'))
console.log(failed ? '\nOVERALL: FAIL' : '\nOVERALL: PASS')
process.exit(failed ? 1 : 0)
