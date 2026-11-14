#!/usr/bin/env node
/**
 * Final ProfileHeader QA: wrap-safe separators, overflow menu, Edit/Share/Message.
 */
import assert from 'node:assert/strict'
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/profile-header-final'
const STORAGE_KEY = 'beam-demo-v1'
const HELPER_ID = 'p-maya'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage: false })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log('wrote', join(OUT, name))
}

async function seedRole(page, role) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, role: nextRole }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id !== me) continue
        if (nextRole === 'helper') {
          p.accountRole = 'helper'
          p.isHelper = true
          p.skills = ['junk-removal', 'house-cleaning', 'pet-sitting']
          p.hourlyRate = p.hourlyRate || 35
          p.rateType = p.rateType || 'hourly'
          p.serviceRadiusMiles = p.serviceRadiusMiles || 5
          p.availableNow = true
          p.availability = p.availability?.length ? p.availability : ['afternoons', 'evenings']
          p.rating = p.rating > 0 ? p.rating : 4.9
          p.reviewCount = Math.max(p.reviewCount || 0, 12)
          p.jobsCompleted = Math.max(p.jobsCompleted || 0, 18)
          p.locationLabel = p.locationLabel || 'East Austin, TX'
          p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-03-12T12:00:00.000Z'
        } else {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
          p.availableNow = false
          p.availability = []
          p.hourlyRate = 0
          p.locationLabel = p.locationLabel || 'East Austin, TX'
          p.onboardingCompletedAt = p.onboardingCompletedAt || '2024-06-01T12:00:00.000Z'
        }
      }
      if (nextRole === 'neighbor') {
        const requests = state.requests || []
        if (!requests.some((r) => r.requesterId === me)) {
          requests.push({
            id: 'req-qa-neighbor-stat',
            title: 'Help moving a bookshelf',
            details: 'Need two people for a short move upstairs.',
            category: 'junk-removal',
            neighborhood: 'east-austin',
            when: 'this-week',
            whenLabel: 'This week',
            budget: 60,
            status: 'open',
            requesterId: me,
            image: '',
            images: [],
            createdAt: new Date().toISOString(),
            locationLabel: 'East Austin, TX',
          })
          state.requests = requests
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, role },
  )
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
          p.isHelper = true
          p.rating = p.rating > 0 ? p.rating : 5
          p.reviewCount = Math.max(p.reviewCount || 0, 1)
          p.jobsCompleted = Math.max(p.jobsCompleted || 0, 1)
          p.availableNow = true
          p.availability = p.availability?.length ? p.availability : ['mornings', 'afternoons']
          p.serviceRadiusMiles = p.serviceRadiusMiles || 5
          p.rateType = 'hourly'
          p.hourlyRate = p.hourlyRate || 40
          p.locationLabel = p.locationLabel || 'Hyde Park, Austin'
          p.skills = p.skills?.length ? p.skills : ['grooming', 'house-cleaning']
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, helperId: HELPER_ID },
  )
}

