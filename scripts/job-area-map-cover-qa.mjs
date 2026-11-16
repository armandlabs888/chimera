#!/usr/bin/env node
/**
 * Assert JobAreaMap interactive frame sizes, Leaflet mount, and privacy zoom clamp.
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
        'Solid wood dresser from the entry to the upstairs bedroom. Drawers come out. Two people would be ideal.\n\n[Bunk sample, Nov 12, 2026]',
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

async function measureMap(page, expectMobileHeight) {
  await page.waitForSelector('[data-testid="job-area-map"]', { timeout: 20000 })
  await page.locator('[data-testid="job-area-map"]').scrollIntoViewIfNeeded()
  await page.waitForSelector(
    '[data-testid="job-area-map-leaflet"], [data-testid="job-area-map-static"]',
    { timeout: 20000 },
  )
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="job-area-map"]')
    if (!root) return false
    const leaflet = root.querySelector('.leaflet-container')
    if (leaflet) {
      const tile = leaflet.querySelector('img.leaflet-tile, .leaflet-tile-loaded')
      return !!tile
    }
    const img = root.querySelector('.job-area-map-mosaic img')
    return img && img.complete && img.naturalWidth > 0
  }, null, { timeout: 20000 })
  await page.waitForTimeout(300)

  return page.evaluate((mobile) => {
    const map = document.querySelector('[data-testid="job-area-map"]')
    const host =
      map?.querySelector('.job-area-map-interactive-host') ||
      map?.querySelector('.job-area-map-frame')
    const leaflet = map?.querySelector('.leaflet-container')
    const circle =
      map?.querySelector('.leaflet-overlay-pane path') ||
      map?.querySelector('.job-area-map-circle')
    const star =
      map?.querySelector('.job-area-map-star-icon svg') ||
      map?.querySelector('.job-area-map-star svg')
    const reset = map?.querySelector('[data-testid="job-area-map-reset"]')
    const zoomIn = map?.querySelector('.leaflet-control-zoom-in')
    if (!host) return { error: 'missing' }
    const fr = host.getBoundingClientRect()
    const mode = map?.getAttribute('data-map-mode') || 'unknown'
    return {
      mode,
      frameW: Math.round(fr.width),
      frameH: Math.round(fr.height),
      expectH: mobile ? 260 : 320,
      hasLeaflet: !!leaflet,
      hasCircle: !!circle,
      hasStar: !!star,
      hasReset: !!reset,
      hasZoom: !!zoomIn,
      starSize: star ? Math.round(star.getBoundingClientRect().width) : 0,
    }
  }, expectMobileHeight)
}

async function assertZoomClamp(page) {
  const result = await page.evaluate(async () => {
    const el = document.querySelector('[data-testid="job-area-map-leaflet"]')
    if (!el) return { ok: false, reason: 'no-leaflet' }
    // Leaflet stores the map on the container via private fields in some builds;
    // drive zoom via control clicks instead.
    const zoomIn = document.querySelector('.leaflet-control-zoom-in')
    if (!zoomIn) return { ok: false, reason: 'no-zoom' }
    for (let i = 0; i < 8; i += 1) {
      zoomIn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 80))
    }
    const disabled = zoomIn.classList.contains('leaflet-disabled')
    return { ok: disabled, reason: disabled ? 'clamped' : 'still-enabled' }
  })
  assert.equal(result.ok, true, `max zoom not clamped: ${result.reason}`)
}

async function main() {
  const browser = await chromium.launch()
  const report = []

  for (const width of WIDTHS) {
    const page = await browser.newPage({
      viewport: { width, height: width <= 500 ? 844 : 900 },
    })
    const jobId = await seed(page)
    const mobile = width < 768

    if (width <= 500) {
      await page.goto(`${BASE}/browse?demo=1&radius=all`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      if (width <= 390) {
        await page.locator(`[data-testid="browse-job-row"][data-job-id="${jobId}"]`).click()
        await page.waitForSelector('[data-testid="browse-job-sheet"]', { timeout: 20000 })
      } else {
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

    const m = await measureMap(page, mobile)
    console.log(width, m)
    assert.ok(!m.error, `map missing @${width}`)
    assert.ok(m.hasCircle, `circle missing @${width}`)
    assert.ok(m.hasStar, `star missing @${width}`)
    assert.ok(m.starSize >= 20 && m.starSize <= 32, `star size @${width}: ${m.starSize}`)
    assert.ok(
      Math.abs(m.frameH - m.expectH) <= 2,
      `height @${width}: got ${m.frameH}, want ~${m.expectH}`,
    )
    if (m.hasLeaflet) {
      assert.ok(m.hasReset, `reset missing @${width}`)
      assert.ok(m.hasZoom, `zoom controls missing @${width}`)
      await assertZoomClamp(page)
    }
    await page.locator('[data-testid="job-area-map"]').screenshot({
      path: join(OUT, `map-cover-${width}.png`),
    })
    report.push({ width, ...m })
    await page.close()
  }

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
    const m = await measureMap(page, false)
    console.log('browse-panel', m)
    assert.ok(Math.abs(m.frameH - 320) <= 2, `browse panel height ${m.frameH}`)
    assert.ok(m.hasCircle && m.hasStar, 'browse panel markers')
    await page.locator('[data-testid="job-area-map"]').screenshot({
      path: join(OUT, 'map-cover-browse-panel-500.png'),
    })
    report.push({ width: 'browse-panel', ...m })
    await page.close()
  }

  await browser.close()
  console.log('job-area-map-cover-qa PASS', JSON.stringify(report))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
