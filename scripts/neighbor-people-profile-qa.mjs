#!/usr/bin/env node
/**
 * Neighbor /people/[id] profile + job poster-row meta QA.
 * Captures 1440 and 390 screenshots; asserts no helper-only sections and posts meta.
 */
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/neighbor-people-profile'
const STORAGE_KEY = 'beam-demo-v1'
const NEIGHBOR_ID = 'p-sam'
const JOB_ID = 'req-1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name, { fullPage = false } = {}) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log('wrote', join(OUT, name))
}

async function seedNeighborPoster(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, neighborId }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      for (const p of state.people || []) {
        if (p.id !== neighborId) continue
        p.accountRole = 'customer'
        p.isHelper = false
        p.skills = []
        p.availableNow = false
        p.availability = []
        p.hourlyRate = 0
        p.jobsCompleted = 0
        p.rating = 0
        p.reviewCount = 0
        p.bio = 'Neighbor posting jobs around South Congress.'
        p.createdAt = p.createdAt || new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
      }
      // Viewer is a helper looking at a neighbor poster.
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id !== me) continue
        p.accountRole = 'helper'
        p.isHelper = true
        p.skills = p.skills?.length ? p.skills : ['junk-removal']
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, neighborId: NEIGHBOR_ID },
  )
}

async function seedOwnNeighbor(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    for (const p of state.people || []) {
      if (p.id !== me) continue
      p.accountRole = 'customer'
      p.isHelper = false
      p.skills = []
      p.availableNow = false
      p.availability = []
      p.hourlyRate = 0
      p.jobsCompleted = 0
      p.rating = 0
      p.reviewCount = 0
      p.name = 'Yo Soy'
      p.city = 'San Jose'
      p.stateCode = 'CA'
      p.locationLabel = 'San Jose, CA'
      p.createdAt = p.createdAt || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

function assertNoEmEnDash(text) {
  assert.ok(!/[—–]/.test(text), 'must not use em/en dashes in copy')
}

async function assertNeighborProfile(page, { own = false } = {}) {
  const root = page.getByTestId(own ? 'you-page' : 'public-neighbor-profile')
  await root.waitFor({ state: 'visible', timeout: 20000 })
  await page.getByTestId('profile-header').waitFor({ state: 'visible' })

  const body = await root.innerText()
  assertNoEmEnDash(body)
  assert.ok(!/Ask for an offer/i.test(body), 'must omit Ask for an offer')
  assert.ok(!/Past work/i.test(body), 'must omit Past work')
  assert.ok(!/\bVerified\b/i.test(body), 'must omit verification badge')
  assert.ok(!/Request to book/i.test(body), 'must omit Request to book')
  assert.ok(!/Hourly rate/i.test(body), 'must omit hourly rate')
  assert.ok(!/Services/i.test(body) || own, 'public neighbor must omit Services')
  assert.ok(/Joined /i.test(body) || /Neighbor/i.test(body), 'should show joined or neighbor role')
  assert.ok(/\bNew\b/i.test(body) || /★|reviews/i.test(body), 'should show New or rating')

  // Helper-only estimator / rate rail must be absent.
  assert.equal(await page.getByTestId('public-helper-estimator').count(), 0)
  assert.equal(await page.getByTestId('helper-rate-panel').count(), 0)
  assert.equal(await page.getByTestId('helper-services').count(), 0)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const report = { ok: true, shots: [] }
  try {
    // Job poster row: neighbor shows posts, not jobs
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedNeighborPoster(page)
      await page.goto(`${BASE}/requests/${JOB_ID}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.getByText('View profile').first().waitFor({ state: 'visible', timeout: 20000 })
      const poster = page.locator('a[href*="/people/"]').filter({ hasText: 'View profile' }).first()
      await poster.waitFor({ state: 'visible' })
      const meta = await poster.locator('xpath=preceding-sibling::div[1]').innerText()
      assert.ok(!/\b0 jobs\b/i.test(meta), 'neighbor poster row must not show 0 jobs')
      assert.ok(/\d+\s+posts?\b/i.test(meta) || !/\bjobs\b/i.test(meta), 'neighbor should show posts or omit count')
      assertNoEmEnDash(meta)
      await shot(page, 'neighbor-poster-row-1440.png', { fullPage: false })
      report.shots.push('neighbor-poster-row-1440.png')

      await poster.click()
      await page.waitForURL(/\/people\//, { timeout: 20000 })
      await assertNeighborProfile(page)
      await page.waitForTimeout(250)
      await shot(page, 'neighbor-profile-1440.png', { fullPage: true })
      report.shots.push('neighbor-profile-1440.png')
      await context.close()
    }

    // Mobile neighbor profile
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      })
      const page = await context.newPage()
      await seedNeighborPoster(page)
      await page.goto(`${BASE}/people/${NEIGHBOR_ID}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await assertNeighborProfile(page)
      await page.waitForTimeout(250)
      await shot(page, 'neighbor-profile-390.png', { fullPage: true })
      report.shots.push('neighbor-profile-390.png')
      await context.close()
    }

    // Own neighbor profile via /people/{id}
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedOwnNeighbor(page)
      await page.goto(`${BASE}/people/user-you?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await assertNeighborProfile(page, { own: true })
      await page.getByTestId('you-preview-bar').waitFor({ state: 'visible' })
      await page.waitForTimeout(250)
      await shot(page, 'neighbor-own-profile-1440.png', { fullPage: true })
      report.shots.push('neighbor-own-profile-1440.png')
      await context.close()
    }

    // Missing id still soft-not-found in demo
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.goto(`${BASE}/people/does-not-exist?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.getByTestId('public-helper-not-found').waitFor({ state: 'visible', timeout: 20000 })
      await context.close()
    }

    writeFileSync(join(OUT, 'neighbor-people-profile-qa.json'), JSON.stringify(report, null, 2))
    writeFileSync(join(LOCAL, 'neighbor-people-profile-qa.json'), JSON.stringify(report, null, 2))
    console.log('neighbor-people-profile-qa PASS')
  } catch (err) {
    report.ok = false
    report.error = String(err)
    writeFileSync(join(OUT, 'neighbor-people-profile-qa.json'), JSON.stringify(report, null, 2))
    throw err
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
