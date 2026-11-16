#!/usr/bin/env node
/**
 * Interactive JobAreaMap smoke: pan/zoom controls, height, reset, privacy clamp.
 * Viewports: 1440 desktop and 390 mobile.
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'

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
            accountRole: 'helper',
            isHelper: true,
            skills: p.skills?.length ? p.skills : ['junk-removal', 'moving'],
            hourlyRate: p.hourlyRate || 35,
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
      id: 'req-interactive-map-qa',
      title: 'Carry a dresser up one flight of stairs',
      details:
        'Solid wood dresser from the entry to the upstairs bedroom.\n\n[HouseCall sample, Nov 16, 2026]',
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
  // Reload first so React loadState picks up the seeded job (avoid saveState races).
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
  await page.evaluate(() => {
    const fn = window.__BEAM_SET_DEMO_VERIFICATION__
    if (typeof fn === 'function') fn('approved')
  })
  return jobId
}

async function waitForInteractiveMap(page) {
  await page.waitForSelector('[data-testid="job-area-map"]', {
    state: 'attached',
    timeout: 20000,
  })
  await page.locator('[data-testid="job-area-map"]').scrollIntoViewIfNeeded()
  await page.waitForSelector('[data-testid="job-area-map-leaflet"]', {
    state: 'visible',
    timeout: 20000,
  })
  await page.waitForSelector('.leaflet-control-zoom-in', { timeout: 10000 })
  await page.waitForSelector('[data-testid="job-area-map-reset"]', { timeout: 10000 })
}

async function readMapState(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="job-area-map"]')
    const host =
      root?.querySelector('.job-area-map-interactive-host') ||
      root?.querySelector('.job-area-map-frame')
    const zoomIn = document.querySelector('.leaflet-control-zoom-in')
    const attr = root?.querySelector('.leaflet-control-attribution')
    return {
      mode: root?.getAttribute('data-map-mode'),
      height: host ? Math.round(host.getBoundingClientRect().height) : 0,
      hasAttr: !!(attr && /OpenStreetMap/i.test(attr.textContent || '')),
      zoomDisabled: zoomIn?.classList.contains('leaflet-disabled') || false,
      copy: root?.innerText || '',
    }
  })
}

async function tileZoom(page) {
  return page.evaluate(() => {
    const tiles = [...document.querySelectorAll('.job-area-map-leaflet img.leaflet-tile')]
    const zs = tiles
      .map((t) => {
        const m = (t.getAttribute('src') || '').match(/\/(\d+)\/\d+\/\d+\.png/)
        return m ? Number(m[1]) : null
      })
      .filter((z) => z != null)
    return zs.length ? Math.max(...zs) : null
  })
}

async function zoomUntilMax(page) {
  for (let i = 0; i < 10; i += 1) {
    const disabled = await page.locator('.leaflet-control-zoom-in').evaluate((el) =>
      el.classList.contains('leaflet-disabled'),
    )
    if (disabled) return true
    await page.locator('.leaflet-control-zoom-in').click({ force: true })
    await page.waitForTimeout(150)
  }
  return page.locator('.leaflet-control-zoom-in').evaluate((el) =>
    el.classList.contains('leaflet-disabled'),
  )
}

async function shot(page, name) {
  const file = join(OUT, name)
  await page.locator('[data-testid="job-area-map"]').screenshot({ path: file })
  console.log('saved', name)
}

async function main() {
  const browser = await chromium.launch()

  // Desktop 1440: request detail
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const jobId = await seed(page)
    await page.goto(`${BASE}/requests/${jobId}?demo=1`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await waitForInteractiveMap(page)
    const before = await readMapState(page)
    assert.equal(before.mode, 'interactive')
    assert.ok(Math.abs(before.height - 320) <= 2, `desktop height ${before.height}`)
    assert.ok(before.hasAttr, 'missing OSM attribution')
    assert.ok(!/[\u2013\u2014]/.test(before.copy), 'em/en dash in map copy')

    await page.locator('.leaflet-control-zoom-in').click({ force: true })
    await page.waitForTimeout(200)
    const clamped = await zoomUntilMax(page)
    assert.ok(clamped, 'zoom-in should disable at maxZoom')
    assert.equal(await tileZoom(page), 16, 'tiles should stop at zoom 16')

    await page.locator('[data-testid="job-area-map-reset"]').click()
    await page.waitForFunction(() => {
      const zoomIn = document.querySelector('.leaflet-control-zoom-in')
      if (!zoomIn || zoomIn.classList.contains('leaflet-disabled')) return false
      const tiles = [...document.querySelectorAll('.job-area-map-leaflet img.leaflet-tile-loaded')]
      const zs = tiles
        .map((t) => {
          const m = (t.getAttribute('src') || '').match(/\/(\d+)\/\d+\/\d+\.png/)
          return m ? Number(m[1]) : null
        })
        .filter((z) => z != null)
      // During animated reset, stale higher-zoom tiles can linger; require a z14 tile.
      return zs.includes(14)
    }, null, { timeout: 5000 })
    assert.equal(
      await page.locator('.leaflet-control-zoom-in').evaluate((el) =>
        el.classList.contains('leaflet-disabled'),
      ),
      false,
      'reset should leave room to zoom in',
    )

    // Drag/pan smoke
    const box = await page.locator('[data-testid="job-area-map-leaflet"]').boundingBox()
    assert.ok(box, 'leaflet box')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2 - 40, { steps: 8 })
    await page.mouse.up()

    await shot(page, 'interactive-map-desktop-1440.png')
    await page.screenshot({ path: join(OUT, 'interactive-map-request-1440.png'), fullPage: false })
    await page.close()
  }

  // Mobile 390: browse sheet
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const jobId = await seed(page)
    await page.goto(`${BASE}/browse?demo=1&radius=all`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    const row = page.locator(`[data-testid="browse-job-row"][data-job-id="${jobId}"]`)
    if (await row.count()) await row.click()
    else await page.locator('[data-testid="browse-job-row"]').first().click()
    await page.waitForSelector('[data-testid="browse-job-sheet"]', { timeout: 20000 })
    await waitForInteractiveMap(page)
    const state = await readMapState(page)
    assert.equal(state.mode, 'interactive')
    assert.ok(Math.abs(state.height - 260) <= 2, `mobile height ${state.height}`)
    assert.ok(state.hasAttr, 'mobile OSM attribution')
    await shot(page, 'interactive-map-mobile-390.png')
    await page.screenshot({ path: join(OUT, 'interactive-map-sheet-390.png'), fullPage: false })
    await page.close()
  }

  // Browse detail panel at 1440
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const jobId = await seed(page)
    await page.goto(`${BASE}/browse?demo=1&job=${jobId}&radius=all`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForSelector('[data-testid="browse-job-detail"]', { timeout: 20000 })
    await page.evaluate(() => {
      const s = document.querySelector('.browse-hc-detail-scroll')
      if (s) s.scrollTop = 240
    })
    await waitForInteractiveMap(page)
    const state = await readMapState(page)
    assert.ok(Math.abs(state.height - 320) <= 2, `panel height ${state.height}`)
    await shot(page, 'interactive-map-browse-panel-1440.png')
    await page.close()
  }

  await browser.close()
  console.log('interactive-job-area-map-qa PASS')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
