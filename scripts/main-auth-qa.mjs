#!/usr/bin/env node
/**
 * Playwright: HouseCall has ONE auth experience. The main split-screen /auth page.
 * Verifies sign-out + protected-route redirects never show the removed AuthGate
 * compact chrome (Browse/Safety top bar). Screenshots → /opt/cursor/artifacts/main-auth-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const EMAIL = process.env.BEAM_TEST_EMAIL ?? 'beam.requester@chimera.test'
const PASSWORD = process.env.BEAM_TEST_PASSWORD ?? 'BeamTest-Pass1!'
const REQUEST_ID = process.env.BEAM_TEST_REQUEST_ID ?? '9867880b-5095-48b2-95a3-8779d449e897'
const ARTIFACT_DIR = '/opt/cursor/artifacts/main-auth-qa'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

const SIGNOUT_FROM = [
  { id: 'you', path: '/you', trigger: 'you-button' },
  { id: 'home', path: '/home', trigger: 'account-menu' },
  { id: 'browse', path: '/browse', trigger: 'account-menu' },
  { id: 'requests', path: `/requests/${REQUEST_ID}`, trigger: 'account-menu' },
]

const GUEST_PROTECTED = ['/post', '/home', '/you', '/messages']

mkdirSync(ARTIFACT_DIR, { recursive: true })

async function assertMainAuthExperience(page, { viewport, expectNext = null, clean = false } = {}) {
  await page.waitForSelector('text=Welcome back', { timeout: 20000 })
  const url = new URL(page.url())
  assert.equal(url.pathname.replace(/\/$/, '') || '/', '/auth', `expected /auth, got ${url.pathname}`)

  if (clean) {
    assert.equal(url.searchParams.get('next'), null, `clean /auth must not carry next=: ${url.href}`)
  }
  if (expectNext) {
    assert.equal(url.searchParams.get('next'), expectNext, `expected next=${expectNext}, got ${url.href}`)
  }

  const body = await page.locator('body').innerText()
  assert.match(body, /Welcome back/i)
  assert.match(body, /Continue with Google/i)
  assert.match(body, /Sign in/i)

  // Removed AuthGate compact chrome: white top bar with Browse + Safety.
  const gateHeader = await page.evaluate(() =>
    [...document.querySelectorAll('header')].some((h) => {
      const t = h.innerText || ''
      return /Browse/i.test(t) && /Safety/i.test(t)
    }),
  )
  assert.equal(gateHeader, false, 'must NOT show AuthGate Browse/Safety header')

  // Desktop: split-screen left photo aside must be visible (no fake testimonials).
  if (viewport.width >= 1024) {
    const aside = page.locator('[data-testid="auth-aside-panel"]')
    await aside.waitFor({ state: 'visible', timeout: 10000 })
    const asideBox = await aside.boundingBox()
    assert.ok(asideBox && asideBox.width > 200, 'desktop aside showcase too narrow/missing')
    const asideText = await aside.innerText()
    assert.match(asideText, /Trusted help,\s*right next door/i)
    assert.match(asideText, /Post a task, compare offers from people nearby/i)
    assert.doesNotMatch(asideText, /Elena R\.|two neighbors showed up/i)
    const img = aside.locator('img').first()
    await img.waitFor({ state: 'visible', timeout: 10000 })
    const src = await img.getAttribute('src')
    assert.match(src || '', /auth-panel-neighbors/, `expected auth-panel photo, got ${src}`)
  }
}

async function signIn(page) {
  await page.goto(`${BASE_URL}/auth?mode=signin`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('text=Welcome back', { timeout: 30000 })
  await page.waitForTimeout(800)
  if (!page.url().includes('/auth')) return

  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL)
  await page.locator('input[type="password"]').first().fill(PASSWORD)
  await page.getByRole('button', { name: /^Sign in$/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 45000 })
}

async function clickAccountSignOut(page) {
  await page.getByTestId('account-menu-trigger').waitFor({ state: 'visible', timeout: 15000 })
  await page.getByTestId('account-menu-trigger').click()
  await page.getByTestId('account-sign-out').waitFor({ state: 'visible', timeout: 10000 })
  await page.getByTestId('account-sign-out').click()
}

async function clickYouSignOut(page) {
  await page.getByTestId('you-sign-out').waitFor({ state: 'visible', timeout: 15000 })
  await page.getByTestId('you-sign-out').click()
}

async function runSignOutCase(browser, viewport, testCase) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  })
  const page = await context.newPage()
  const label = `signout-${testCase.id}-${viewport.name}`

  try {
    await signIn(page)
    await page.goto(`${BASE_URL}${testCase.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.waitForSelector('body', { timeout: 15000 })

    if (testCase.trigger === 'account-menu') {
      await page.getByTestId('app-topnav').waitFor({ state: 'visible', timeout: 20000 })
      await clickAccountSignOut(page)
    } else {
      await clickYouSignOut(page)
    }

    await page.waitForURL((url) => {
      const u = typeof url === 'string' ? new URL(url) : url
      return u.pathname === '/auth' || u.pathname === '/auth/'
    }, { timeout: 30000 })

    await assertMainAuthExperience(page, { viewport, clean: true })
    // Stay on /auth — no bounce back to prior route.
    await page.waitForTimeout(1200)
    const after = new URL(page.url())
    assert.equal(after.pathname.replace(/\/$/, '') || '/', '/auth')
    assert.equal(after.searchParams.get('next'), null)

    const shotPath = join(ARTIFACT_DIR, `${label}.png`)
    await page.screenshot({ path: shotPath, fullPage: true })
    console.log(`ok ${label} → main /auth (${shotPath})`)
  } finally {
    await context.close()
  }
}

async function runGuestProtectedCase(browser, viewport, pathName) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  })
  const page = await context.newPage()
  const slug = pathName.replace(/\W+/g, '-').replace(/^-|-$/g, '')
  const label = `guest-${slug}-${viewport.name}`

  try {
    await page.goto(`${BASE_URL}${pathName}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.waitForURL((url) => {
      const u = typeof url === 'string' ? new URL(url) : url
      return u.pathname === '/auth' || u.pathname === '/auth/'
    }, { timeout: 30000 })

    await assertMainAuthExperience(page, {
      viewport,
      expectNext: pathName,
    })

    const shotPath = join(ARTIFACT_DIR, `${label}.png`)
    await page.screenshot({ path: shotPath, fullPage: true })
    console.log(`ok ${label} → /auth?next= (${shotPath})`)
  } finally {
    await context.close()
  }
}

async function main() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.error('playwright not installed')
    process.exit(1)
  }

  const probe = await fetch(`${BASE_URL}/auth?mode=signin`, { headers: { Accept: 'text/html' } })
  const probeText = await probe.text()
  const postProbe = await fetch(`${BASE_URL}/post`, { redirect: 'manual' })
  const postRedirectsToAuth =
    [302, 303, 307, 308].includes(postProbe.status) &&
    /\/auth/i.test(postProbe.headers.get('location') || '')
  // Auth copy is often client-rendered; require a live guest redirect probe too.
  if (/demo mode|needs configuration/i.test(probeText) || !postRedirectsToAuth) {
    console.log('skip main-auth-qa (demo / unconfigured — need live mode)')
    return
  }

  const browser = await chromium.launch({ headless: true })
  try {
    for (const viewport of VIEWPORTS) {
      for (const testCase of SIGNOUT_FROM) {
        await runSignOutCase(browser, viewport, testCase)
      }
      for (const pathName of GUEST_PROTECTED) {
        await runGuestProtectedCase(browser, viewport, pathName)
      }
    }
  } finally {
    await browser.close()
  }

  console.log('main-auth-qa passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
