#!/usr/bin/env node
/**
 * Playwright visual QA for /onboarding across desktop / tablet / mobile.
 * Saves screenshots to /opt/cursor/artifacts/onboarding-qa/ and prints probes.
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
    }
  })
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
    await shot(page, `${prefix}-step1-initial`)

    await page.getByTestId('onboarding-role-customer').click()
    await page.waitForSelector('[data-testid="onboarding-city-input"]')
    await page.getByTestId('onboarding-city-input').click()
    await page.waitForSelector('[data-testid="onboarding-city-listbox"]')
    await page.getByTestId('onboarding-city-input').fill('Boise')
    await page.waitForTimeout(200)
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
