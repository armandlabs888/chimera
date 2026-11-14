#!/usr/bin/env node
/**
 * Public helper profile redesign screenshots + light assertions.
 * Captures:
 *  - desktop 1280x800 viewport (seeded helper with photo + review, neighbor viewer)
 *  - desktop full page
 *  - mobile 390 full page
 *  - /you helper 1280x800 (shared hero unchanged)
 */
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/helper-public-profile'
const STORAGE_KEY = 'beam-demo-v1'
const HELPER_ID = 'p-maya'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name, { fullPage = false } = {}) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log('wrote', join(OUT, name))
}

async function seedNeighborViewer(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, helperId }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id === me) {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
          p.availableNow = false
          p.availability = []
          p.hourlyRate = 0
          p.locationLabel = p.locationLabel || 'East Austin, TX'
        }
        if (p.id === helperId) {
          // Ensure photo + rating/review backing for the public page.
          if (!p.avatar) {
            p.avatar =
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80'
          }
          p.rating = p.rating > 0 ? p.rating : 5
          p.reviewCount = Math.max(p.reviewCount || 0, 1)
          p.jobsCompleted = Math.max(p.jobsCompleted || 0, 1)
          p.availableNow = true
          p.availability = p.availability?.length ? p.availability : ['mornings', 'afternoons']
          p.serviceRadiusMiles = p.serviceRadiusMiles || 5
          p.rateType = 'hourly'
          p.hourlyRate = p.hourlyRate || 40
          p.isHelper = true
        }
      }
      const reviews = state.reviews || []
      const hasReview = reviews.some((r) => r.toId === helperId)
      if (!hasReview) {
        reviews.push({
          id: 'rev-qa-maya',
          requestId: 'req-past-2',
          fromId: 'p-jordan',
          toId: helperId,
          rating: 5,
          comment: 'Clear explanations and on time. Would book again.',
          createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        })
        state.reviews = reviews
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, helperId: HELPER_ID },
  )
}

async function seedHelperYou(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    for (const p of state.people || []) {
      if (p.id !== me) continue
      p.accountRole = 'helper'
      p.isHelper = true
      p.skills = p.skills?.length ? p.skills : ['junk-removal', 'house-cleaning']
      p.hourlyRate = p.hourlyRate || 35
      p.rateType = p.rateType || 'hourly'
      p.serviceRadiusMiles = p.serviceRadiusMiles || 5
      p.availableNow = true
      p.availability = p.availability?.length ? p.availability : ['afternoons', 'evenings']
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function assertPublicProfile(page) {
  await page.getByTestId('public-helper-profile').waitFor({ state: 'visible', timeout: 20000 })
  await page.getByTestId('public-helper-estimator').waitFor({ state: 'visible' })
  await page.getByTestId('public-helper-request-book').waitFor({ state: 'visible' })
  await page.getByTestId('public-helper-save').waitFor({ state: 'visible' })
  await page.getByTestId('public-helper-share').waitFor({ state: 'visible' })
  await page.getByTestId('public-helper-message').waitFor({ state: 'visible' })

  // Same browse-header shell as /you (not the older AppShell topnav).
  await page.getByTestId('browse-hc-header-shell').waitFor({ state: 'visible' })
  const viewport = page.viewportSize()
  const desktop = Boolean(viewport && viewport.width >= 960)
  if (desktop) {
    const navText = await page.locator('.browse-hc-nav').innerText()
    assert.ok(/Browse jobs/i.test(navText), 'public profile should use Browse jobs nav')
    assert.ok(/Saved/i.test(navText), 'public profile should show Saved')
    assert.ok(/My offers/i.test(navText), 'public profile should show My offers')
  } else {
    // Mobile keeps the same shell; primary links live in the hamburger sheet.
    await page.getByRole('button', { name: /menu/i }).first().waitFor({ state: 'visible' })
  }

  const body = await page.getByTestId('public-helper-profile').innerText()
  assert.ok(!/Typically replies within/i.test(body), 'must omit reply-time claim')
  assert.ok(!/\bVerified\b/i.test(body), 'must omit Verified badge copy')
  assert.ok(!/[—–]/.test(body), 'must not use em/en dashes in page copy')

  const photo = page.locator('.php-photo').first()
  await photo.waitFor({ state: 'visible' })
  const fit = await photo.evaluate((el) => getComputedStyle(el).objectFit)
  assert.equal(fit, 'cover')

  // Sync day chip with estimator day select
  const chips = page.locator('.php-day')
  const chipCount = await chips.count()
  assert.equal(chipCount, 6)
  await chips.nth(2).click()
  const selected = await page.getByTestId('public-helper-day-select').inputValue()
  const chipValue = await chips.nth(2).getAttribute('data-testid')
  assert.ok(chipValue?.includes(selected), 'day chip should sync estimator day')

  // Mobile: page padding must clear the fixed bottom tab above Request to book.
  const bookBtn = page.getByTestId('public-helper-request-book')
  const padBottom = await page.locator('.public-helper-profile .php-layout').evaluate((el) => {
    return parseFloat(getComputedStyle(el).paddingBottom || '0')
  })
  if (!desktop) {
    assert.ok(padBottom >= 72, `mobile layout padding-bottom ${padBottom} should clear tab bar`)
  }
  await bookBtn.scrollIntoViewIfNeeded()
  assert.ok(await bookBtn.isVisible(), 'Request to book must remain visible')
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const report = { ok: true, shots: [] }
  try {
    // Neighbor viewing public helper profile — desktop viewport
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedNeighborViewer(page)
      await page.goto(`${BASE}/people/${HELPER_ID}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await assertPublicProfile(page)
      await page.waitForTimeout(250)
      await shot(page, 'helper-public-desk-top.png', { fullPage: false })
      report.shots.push('helper-public-desk-top.png')
      await shot(page, 'helper-public-desk.png', { fullPage: true })
      report.shots.push('helper-public-desk.png')
      await context.close()
    }

    // Mobile full page
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      })
      const page = await context.newPage()
      await seedNeighborViewer(page)
      await page.goto(`${BASE}/people/${HELPER_ID}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await assertPublicProfile(page)
      await page.getByTestId('public-helper-book-hero').waitFor({ state: 'visible' })
      await page.waitForTimeout(250)
      await shot(page, 'helper-public-mob.png', { fullPage: true })
      report.shots.push('helper-public-mob.png')
      await context.close()
    }

    // /you helper unchanged shared hero
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedHelperYou(page)
      await page.goto(`${BASE}/you?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.getByTestId('you-page').waitFor({ state: 'visible', timeout: 20000 })
      await page.getByTestId('helper-profile-hero').waitFor({ state: 'visible' })
      await page.waitForTimeout(250)
      await shot(page, 'you-helper-desk-unchanged.png', { fullPage: false })
      report.shots.push('you-helper-desk-unchanged.png')
      await context.close()
    }

    writeFileSync(join(OUT, 'helper-public-profile-qa.json'), JSON.stringify(report, null, 2))
    writeFileSync(join(LOCAL, 'helper-public-profile-qa.json'), JSON.stringify(report, null, 2))
    console.log('helper-public-profile-qa PASS')
  } catch (err) {
    report.ok = false
    report.error = String(err)
    writeFileSync(join(OUT, 'helper-public-profile-qa.json'), JSON.stringify(report, null, 2))
    throw err
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