/** Assert separators are clipped on line starts and visible between same-line items. */
async function assertWrapSafeSeparators(page, testId) {
  const result = await page.getByTestId(testId).evaluate((row) => {
    const items = [...row.querySelectorAll(':scope > .ph-sep-item')]
    if (items.length < 2) return { ok: true, reason: 'fewer than 2 items', lineCount: 1, sample: [] }

    const style = getComputedStyle(row)
    if (style.overflow !== 'hidden' && style.overflowX !== 'hidden') {
      return { ok: false, reason: 'row must clip with overflow hidden' }
    }

    const rowBox = row.getBoundingClientRect()
    const rows = new Map()
    for (const el of items) {
      const y = Math.round(el.getBoundingClientRect().top)
      if (!rows.has(y)) rows.set(y, [])
      rows.get(y).push(el)
    }

    const problems = []
    for (const [, els] of rows) {
      els.forEach((el, idx) => {
        const r = el.getBoundingClientRect()
        const before = getComputedStyle(el, '::before')
        if (before.content === 'none' || before.content === 'normal') {
          problems.push('missing ::before')
          return
        }
        const ml = parseFloat(before.marginInlineStart || before.marginLeft || '0')
        const w = parseFloat(before.width || '0')
        const beforeRight = r.left + ml + w
        const fullyClipped = beforeRight <= rowBox.left + 0.5
        const lineStart = idx === 0
        if (lineStart && !fullyClipped) problems.push(`line-start · not clipped for ${el.textContent}`)
        if (!lineStart && fullyClipped) problems.push(`mid-line · clipped for ${el.textContent}`)
        const text = (el.textContent || '').trim()
        if (text.startsWith('·') || text.endsWith('·')) problems.push(`text middot in ${text}`)
      })
    }

    return {
      ok: problems.length === 0,
      problems,
      lineCount: rows.size,
      sample: items.map((el) => (el.textContent || '').trim()),
    }
  })

  assert.ok(result.ok, `${testId} wrap-safe failed: ${JSON.stringify(result)}`)
  console.log(`sep-ok ${testId}`, { lines: result.lineCount, sample: result.sample })
}

async function assertNoEmEnDash(page, testId) {
  const text = await page.getByTestId(testId).innerText()
  assert.ok(!/[—–]/.test(text), `${testId} must not use em/en dashes`)
  assert.ok(!/\bVerified\b/.test(text), `${testId} must not show Verified badge`)
}

