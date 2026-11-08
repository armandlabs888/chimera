/**
 * Interaction + contrast QA for redesigned #how-it-works sample demos.
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

  // Structure
  const structure = await page.evaluate(() => {
    const section = document.querySelector('#how-it-works')
    const steps = [...section.querySelectorAll('[data-testid="how-it-works-steps"] > li')]
    const bottomPost = [...section.querySelectorAll('a,button')].filter((el) =>
      /^Post a task$/i.test((el.textContent || '').trim()),
    )
    const demoPostBtn = [...section.querySelectorAll('*')].filter((el) =>
      /^Post task$/i.test((el.textContent || '').trim()),
    )
    const best = /BEST/i.test(section.innerText)
    const floatingMarkers = [...section.querySelectorAll('li')].some((li) => {
      const absNums = [...li.querySelectorAll('span')].filter((s) => {
        const t = (s.textContent || '').trim()
        const cs = getComputedStyle(s)
        return /^[123]$/.test(t) && cs.position === 'absolute'
      })
      return absNums.length > 0
    })
    const headerNums = steps.map((li) => {
      const chip = li.querySelector('h3')?.previousElementSibling || li.querySelector('.bg-\\[\\#1D5CE5\\]')
      // number chip next to title in header
      const header = li.firstElementChild
      const num = header?.querySelector('span')
      return (num?.textContent || '').trim()
    })
    return {
      stepCount: steps.length,
      sampleCount: (section.innerText.match(/Sample/gi) || []).length,
      bottomPost: bottomPost.length,
      demoPostBtn: demoPostBtn.length,
      best,
      floatingMarkers,
      headerNums,
      hasInteractive:
        !!section.querySelector('[data-testid="how-demo-tasks"]') &&
        !!section.querySelector('[data-testid="how-demo-offers"]') &&
        !!section.querySelector('[data-testid="how-demo-rating"]'),
    }
  })
  const structureOk =
    structure.stepCount === 3 &&
    structure.sampleCount >= 3 &&
    structure.bottomPost === 0 &&
    structure.demoPostBtn === 0 &&
    !structure.best &&
    !structure.floatingMarkers &&
    structure.headerNums.join('') === '123' &&
    structure.hasInteractive
  if (!structureOk) failed = true
  report.push({ name: 'structure', ok: structureOk, structure })
  console.log('structure', structureOk ? 'PASS' : 'FAIL', JSON.stringify(structure))

  // Task demo interaction
  await page.getByTestId('how-demo-task-clean').click()
  await page.waitForTimeout(80)
  const taskText = await page.getByTestId('how-demo-task-summary').innerText()
  const taskPressed = await page.getByTestId('how-demo-task-clean').getAttribute('aria-pressed')
  const taskOk = /Kitchen reset/i.test(taskText) && taskPressed === 'true' && /Sample draft ready/i.test(taskText)
  if (!taskOk) failed = true
  report.push({ name: 'task-click', ok: taskOk, taskText, taskPressed })
  console.log('task-click', taskOk ? 'PASS' : 'FAIL')

  // Keyboard offer select
  const offerCaleb = page.getByTestId('how-demo-offer-caleb')
  await offerCaleb.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(80)
  const offerStatus = await page.getByTestId('how-demo-offer-status').innerText()
  const offerSelected = await offerCaleb.getAttribute('aria-selected')
  const offerOk = /Caleb R/i.test(offerStatus) && offerSelected === 'true'
  if (!offerOk) failed = true
  report.push({ name: 'offer-keyboard', ok: offerOk, offerStatus, offerSelected })
  console.log('offer-keyboard', offerOk ? 'PASS' : 'FAIL')

  // Rating via Space
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

  // Touch-ish: tap pets task
  await page.getByTestId('how-demo-task-walk').tap().catch(async () => {
    await page.getByTestId('how-demo-task-walk').click()
  })
  await page.waitForTimeout(80)
  const walkText = await page.getByTestId('how-demo-task-summary').innerText()
  const touchOk = /dog walk/i.test(walkText)
  if (!touchOk) failed = true
  report.push({ name: 'task-touch', ok: touchOk, walkText })
  console.log('task-touch', touchOk ? 'PASS' : 'FAIL')

  // Contrast on actual backgrounds
  const colors = await page.evaluate(() => {
    const section = document.querySelector('#how-it-works')
    const title = section.querySelector('h2')
    const body = section.querySelector('h2 + p') || section.querySelector('p.text-\\[16px\\]')
    const cardBody = section.querySelector('h3 + p')
    const canvas = section.querySelector('[data-testid="how-demo-tasks"]')?.parentElement
    return {
      sectionBg: getComputedStyle(section).backgroundColor,
      title: getComputedStyle(title).color,
      body: getComputedStyle(body).color,
      cardBody: getComputedStyle(cardBody).color,
      canvasBg: canvas ? getComputedStyle(canvas).backgroundColor : null,
      cardRadius: getComputedStyle(section.querySelector('li')).borderTopLeftRadius,
    }
  })
  const sectionBg = parseRgb(colors.sectionBg)
  const titleC = parseRgb(colors.title)
  const bodyC = parseRgb(colors.body)
  const cardBodyC = parseRgb(colors.cardBody)
  const contrastPairs = {
    title: Number(contrast(titleC, sectionBg).toFixed(2)),
    body: Number(contrast(bodyC, sectionBg).toFixed(2)),
    cardBodyOnWhite: Number(contrast(cardBodyC, [255, 255, 255]).toFixed(2)),
  }
  const contrastOk = Object.values(contrastPairs).every((v) => v >= 4.5) && colors.cardRadius === '10px'
  if (!contrastOk) failed = true
  report.push({ name: 'contrast', ok: contrastOk, colors, contrastPairs })
  console.log('contrast', contrastOk ? 'PASS' : 'FAIL', JSON.stringify(contrastPairs))

  // Reduced motion: page still interactive
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByTestId('how-demo-star-5').click()
  const rating5 = await page.getByTestId('how-demo-rating-status').innerText()
  const reducedOk = /5\s*\/\s*5/.test(rating5)
  if (!reducedOk) failed = true
  report.push({ name: 'reduced-motion', ok: reducedOk, rating5 })
  console.log('reduced-motion', reducedOk ? 'PASS' : 'FAIL')

  await page.locator('#how-it-works').screenshot({ path: join(OUT, 'desktop-1440.png') })
  copyFileSync(join(OUT, 'desktop-1440.png'), join(ART, 'how-interactive-desktop.png'))

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('#how-it-works').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  if (overflow) failed = true
  report.push({ name: 'mobile-overflow', ok: !overflow })
  console.log('mobile-overflow', !overflow ? 'PASS' : 'FAIL')
  await page.locator('#how-it-works').screenshot({ path: join(OUT, 'mobile-390.png') })
  copyFileSync(join(OUT, 'mobile-390.png'), join(ART, 'how-interactive-mobile.png'))

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.locator('#how-it-works').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await page.locator('#how-it-works').screenshot({ path: join(OUT, 'tablet-768.png') })
  copyFileSync(join(OUT, 'tablet-768.png'), join(ART, 'how-interactive-tablet.png'))

  await page.close()
} finally {
  await browser.close()
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
console.log(failed ? '\nOVERALL: FAIL' : '\nOVERALL: PASS')
process.exit(failed ? 1 : 0)
