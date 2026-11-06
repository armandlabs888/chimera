#!/usr/bin/env node
/**
 * Playwright visual QA for /onboarding across desktop / tablet / mobile.
 * Saves screenshots to /opt/cursor/artifacts/onboarding-clean-qa/ and prints probes.
 *
 * Covers:
 * - step1-empty (clean single-column, no aside/email/sign-out/Popular chips)
 * - step1-autocomplete-open (dropdown never clipped by overflow)
 * - step1-filled (role + city + active Continue)
 * - step2-commitment (safety callout + Agree and continue CTA)
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/onboarding-clean-qa'
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
      const alphaM = bg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/i)
      if (alphaM && Number(alphaM[1]) < 0.05) return false
      if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return false
      const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
      if (!m) return false
      const r = Number(m[1])
      const g = Number(m[2])
      const b = Number(m[3])
      return (r <= 14 && g <= 14 && b <= 16) || (r === 20 && g === 20 && b === 24)
    })
    const bodyText = document.body.innerText
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      darkCount: darkNodes.length,
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      textSample: bodyText.slice(0, 500),
      hasAustin: /Austin/i.test(bodyText),
      hasSignOut: /Sign out/i.test(bodyText),
      hasEmailLike: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(bodyText),
      hasPopular: /\bPopular\b/i.test(bodyText),
      hasVerifiedBadge: /\bVerified\b/i.test(bodyText),
      hasPreviewMode: /Preview mode/i.test(bodyText),
      asideCount: document.querySelectorAll('aside').length,
      imgCount: document.querySelectorAll('img').length,
      signOutTestIdCount: document.querySelectorAll('[data-testid="onboarding-sign-out"]').length,
    }
  })
}

async function assertCleanChrome(page, label) {
  const p = await probe(page)
  assert.equal(p.darkCount, 0, `${label} dark=${p.darkCount}`)
  assert.equal(p.horizontalOverflow, false, `${label} overflow`)
  assert.ok(!isDarkLeftover(p.bodyBg), `${label} body ${p.bodyBg}`)
  assert.equal(p.hasAustin, false, `${label} must not mention Austin`)
  assert.equal(p.hasSignOut, false, `${label} must not show Sign out`)
  assert.equal(p.hasEmailLike, false, `${label} must not show email`)
  assert.equal(p.hasPopular, false, `${label} must not show Popular chips`)
  assert.equal(p.hasVerifiedBadge, false, `${label} must not show Verified badge`)
  assert.equal(p.hasPreviewMode, false, `${label} must not show Preview mode`)
  assert.equal(p.asideCount, 0, `${label} must have zero <aside>`)
  assert.equal(p.imgCount, 0, `${label} must have zero <img> stock photos`)
  assert.equal(p.signOutTestIdCount, 0, `${label} must not render onboarding-sign-out`)
  return p
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

    let p = await assertCleanChrome(page, `${prefix} step1-empty`)
    assert.match(p.textSample, /Welcome to Beam/i)
    assert.doesNotMatch(await page.getByTestId('onboarding-step-1').innerText(), /Popular/i)
    assert.equal(await page.getByTestId('onboarding-next').isDisabled(), true)
    await shot(page, `${prefix}-step1-empty`)

    await page.getByTestId('onboarding-role-customer').click()
    await page.waitForSelector('[data-testid="onboarding-city-input"]')
    await page.getByTestId('onboarding-city-input').click()
    await page.waitForSelector('[data-testid="onboarding-city-listbox"]')
    await assertDropdownNotClipped(page)
    await page.getByTestId('onboarding-city-input').fill('San Jose')
    await page.waitForTimeout(200)
    await assertDropdownNotClipped(page)
    await assertCleanChrome(page, `${prefix} dropdown`)
    await shot(page, `${prefix}-step1-autocomplete-open`)

    await page.getByRole('option', { name: /San Jose,\s*CA/i }).first().click()
    await page.waitForSelector('[data-testid="onboarding-city-verified"]')
    const verifiedText = await page.getByTestId('onboarding-city-verified').innerText()
    assert.match(verifiedText, /San Jose,\s*CA/i)
    assert.doesNotMatch(verifiedText, /Verified/i)
    assert.equal(await page.getByTestId('onboarding-next').isDisabled(), false)
    // Let enabled CTA styles settle (avoid mid-transition muted blue in screenshots).
    await page.waitForTimeout(250)
    const nextStyles = await page.getByTestId('onboarding-next').evaluate((btn) => {
      const s = getComputedStyle(btn)
      return { bg: s.backgroundColor, color: s.color, opacity: s.opacity, disabled: btn.disabled }
    })
    assert.equal(nextStyles.disabled, false, `${prefix} next still disabled`)
    assert.equal(
      nextStyles.bg,
      'rgb(29, 92, 229)',
      `${prefix} next bg expected royal #1D5CE5, got ${nextStyles.bg}`,
    )
    assert.equal(nextStyles.opacity, '1', `${prefix} next opacity=${nextStyles.opacity}`)
    assert.equal(
      nextStyles.color,
      'rgb(255, 255, 255)',
      `${prefix} next text expected white, got ${nextStyles.color}`,
    )
    await assertCleanChrome(page, `${prefix} step1-filled`)
    await shot(page, `${prefix}-step1-filled`)

    await page.getByTestId('onboarding-next').click()
    await page.waitForSelector('[data-testid="onboarding-step-2"]')
    const step2 = await page.getByTestId('onboarding-step-2').innerText()
    assert.match(step2, /Posting illegal content or listing sexual services is strictly prohibited/i)
    assert.match(step2, /accounts are suspended/i)
    assert.doesNotMatch(step2, /Mandatory marketplace policy/i)
    assert.doesNotMatch(step2, /Helper \/ Tasker ·/i)
    assert.match(step2, /Agree and continue/i)
    assert.doesNotMatch(step2, /no extra checkbox/i)
    await assertCleanChrome(page, `${prefix} step2`)
    await shot(page, `${prefix}-step2-commitment`)

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