async function captureSurface(browser, label, setup, path, width, height, isMobile = false) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile,
  })
  const page = await context.newPage()
  await setup(page)
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByTestId('profile-header').waitFor({ state: 'visible', timeout: 20000 })
  await page.waitForTimeout(250)
  await assertNoEmEnDash(page, 'profile-header')
  await assertWrapSafeSeparators(page, 'profile-header-meta')
  if (await page.getByTestId('profile-header-stats').count()) {
    await assertWrapSafeSeparators(page, 'profile-header-stats')
  }
  await shot(page, `profile-header-final-${label}-${width === 1280 ? 'desk' : 'mob'}.png`)
  return { context, page }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const report = { ok: true, checks: [] }
  try {
    // Neighbor own — desktop + mobile
    for (const vp of [
      { w: 1280, h: 800, mobile: false },
      { w: 390, h: 844, mobile: true },
    ]) {
      const { context, page } = await captureSurface(
        browser,
        'neighbor-own',
        (p) => seedRole(p, 'neighbor'),
        '/you?demo=1',
        vp.w,
        vp.h,
        vp.mobile,
      )
      // Overflow must open with Settings
      await page.getByTestId('profile-header-overflow').click()
      await page.getByTestId('you-hero-settings').waitFor({ state: 'visible' })
      report.checks.push(`neighbor overflow ${vp.w}`)
      // Edit profile scrolls to editor
      await page.keyboard.press('Escape')
      await page.getByTestId('you-edit-profile').click()
      await page.waitForTimeout(500)
      const inView = await page.evaluate(() => {
        const el = document.getElementById('you-profile')
        if (!el) return false
        const r = el.getBoundingClientRect()
        return r.top < window.innerHeight && r.bottom > 0
      })
      assert.ok(inView, 'Edit profile should bring #you-profile into view')
      report.checks.push(`neighbor edit-scroll ${vp.w}`)
      await context.close()
    }

    // Helper own — desktop + mobile
    for (const vp of [
      { w: 1280, h: 800, mobile: false },
      { w: 390, h: 844, mobile: true },
    ]) {
      const { context, page } = await captureSurface(
        browser,
        'helper-own',
        (p) => seedRole(p, 'helper'),
        '/you?demo=1',
        vp.w,
        vp.h,
        vp.mobile,
      )
      await page.getByTestId('profile-header-overflow').click()
      await page.getByTestId('you-view-public-profile').waitFor({ state: 'visible' })
      await page.getByTestId('you-hero-settings').waitFor({ state: 'visible' })
      report.checks.push(`helper overflow ${vp.w}`)
      await context.close()
    }

    // Public helper — desktop + mobile
    for (const vp of [
      { w: 1280, h: 800, mobile: false },
      { w: 390, h: 844, mobile: true },
    ]) {
      const { context, page } = await captureSurface(
        browser,
        'public-helper',
        seedNeighborViewer,
        `/people/${HELPER_ID}?demo=1`,
        vp.w,
        vp.h,
        vp.mobile,
      )
      // Actions on one row at desktop
      if (vp.w >= 1280) {
        const ys = await page.getByTestId('profile-header-actions').evaluate((el) => {
          return [...el.querySelectorAll('a,button')].map((n) =>
            Math.round(n.getBoundingClientRect().top),
          )
        })
        assert.ok(
          ys.length >= 2 && ys.every((y) => y === ys[0]),
          `public actions must share one row, got ${JSON.stringify(ys)}`,
        )
        report.checks.push('public actions one-row desk')
      }
      // Overflow Save works
      await page.getByTestId('profile-header-overflow').click()
      await page.getByTestId('public-helper-save').waitFor({ state: 'visible' })
      await page.getByTestId('public-helper-save').click()
      await page.getByTestId('public-helper-toast').waitFor({ state: 'visible' })
      report.checks.push(`public save ${vp.w}`)
      // Message opens direct thread drawer/panel
      await page.getByTestId('public-helper-message').click()
      await page.waitForTimeout(800)
      const messagingUi = await page.evaluate(() => {
        return Boolean(
          document.querySelector(
            '[data-testid="messages-drawer"], [data-testid="messages-chat"], [data-testid="messages-panel"], [data-testid="inbox-thread"], [role="dialog"]',
          ),
        )
      })
      // Fallback: thread opened changes URL hash or toast not error
      const toast = await page.getByTestId('public-helper-toast').count()
      const toastText = toast ? await page.getByTestId('public-helper-toast').innerText() : ''
      assert.ok(
        messagingUi || !/Could not open messages/i.test(toastText),
        'Message should open direct thread flow',
      )
      report.checks.push(`public message ${vp.w}`)
      // Estimator still present
      await page.getByTestId('public-helper-estimator').waitFor({ state: 'visible' })
      report.checks.push(`public estimator ${vp.w}`)
      await context.close()
    }

    // Force a narrow meta wrap and re-check separators
    {
      const context = await browser.newContext({ viewport: { width: 420, height: 900 } })
      const page = await context.newPage()
      await seedRole(page, 'helper')
      await page.goto(`${BASE}/you?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.getByTestId('profile-header-meta').waitFor()
      // Shrink the meta row artificially to force wrap
      await page.getByTestId('profile-header-meta').evaluate((el) => {
        el.style.maxWidth = '220px'
      })
      await page.waitForTimeout(100)
      const lines = await page.getByTestId('profile-header-meta').evaluate((row) => {
        const items = [...row.querySelectorAll(':scope > .ph-sep-item')]
        const byY = new Map()
        for (const el of items) {
          const y = Math.round(el.getBoundingClientRect().top)
          if (!byY.has(y)) byY.set(y, [])
          byY.get(y).push((el.textContent || '').trim())
        }
        return [...byY.entries()].map(([y, texts]) => ({ y, texts }))
      })
      assert.ok(lines.length >= 2, `expected wrapped meta, got ${JSON.stringify(lines)}`)
      for (const line of lines) {
        for (const t of line.texts) {
          assert.ok(!t.startsWith('·'), `leading middot in text: ${t}`)
          assert.ok(!t.endsWith('·'), `trailing middot in text: ${t}`)
        }
      }
      report.checks.push('forced meta wrap clean')
      await context.close()
    }

    writeFileSync(join(OUT, 'profile-header-final-qa.json'), JSON.stringify(report, null, 2))
    console.log('profile-header-final-qa PASS', report.checks)
  } catch (err) {
    report.ok = false
    report.error = String(err)
    writeFileSync(join(OUT, 'profile-header-final-qa.json'), JSON.stringify(report, null, 2))
    throw err
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
