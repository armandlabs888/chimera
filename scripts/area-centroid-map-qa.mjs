#!/usr/bin/env node
/**
 * Production-like check: job with location_label and null lat/lng still shows the map.
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })

async function seedNullCoordJob(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  const jobId = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    const now = new Date().toISOString()
    state.people = (state.people || []).map((p) =>
      p.id !== me
        ? p
        : {
            ...p,
            accountRole: 'helper',
            isHelper: true,
            skills: p.skills?.length ? p.skills : ['junk-removal'],
            hourlyRate: p.hourlyRate || 35,
            city: 'San Jose',
            stateCode: 'CA',
            locationLabel: 'Cambrian, San Jose, CA',
            lat: 37.255,
            lng: -121.928,
            onboardingCompletedAt: now,
            safetyDisclaimerAcceptedAt: now,
          },
    )
    const ownerId = (state.people || []).find((p) => p.id !== me)?.id || 'p-maya'
    const job = {
      id: 'req-cambrian-null-coords',
      title: 'Carry a dresser up one flight of stairs',
      details:
        'Solid wood dresser from the entry to the upstairs bedroom. Drawers come out. Two people would be ideal.',
      category: 'junk-removal',
      neighborhood: '',
      locationLabel: 'Cambrian, San Jose, CA',
      city: 'San Jose',
      stateCode: 'CA',
      lat: null,
      lng: null,
      when: 'asap',
      whenLabel: 'As soon as possible',
      budget: 60,
      budgetType: 'fixed',
      radiusMiles: 5,
      status: 'open',
      requesterId: ownerId,
      createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
      ],
      image:
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
    }
    state.requests = [job, ...(state.requests || []).filter((r) => r.id !== job.id)]
    localStorage.setItem(key, JSON.stringify(state))
    return job.id
  }, STORAGE_KEY)
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  return jobId
}

async function shot(page, name) {
  const file = join(OUT, name)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`saved ${file}`)
}

async function main() {
  const browser = await chromium.launch()

  // Desktop Browse panel
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const jobId = await seedNullCoordJob(page)
    await page.evaluate(() => {
      const fn = window.__BEAM_SET_DEMO_VERIFICATION__
      if (typeof fn === 'function') fn('approved')
    })
    await page.goto(`${BASE}/browse?demo=1&job=${jobId}&radius=all`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForSelector('[data-testid="browse-job-detail"]', { timeout: 20000 })
    await page.evaluate(() => {
      const scroll = document.querySelector('.browse-hc-detail-scroll')
      if (scroll) scroll.scrollTop = 220
    })
    await page.waitForSelector('[data-testid="job-area-map"]', { timeout: 10000 })
    await page.waitForFunction(() => {
      const img = document.querySelector('[data-testid="job-area-map"] img')
      return img && img.complete && img.naturalWidth > 0
    }, null, { timeout: 15000 })
    const text = await page.locator('[data-testid="browse-job-detail"]').innerText()
    assert.match(text, /Approximate area/i)
    assert.doesNotMatch(text, /HouseCall sample/i)
    await shot(page, 'centroid-fallback-browse-detail-1280x800.png')
    await page.locator('[data-testid="browse-job-detail"]').screenshot({
      path: join(OUT, 'centroid-fallback-browse-detail-panel-1280x800.png'),
    })
    await page.close()
  }

  // Mobile sheet
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const jobId = await seedNullCoordJob(page)
    await page.evaluate(() => {
      const fn = window.__BEAM_SET_DEMO_VERIFICATION__
      if (typeof fn === 'function') fn('approved')
    })
    await page.goto(`${BASE}/browse?demo=1&radius=all`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.locator(`[data-testid="browse-job-row"][data-job-id="${jobId}"]`).click()
    await page.waitForSelector('[data-testid="browse-job-sheet"]', { timeout: 20000 })
    await page.waitForSelector('[data-testid="job-area-map"]', { timeout: 10000 })
    await page.locator('[data-testid="job-area-map"]').scrollIntoViewIfNeeded()
    await page.waitForFunction(() => {
      const img = document.querySelector('[data-testid="job-area-map"] img')
      return img && img.complete && img.naturalWidth > 0
    }, null, { timeout: 15000 })
    const text = await page.locator('[data-testid="browse-job-sheet"]').innerText()
    assert.match(text, /Approximate area/i)
    await shot(page, 'centroid-fallback-mobile-sheet-390x844.png')
    await page.close()
  }

  await browser.close()
  console.log('area-centroid-map-qa PASS')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
