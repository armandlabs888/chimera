#!/usr/bin/env node
/**
 * Playwright verification: every sign-out entry point clears auth and lands on /auth.
 * Screenshots → /opt/cursor/artifacts/signout-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const EMAIL = process.env.BEAM_TEST_EMAIL ?? 'beam.requester@chimera.test'
const PASSWORD = process.env.BEAM_TEST_PASSWORD ?? 'BeamTest-Pass1!'
const REQUEST_ID = process.env.BEAM_TEST_REQUEST_ID ?? '9867880b-5095-48b2-95a3-8779d449e897'
const ARTIFACT_DIR = '/opt/cursor/artifacts/signout-qa'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

const SIGNOUT_CASES = [
  {
    id: 'requests',
    path: `/requests/${REQUEST_ID}`,
    trigger: 'account-menu',
  },
  {
    id: 'browse',
    path: '/browse',
    trigger: 'account-menu',
  },
  {
    id: 'you',
    path: '/you',
    trigger: 'you-button',
  },
]

mkdirSync(ARTIFACT_DIR, { recursive: true })

async function signIn(page) {
  await page.goto(`${BASE_URL}/auth?mode=signin`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('text=Welcome back', { timeout: 30000 })

  // If already signed in, /auth will bounce — wait briefly then check URL.
  await page.waitForTimeout(800)
  if (!page.url().includes('/auth')) {
    return
  }

  const emailInput = page.locator('input[type="email"], input[name="email"]').first()
  const passwordInput = page.locator('input[type="password"]').first()
  await emailInput.fill(EMAIL)
  await passwordInput.fill(PASSWORD)
  await page.getByRole('button', { name: /^Sign in$/i }).click()

  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 45000 })
}

async function clickAccountSignOut(page) {
  const trigger = page.getByTestId('account-menu-trigger')
  await trigger.waitFor({ state: 'visible', timeout: 15000 })
  await trigger.click()

  const signOut = page.getByTestId('account-sign-out')
  await signOut.waitFor({ state: 'visible', timeout: 10000 })
  await signOut.click()
}

async function clickYouSignOut(page) {
  const btn = page.getByTestId('you-sign-out')
  await btn.waitFor({ state: 'visible', timeout: 15000 })
  await btn.click()
}

async function assertLandedOnAuth(page, { priorPath }) {
  await page.waitForURL((url) => {
    const u = typeof url === 'string' ? new URL(url) : url
    return u.pathname === '/auth' || u.pathname === '/auth/'
  }, { timeout: 30000 })

  const url = new URL(page.url())
  assert.equal(url.pathname.replace(/\/$/, '') || '/', '/auth', `expected /auth, got ${url.pathname}`)
  // Clean auth URL — no next= pointing back at the prior protected/public route.
  assert.equal(url.searchParams.get('next'), null, `auth should not carry next= from ${priorPath}`)

  await page.waitForSelector('text=Welcome back', { timeout: 20000 })
  const body = await page.locator('body').innerText()
  assert.match(body, /Welcome back/i)
  assert.match(body, /Sign in/i)

  // Must not still show signed-out stranded chrome for the prior marketplace page.
  assert.doesNotMatch(body, /Send an offer|Submit offer/i)
  assert.doesNotMatch(url.pathname, /\/requests\/|\/browse|\/you/)

  // Give any bounce a moment — stay on /auth.
  await page.waitForTimeout(1500)
  const after = new URL(page.url())
  assert.equal(
    after.pathname.replace(/\/$/, '') || '/',
    '/auth',
    `bounced away from /auth to ${after.pathname}`,
  )
}

async function runCase(browser, viewport, testCase) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  })
  const page = await context.newPage()
  const label = `${testCase.id}-${viewport.name}`

  try {
    await signIn(page)
    await page.goto(`${BASE_URL}${testCase.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.waitForSelector('body', { timeout: 15000 })

    // Confirm we are in signed-in chrome before logout (topnav or you page).
    if (testCase.trigger === 'account-menu') {
      await page.getByTestId('app-topnav').waitFor({ state: 'visible', timeout: 20000 })
      await clickAccountSignOut(page)
    } else {
      await clickYouSignOut(page)
    }

    await assertLandedOnAuth(page, { priorPath: testCase.path })

    const shotPath = join(ARTIFACT_DIR, `after-signout-${label}.png`)
    await page.screenshot({ path: shotPath, fullPage: true })
    console.log(`ok sign-out ${label} → /auth (${shotPath})`)
  } finally {
    await context.close()
  }
}

async function checkSignOutRouteRedirect() {
  const res = await fetch(`${BASE_URL}/auth/signout`, { redirect: 'manual' })
  assert.ok([302, 303, 307, 308].includes(res.status), `signout status ${res.status}`)
  const loc = res.headers.get('location') || ''
  assert.match(loc, /\/auth\/?$/, `signout Location must be /auth, got ${loc}`)
  assert.doesNotMatch(loc, /next=/, `signout must not preserve next=: ${loc}`)
  console.log('ok /auth/signout → /auth redirect')
}

async function main() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.error('playwright not installed')
    process.exit(1)
  }

  await checkSignOutRouteRedirect()

  // Probe whether live auth is available
  const probe = await fetch(`${BASE_URL}/auth?mode=signin`, { headers: { Accept: 'text/html' } })
  const probeText = await probe.text()
  if (/demo mode|needs configuration/i.test(probeText)) {
    console.log('skip signed-in sign-out browser cases (demo / unconfigured)')
    return
  }

  const browser = await chromium.launch({ headless: true })
  try {
    for (const viewport of VIEWPORTS) {
      for (const testCase of SIGNOUT_CASES) {
        await runCase(browser, viewport, testCase)
      }
    }
  } finally {
    await browser.close()
  }

  console.log('signout-qa passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
