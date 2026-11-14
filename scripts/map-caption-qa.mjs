#!/usr/bin/env node
/**
 * Guest Browse panel: map caption must come from the job, not viewer "you".
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  // Guest-like: clear any prior demo identity location after seed.
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })

  const jobId = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    const now = new Date().toISOString()
    // Simulate guest browse origin: no useful viewer city (cityName -> "you").
    state.people = (state.people || []).map((p) => {
      if (p.id !== me) return p
      return {
        ...p,
        accountRole: 'helper',
        isHelper: true,
        skills: p.skills?.length ? p.skills : ['junk-removal'],
        city: null,
        stateCode: null,
        locationLabel: '',
        lat: null,
        lng: null,
        onboardingCompletedAt: now,
        safetyDisclaimerAcceptedAt: now,
      }
    })
    const ownerId = (state.people || []).find((p) => p.id !== me)?.id || 'p-maya'
    const job = {
      id: 'req-caption-cambrian',
      title: 'Carry a dresser up one flight of stairs',
      details: 'Solid wood dresser from the entry to the upstairs bedroom.',
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
    // Clear guest location preference that could set a real city.
    localStorage.removeItem('beam-browse-location-v1')
    localStorage.setItem(key, JSON.stringify(state))
    return job.id
  }, STORAGE_KEY)

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
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

  const caption = await page.locator('.job-area-map-place').innerText()
  console.log('caption:', caption)
  assert.equal(caption, 'Cambrian, San Jose')
  assert.doesNotMatch(caption, /\byou\b/i)

  const detailText = await page.locator('[data-testid="browse-job-detail"]').innerText()
  assert.doesNotMatch(detailText, /Cambrian,\s*you/i)

  await page.locator('[data-testid="browse-job-detail"]').screenshot({
    path: join(OUT, 'map-caption-browse-panel-1280x800.png'),
  })
  await page.screenshot({
    path: join(OUT, 'map-caption-browse-1280x800.png'),
    fullPage: false,
  })
  console.log('saved map-caption screenshots')

  await browser.close()
  console.log('map-caption-qa PASS')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
