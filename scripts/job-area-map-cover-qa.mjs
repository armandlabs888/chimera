#!/usr/bin/env node
/**
 * Assert JobAreaMap tile mosaic covers the full frame at key widths.
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'
const WIDTHS = [390, 500, 640, 1440]

mkdirSync(OUT, { recursive: true })

async function seed(page) {
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
            accountRole: 'customer',
            isHelper: false,
            skills: [],
            lat: 37.255,
            lng: -121.928,
            locationLabel: 'Cambrian, San Jose',
            city: 'San Jose',
            stateCode: 'CA',
            onboardingCompletedAt: now,
            safetyDisclaimerAcceptedAt: now,
          },
    )
    const ownerId = (state.people || []).find((p) => p.id !== me)?.id || 'p-maya'
    const job = {
      id: 'req-dresser-spacing-qa',
      title: 'Carry a dresser up one flight of stairs',
      details:
        'Solid wood dresser from the entry to the upstairs bedroom. Drawers come out. Two people would be ideal.\n\n[HouseCall sample, Nov 12, 2026]',
      category: 'junk-removal',
      neighborhood: 'east-austin',
      locationLabel: 'Cambrian, San Jose',
      city: 'San Jose',
      stateCode: 'CA',
      lat: 37.2552,
      lng: -121.9284,
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

async function measureMap(page) {
  await page.waitForSelector('[data-testid="job-area-map"]', { timeout: 20000 })
  await page.locator('[data-testid="job-area-map"]').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-testid="job-area-map"] img')
    return img && img.complete && img.naturalWidth > 0
  }, null, { timeout: 15000 })
  await page.waitForTimeout(200)
  return page.evaluate(() => {
    const map = document.querySelector('[data-testid="job-area-map"]')
    const frame = map?.querySelector('.job-area-map-frame')
    const mosaic = map?.querySelector('.job-area-map-mosaic')
    const circle = map?.querySelector('.job-area-map-circle')
    const star = map?.querySelector('.job-area-map-star svg')
    if (!frame || !mosaic) return { error: 'missing' }
    const fr = frame.getBoundingClientRect()
    const mr = mosaic.getBoundingClientRect()
    const cr = circle?.getBoundingClientRect()
    return {
      frameW: Math.round(fr.width),
      frameH: Math.round(fr.height),
      mosaicW: Math.round(mr.width),
      mosaicH: Math.round(mr.height),
      leftPad: Math.round(fr.left - mr.left),
      rightPad: Math.round(mr.right - fr.right),
      topPad: Math.round(fr.top - mr.top),
      bottomPad: Math.round(mr.bottom - fr.bottom),
      tileCount: mosaic.querySelectorAll('img').length,
      starSize: star ? Math.round(star.getBoundingClientRect().width) : 0,
      circleInside:
        !cr ||
        (cr.left >= fr.left - 1 &&
          cr.right <= fr.right + 1 &&
          cr.top >= fr.top - 1 &&
          cr.bottom <= fr.bottom + 1),
    }
  })
}

async function blankLeftRatio(page) {
  const png = await page.locator('[data-testid="job-area-map"] .job-area-map-frame').screenshot()
  const { default: sharp } = await import('sharp')
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const x = Math.min(4, info.width - 1)
  const y0 = Math.floor(info.height * 0.35)
  const y1 = Math.floor(info.height * 0.65)
  let blank = 0
  let samples = 0
  for (let y = y0; y < y1; y += 2) {
    const i = (y * info.width + x) * info.channels
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    samples += 1
    // Near-white or the frame fallback #e8eef5.
    if (r > 240 && g > 240 && b > 240) blank += 1
    else if (r >= 228 && r <= 236 && g >= 234 && g <= 242 && b >= 240 && b <= 248) blank += 1
  }
  return samples ? blank / samples : 0
}

async function main() {
  const browser = await chromium.launch()
  const report = []

  for (const width of WIDTHS) {
    const page = await browser.newPage({
      viewport: { width, height: width <= 500 ? 844 : 900 },
    })
    const jobId = await seed(page)

    if (width <= 500) {
      // Mobile sheet / narrow browse panel widths.
      await page.goto(`${BASE}/browse?demo=1&radius=all`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      if (width <= 390) {
        await page.locator(`[data-testid="browse-job-row"][data-job-id="${jobId}"]`).click()
        await page.waitForSelector('[data-testid="browse-job-sheet"]', { timeout: 20000 })
      } else {
        // Force map into a 500px column by opening request page with constrained body.
        await page.goto(`${BASE}/requests/${jobId}?demo=1`, {
          waitUntil: 'networkidle',
          timeout: 60000,
        })
        await page.addStyleTag({
          content: `[data-testid="request-detail-left"]{max-width:500px !important;width:500px !important;}`,
        })
      }
    } else {
      await page.goto(`${BASE}/requests/${jobId}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      if (width === 640) {
        await page.addStyleTag({
          content: `[data-testid="request-detail-left"]{max-width:640px !important;width:640px !important;}`,
        })
      }
    }

    const m = await measureMap(page)
    const blankLeft = await blankLeftRatio(page)
    console.log(width, { ...m, blankLeft })
    assert.ok(!m.error, `map missing @${width}`)
    assert.ok(m.leftPad >= 0, `left gap @${width}: ${m.leftPad}`)
    assert.ok(m.rightPad >= 0, `right gap @${width}: ${m.rightPad}`)
    assert.ok(m.topPad >= 0, `top gap @${width}: ${m.topPad}`)
    assert.ok(m.bottomPad >= 0, `bottom gap @${width}: ${m.bottomPad}`)
    assert.ok(m.circleInside, `circle clipped @${width}`)
    assert.ok(m.starSize >= 22 && m.starSize <= 28, `star size @${width}: ${m.starSize}`)
    assert.ok(blankLeft < 0.2, `blank left strip @${width}: ${blankLeft}`)
    await page.locator('[data-testid="job-area-map"]').screenshot({
      path: join(OUT, `map-cover-${width}.png`),
    })
    report.push({ width, ...m, blankLeft })
    await page.close()
  }

  // Browse panel ~500px at 1280 layout
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const jobId = await seed(page)
    await page.goto(`${BASE}/browse?demo=1&job=${jobId}&radius=all`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForSelector('[data-testid="browse-job-detail"]', { timeout: 20000 })
    await page.evaluate(() => {
      const s = document.querySelector('.browse-hc-detail-scroll')
      if (s) s.scrollTop = 220
    })
    const m = await measureMap(page)
    const blankLeft = await blankLeftRatio(page)
    console.log('browse-panel', { ...m, blankLeft })
    assert.ok(m.leftPad >= 0 && m.rightPad >= 0, `browse panel gaps L${m.leftPad} R${m.rightPad}`)
    assert.ok(m.circleInside, 'browse panel circle clipped')
    assert.ok(m.starSize >= 22, `browse panel star ${m.starSize}`)
    assert.ok(blankLeft < 0.2, `browse panel blank left: ${blankLeft}`)
    await page.locator('[data-testid="job-area-map"]').screenshot({
      path: join(OUT, 'map-cover-browse-panel-500.png'),
    })
    report.push({ width: 'browse-panel', ...m, blankLeft })
    await page.close()
  }

  await browser.close()
  console.log('job-area-map-cover-qa PASS', JSON.stringify(report))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
