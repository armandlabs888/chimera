#!/usr/bin/env node
/**
 * Auth modal fluid-promo QA screenshots + layout assertions.
 * Saves under /opt/cursor/artifacts/
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440x760', width: 1440, height: 760 },
  { name: '1536x800', width: 1536, height: 800 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 },
]

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log('saved', path)
  return path
}

async function waitAuth(page) {
  await page.waitForSelector('[data-testid="auth-modal"]', { timeout: 30000 })
  // Live auth shows "Welcome back"; demo mode shows continue CTA instead.
  await page.waitForFunction(() => {
    const modal = document.querySelector('[data-testid="auth-modal"]')
    const t = modal?.textContent || ''
    return /Welcome back|Continue to Bunk|Join Bunk/i.test(t)
  }, { timeout: 30000 })
}

async function assertLayout(page, label, vp) {
  const metrics = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="auth-modal"]')
    const aside = document.querySelector('[data-testid="auth-aside-panel"]')
    const imgWrap = document.querySelector('.auth-shell-aside-image')
    const img = aside?.querySelector('img')
    if (!card) return null
    const cr = card.getBoundingClientRect()
    const asideStyle = aside ? getComputedStyle(aside) : null
    const ir = imgWrap ? imgWrap.getBoundingClientRect() : null
    return {
      card: { top: cr.top, bottom: cr.bottom, height: cr.height, width: cr.width },
      asideDisplay: asideStyle?.display ?? 'missing',
      asideOverflowY: asideStyle?.overflowY ?? null,
      image: ir
        ? { width: ir.width, height: ir.height, top: ir.top, bottom: ir.bottom }
        : null,
      imgSrc: img ? img.currentSrc || img.getAttribute('src') || '' : '',
      vh: window.innerHeight,
      vw: window.innerWidth,
    }
  })

  assert.ok(metrics, `${label}: modal missing`)
  assert.ok(metrics.card.top >= -1, `${label}: card top clipped ${metrics.card.top}`)
  assert.ok(
    metrics.card.bottom <= metrics.vh + 1,
    `${label}: card bottom ${metrics.card.bottom} > vh ${metrics.vh}`,
  )
  assert.ok(
    metrics.card.height <= metrics.vh + 1,
    `${label}: card taller than viewport`,
  )

  const expectAside = vp.width >= 900 && vp.height >= 600
  if (expectAside) {
    assert.notEqual(metrics.asideDisplay, 'none', `${label}: promo should be visible`)
    assert.ok(metrics.image, `${label}: promo image missing`)
    assert.ok(metrics.image.height >= 120, `${label}: promo image too short ${metrics.image.height}`)
    assert.ok(
      metrics.image.height / metrics.image.width <= 1.05,
      `${label}: promo image unexpectedly tall strip ${metrics.image.width}x${metrics.image.height}`,
    )
    assert.ok(
      metrics.image.height >= metrics.image.width * 0.45,
      `${label}: promo image squeezed too short ${metrics.image.width}x${metrics.image.height}`,
    )
    assert.match(
      decodeURIComponent(metrics.imgSrc),
      /auth-panel-neighbors/,
      `${label}: unexpected photo ${metrics.imgSrc}`,
    )
    assert.ok(
      metrics.asideOverflowY === 'hidden' || metrics.asideOverflowY === 'clip',
      `${label}: aside should not scroll (overflowY=${metrics.asideOverflowY})`,
    )
  } else {
    assert.equal(metrics.asideDisplay, 'none', `${label}: promo should be hidden`)
  }

  console.log(`ok ${label}`, {
    cardH: Math.round(metrics.card.height),
    vh: metrics.vh,
    aside: metrics.asideDisplay,
    img: metrics.image
      ? `${Math.round(metrics.image.width)}x${Math.round(metrics.image.height)}`
      : null,
  })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: 'networkidle', timeout: 90000 })
    await waitAuth(page)
    await page.waitForTimeout(500)
    await assertLayout(page, vp.name, vp)
    await shot(page, `auth_modal_${vp.name}.png`)
  }

  await browser.close()
  console.log('auth-fluid-promo-shots PASS')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
