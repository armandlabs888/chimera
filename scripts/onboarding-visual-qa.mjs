#!/usr/bin/env node
/**
 * Playwright visual QA for /onboarding across desktop / tablet / mobile.
 * Saves screenshots to /opt/cursor/artifacts/onboarding-qa/ and prints probes.
 *
 * Covers:
 * - step1-initial (split layout on desktop, popular chips, crisp disabled Next)
 * - step1-autocomplete-open (dropdown never clipped by overflow)
 * - step1-ready (role + verified city + active Next + live preview)
 * - step2-disclaimer (safety callout + Complete CTA)
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/onboarding-qa'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
]

function isDarkLeftover(css) {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!m) return false
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  return (r <= 20 && g <= 20 && b <= 30) || (r <= 24 && g <= 24 && b <= 30)
}

async function probe(page) {
  return page.evaluate(() => {
    const darkNodes = [...document.querySelectorAll('*')].filter((el) => {
      const bg = getComputedStyle(el).backgroundColor
      const alphaM = bg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/i)
      if (alphaM && Number(alphaM[1]) < 0.05) return false
      if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return false
      const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
      if (!m) return false
      const r = Number(m[1])
      const g = Number(m[2])
      const b = Number(m[3])
      return (r <= 14 && g <= 14 && b <= 16) || (r === 20 && g === 20 && b === 24)
    })
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      darkCount: darkNodes.length,
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      textSample: document.body.innerText.slice(0, 400),
      hasAustin: /Austin/i.test(document.body.innerText),
    }
  })
}

async function assertDropdownNotClipped(page) {
  const result = await page.evaluate(() => {
    const list = document.querySelector('[data-testid="onboarding-city-listbox"]')
    if (!list) return { ok: false, reason: 'missing listbox' }
    const lr = list.getBoundingClientRect()
    let el = list.parentElement
    while (el && el !== document.body) {
      const style = getComputedStyle(el)
      const overflowY = style.overflowY
      const overflow = style.overflow
      const clips =
        overflowY === 'hidden' ||
        overflowY === 'clip' ||
        overflow === 'hidden' ||
        overflow === 'clip'
      if (clips) {
        const er = el.getBoundingClientRect()
        if (lr.bottom > er.bottom + 1 || lr.top < er.top - 1) {
          return {
            ok: false,
            reason: `clipped by ${el.className?.toString?.().slice(0, 80) ?? el.tagName}`,
          }
        }
      }
      el = el.parentElement
    }
    return { ok: true, height: lr.height, top: lr.top, bottom: lr.bottom }
  })
  assert.equal(result.ok, true, `dropdown clipped: ${result.reason ?? 'unknown'}`)
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: true })
  console.log(`saved ${path}`)
  return path
}

async function runViewport(browser, vp) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  const prefix = vp.name

  try {
    await page.goto(`${BASE_URL}/onboarding?preview=1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="onboarding-step-1"]')

    let p = await probe(page)
    assert.equal(p.darkCount, 0, `${prefix} step1 dark=${p.darkCount}`)
    assert.equal(p.horizontalOverflow, false, `${prefix} step1 overflow`)
    assert.ok(!isDarkLeftover(p.bodyBg), `${prefix} step1 body ${p.bodyBg}`)
    assert.equal(p.hasAustin, false, `${prefix} step1 must not mention Austin`)
    assert.match(p.textSample, /Welcome to Beam/i)
    assert.match(await page.getByTestId('onboarding-step-1').innerText(), /Popular/i)
    assert.equal(await page.getByTestId('onboarding-next').isDisabled(), true)
    await shot(page, `${prefix}-step1-initial`)

    await page.getByTestId('onboarding-role-customer').click()
    await page.waitForSelector('[data-testid="onboarding-city-input"]')
    await page.getByTestId('onboarding-city-input').click()
    await page.waitForSelector('[data-testid="onboarding-city-listbox"]')
    await assertDropdownNotClipped(page)
    await page.getByTestId('onboarding-city-input').fill('Boise')
    await page.waitForTimeout(200)
    await assertDropdownNotClipped(page)
    p = await probe(page)
    assert.equal(p.darkCount, 0, `${prefix} dropdown dark`)
    assert.equal(p.horizontalOverflow, false, `${prefix} dropdown overflow`)
    await shot(page, `${prefix}-step1-autocomplete-open`)

    await page.getByRole('option', { name: /Boise,\s*ID/i }).first().click()
    await page.waitForSelector('[data-testid="onboarding-city-verified"]')
    assert.equal(await page.getByTestId('onboarding-next').isDisabled(), false)
    p = await probe(page)
    assert.equal(p.darkCount, 0, `${prefix} ready dark`)
    assert.equal(p.horizontalOverflow, false, `${prefix} ready overflow`)
    await shot(page, `${prefix}-step1-ready`)

    await page.getByTestId('onboarding-next').click()
    await page.waitForSelector('[data-testid="onboarding-step-2"]')
    const step2 = await page.getByTestId('onboarding-step-2').innerText()
    assert.match(step2, /Posting illegal content or listing sexual services is strictly prohibited/i)
    assert.match(step2, /temporary ban/i)
    assert.match(step2, /Mandatory marketplace policy/i)
    assert.doesNotMatch(step2, /no extra checkbox/i)
    p = await probe(page)
    assert.equal(p.darkCount, 0, `${prefix} step2 dark`)
    assert.equal(p.horizontalOverflow, false, `${prefix} step2 overflow`)
    await shot(page, `${prefix}-step2-disclaimer`)

    console.log(`ok visual QA ${prefix}`)
  } finally {
    await page.close()
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const vp of VIEWPORTS) {
      await runViewport(browser, vp)
    }
    console.log('onboarding visual QA passed')
    console.log(`artifacts: ${OUT}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
