#!/usr/bin/env node
/**
 * Playwright screenshots for Refer a helper (demo mode).
 * Desktop 1280x800 + mobile 390x844.
 *
 * Run:
 *   NEXT_PUBLIC_BEAM_DEMO_MODE=1 npm run build && npm start
 *   BASE_URL=http://127.0.0.1:43123 node scripts/refer-helper-picker-screenshots.mjs
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { label: '1280x800', width: 1280, height: 800, mobile: false },
  { label: '390x844', width: 390, height: 844, mobile: true },
]

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log('wrote', path)
  return path
}

async function warmDemo(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
}

async function seedNeighbor(page) {
  await warmDemo(page)
  const jobId = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    const now = new Date().toISOString()
    state.people = (state.people || []).map((p) => {
      if (p.id !== me) {
        if (!(p.isHelper || (p.skills || []).length)) {
          p.isHelper = true
          p.skills = p.skills?.length ? p.skills : ['junk-removal']
          p.hourlyRate = p.hourlyRate || 35
        }
        return p
      }
      return {
        ...p,
        accountRole: 'customer',
        isHelper: false,
        skills: [],
        hourlyRate: 0,
        city: 'Austin',
        stateCode: 'TX',
        locationLabel: 'East Austin, TX',
        lat: 30.2672,
        lng: -97.7205,
        onboardingCompletedAt: now,
        safetyDisclaimerAcceptedAt: now,
      }
    })
    // Keep threads with helpers so "People you've worked with" is populated.
    if (!Array.isArray(state.threads)) state.threads = []
    for (const helperId of ['p-maya', 'p-jordan', 'p-devon']) {
      const exists = state.threads.some(
        (t) =>
          Array.isArray(t.participantIds) &&
          t.participantIds.includes(me) &&
          t.participantIds.includes(helperId),
      )
      if (!exists) {
        state.threads.unshift({
          id: `th-refer-${helperId}`,
          requestId: null,
          participantIds: [me, helperId],
          lastMessageAt: now,
        })
      }
    }
    localStorage.setItem(key, JSON.stringify(state))
    const open = (state.requests || []).find(
      (r) => r.status === 'open' && r.requesterId !== me,
    )
    return open?.id || 'req-1'
  }, STORAGE_KEY)
  return jobId
}

async function seedOwner(page) {
  await warmDemo(page)
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    const now = new Date().toISOString()
    state.people = (state.people || []).map((p) => {
      if (p.id !== me) return p
      return {
        ...p,
        accountRole: 'helper',
        isHelper: true,
        skills: p.skills?.length ? p.skills : ['junk-removal'],
        hourlyRate: p.hourlyRate || 35,
        onboardingCompletedAt: now,
        safetyDisclaimerAcceptedAt: now,
      }
    })
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function openPicker(page, jobId, mobile) {
  if (mobile) {
    await page.goto(`${BASE}/requests/${jobId}?demo=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.getByTestId('browse-refer-helper').first().waitFor({ state: 'visible', timeout: 20000 })
    await page.getByTestId('browse-refer-helper').first().click()
  } else {
    await page.goto(`${BASE}/browse?demo=1&job=${jobId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.getByTestId('browse-job-detail').waitFor({ state: 'visible', timeout: 20000 })
    await page.getByTestId('browse-refer-helper').first().waitFor({ state: 'visible', timeout: 20000 })
    await page.getByTestId('browse-refer-helper').first().click()
  }
  await page.getByTestId('refer-helper-picker').waitFor({ state: 'visible', timeout: 15000 })
}

async function captureViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  })
  const page = await context.newPage()
  const written = []

  const jobId = await seedNeighbor(page)
  await openPicker(page, jobId, vp.mobile)
  written.push(await shot(page, `refer-helper-picker-default-${vp.label}.png`))

  // Search + 2 selected
  await page.getByTestId('refer-helper-search').fill('m')
  await page.waitForTimeout(200)
  const rows = page.locator('[data-testid^="refer-helper-row-"]:not([disabled])')
  const count = await rows.count()
  for (let i = 0; i < Math.min(2, count); i++) {
    await rows.nth(i).click()
  }
  await page.getByTestId('refer-helper-note').fill('He fixed my fence, great work')
  await page.waitForTimeout(150)
  written.push(await shot(page, `refer-helper-picker-search-selected-${vp.label}.png`))

  // Success
  await page.getByTestId('refer-helper-send').click()
  await page.getByTestId('refer-helper-success').waitFor({ state: 'visible', timeout: 10000 })
  await page.waitForTimeout(150)
  written.push(await shot(page, `refer-helper-picker-success-${vp.label}.png`))
  await page.getByTestId('refer-helper-success-done').click()

  // Helper inbox referral card
  await seedOwner(page)
  await page.goto(`${BASE}/browse?demo=1&messages=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page.getByTestId('messages-drawer').waitFor({ state: 'visible', timeout: 20000 })
  await page.getByTestId('messages-referral-section').waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(200)
  written.push(await shot(page, `refer-helper-helper-inbox-card-${vp.label}.png`))

  // Owner suggested helpers on /requests/[id]
  await page.goto(`${BASE}/requests/req-you-open?demo=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  const suggested = page.getByTestId('suggested-helpers').first()
  await suggested.waitFor({ state: 'visible', timeout: 20000 })
  await suggested.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  written.push(await shot(page, `refer-helper-owner-suggested-helpers-${vp.label}.png`))

  await context.close()
  return written
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const written = []
  try {
    for (const vp of VIEWPORTS) {
      written.push(...(await captureViewport(browser, vp)))
    }
  } finally {
    await browser.close()
  }
  console.log(JSON.stringify({ count: written.length, written }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
