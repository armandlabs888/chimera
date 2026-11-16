#!/usr/bin/env node
/**
 * Auth password-reset + short-viewport QA screenshots.
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
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
  { name: '375x667', width: 375, height: 667 },
  { name: '360x740', width: 360, height: 740 },
]

/** Viewports the user asked to keep as artifacts (plus original 1440/390). */
const ARTIFACT_VIEWS = new Set(['1440x900', '1280x720', '768x1024', '390x844', '375x667'])

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log('saved', path)
  return path
}

async function waitAuth(page) {
  await page.waitForSelector('[data-testid="auth-modal"]', { timeout: 20000 })
  await page.waitForSelector('text=Welcome back', { timeout: 20000 })
}

async function assertModalFits(page, label) {
  const metrics = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="auth-modal"], [data-testid="reset-password-modal"]')
    const overlay = document.querySelector(
      '[data-testid="auth-modal-overlay"], [data-testid="reset-password-modal-overlay"]',
    )
    if (!card || !overlay) return null
    const cr = card.getBoundingClientRect()
    const or = overlay.getBoundingClientRect()
    const mark = document.querySelector('[aria-label="Bunk home"]')
    const mr = mark ? mark.getBoundingClientRect() : null
    return {
      card: { top: cr.top, bottom: cr.bottom, height: cr.height, width: cr.width },
      overlay: { height: or.height, width: or.width },
      wordmark: mr ? { width: mr.width, left: mr.left } : null,
      formWidth: card.querySelector('.auth-shell-form')?.getBoundingClientRect().width ?? null,
      asideDisplay: getComputedStyle(
        card.querySelector('[data-testid="auth-aside-panel"]') || document.body,
      ).display,
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
    `${label}: card taller than viewport ${metrics.card.height} > ${metrics.vh}`,
  )
  if (metrics.wordmark && metrics.formWidth) {
    assert.ok(
      metrics.wordmark.width < metrics.formWidth * 0.6,
      `${label}: wordmark too wide ${metrics.wordmark.width} vs form ${metrics.formWidth}`,
    )
  }
  if (metrics.vw < 900 || metrics.vh <= 740) {
    assert.equal(
      metrics.asideDisplay,
      'none',
      `${label}: aside should hide under 900px wide or 740px tall`,
    )
  }
  if (metrics.vw >= 900 && metrics.vh > 820) {
    assert.notEqual(metrics.asideDisplay, 'none', `${label}: aside should show on tall desktop`)
  }
  console.log(`ok fit ${label}`, {
    cardH: Math.round(metrics.card.height),
    vh: metrics.vh,
    aside: metrics.asideDisplay,
    markW: metrics.wordmark ? Math.round(metrics.wordmark.width) : null,
  })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: 'networkidle', timeout: 60000 })
    await waitAuth(page)
    await page.waitForTimeout(400)
    await assertModalFits(page, `${vp.name} signin`)

    // Prefill email so forgot view shows prefilled value.
    await page.locator('input[type="email"]').fill('neighbor@example.com')

    if (ARTIFACT_VIEWS.has(vp.name)) {
      await shot(page, `auth_signin_forgot_legal_${vp.name}.png`)
    }

    // Create account tab
    await page.getByRole('tab', { name: 'Create account' }).click()
    await page.waitForSelector('text=Join Bunk', { timeout: 10000 })
    await page.waitForTimeout(200)
    if (ARTIFACT_VIEWS.has(vp.name) && ['1280x720', '768x1024', '375x667', '1440x900', '390x844'].includes(vp.name)) {
      await shot(page, `auth_signup_${vp.name}.png`)
    }

    // Back to sign in + forgot
    await page.getByRole('tab', { name: 'Sign in' }).click()
    await page.getByTestId('auth-forgot-password').click()
    await page.waitForSelector('text=Reset your password', { timeout: 10000 })
    await page.waitForTimeout(200)
    const emailVal = await page.locator('[data-testid="auth-forgot-form"] input[type="email"]').inputValue()
    assert.equal(emailVal, 'neighbor@example.com', 'forgot prefills email')

    if (ARTIFACT_VIEWS.has(vp.name)) {
      await shot(page, `auth_reset_request_${vp.name}.png`)
    }

    // Send reset (neutral success even if account missing)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await page.waitForSelector('[data-testid="auth-reset-sent"]', { timeout: 20000 })
    const sent = await page.getByTestId('auth-reset-sent').innerText()
    assert.match(sent, /If an account exists for that email/i)
    if (ARTIFACT_VIEWS.has(vp.name)) {
      await shot(page, `auth_reset_sent_${vp.name}.png`)
    }

    // Set new password page (preview)
    await page.goto(`${BASE}/auth/reset-password?preview=1`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForSelector('[data-testid="reset-password-form"]', { timeout: 20000 })
    await page.waitForTimeout(300)
    await assertModalFits(page, `${vp.name} set-password`)
    if (ARTIFACT_VIEWS.has(vp.name)) {
      await shot(page, `auth_set_new_password_${vp.name}.png`)
    }

    // Legal copy present on sign-in
    await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: 'networkidle', timeout: 60000 })
    await waitAuth(page)
    const body = await page.locator('[data-testid="auth-modal"]').innerText()
    assert.match(body, /Terms of Service/)
    assert.match(body, /Privacy Policy/)
    assert.match(body, /Forgot password/)
  }

  // Spot-check terms/privacy routes exist
  for (const path of ['/terms', '/privacy']) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    assert.ok(res && res.ok(), `${path} should load`)
  }

  await browser.close()
  console.log('auth-password-reset-shots PASS')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
