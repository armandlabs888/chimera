#!/usr/bin/env node
/**
 * Before/after screenshots for job detail spacing + area map.
 * Seeds a dresser job matching the visual brief, as neighbor and helper.
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const PHASE = process.env.SHOT_PHASE || 'before'
const OUT = '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/job-detail-spacing-map'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name) {
  const file = `${PHASE}-${name}.png`
  await page.screenshot({ path: join(OUT, file), fullPage: false })
  await page.screenshot({ path: join(LOCAL, file), fullPage: false })
  console.log(`saved ${file}`)
}

async function warmDemo(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
}

async function seedRole(page, role) {
  await warmDemo(page)
  const jobId = await page.evaluate(
    ({ key, role }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      const now = new Date().toISOString()
      state.people = (state.people || []).map((p) => {
        if (p.id !== me) {
          if (!(p.isHelper || (p.skills || []).length)) {
            p.isHelper = true
            p.skills = p.skills?.length ? p.skills : ['junk-removal', 'moving']
            p.hourlyRate = p.hourlyRate || 35
          }
          return p
        }
        if (role === 'helper') {
          return {
            ...p,
            accountRole: 'helper',
            isHelper: true,
            skills: p.skills?.length ? p.skills : ['junk-removal', 'moving'],
            hourlyRate: p.hourlyRate || 35,
            city: 'San Jose',
            stateCode: 'CA',
            locationLabel: 'Cambrian, San Jose',
            lat: 37.255,
            lng: -121.928,
            onboardingCompletedAt: now,
            safetyDisclaimerAcceptedAt: now,
          }
        }
        return {
          ...p,
          accountRole: 'customer',
          isHelper: false,
          skills: [],
          hourlyRate: 0,
          city: 'San Jose',
          stateCode: 'CA',
          locationLabel: 'Cambrian, San Jose',
          lat: 37.255,
          lng: -121.928,
          onboardingCompletedAt: now,
          safetyDisclaimerAcceptedAt: now,
        }
      })

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
        helperId: null,
        acceptedOfferId: null,
        createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        images: [
          'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
        ],
        image:
          'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
      }
      state.requests = [job, ...(state.requests || []).filter((r) => r.id !== job.id)]
      state.offers = (state.offers || []).filter(
        (o) => !(o.requestId === job.id && o.helperId === me),
      )
      localStorage.setItem(key, JSON.stringify(state))
      return job.id
    },
    { key: STORAGE_KEY, role },
  )
  // Reload so React loadState picks up the seeded job (avoids saveState races).
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
  return jobId
}

async function setVerification(page, status) {
  await page.evaluate((s) => {
    const fn = window.__BEAM_SET_DEMO_VERIFICATION__
    if (typeof fn === 'function') fn(s)
  }, status)
}

async function runRole(browser, role) {
  // Desktop browse panel
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const jobId = await seedRole(page, role)
    if (role === 'helper') await setVerification(page, 'approved')
    await page.goto(`${BASE}/browse?demo=1&job=${jobId}&radius=all`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForSelector('[data-testid="browse-job-detail"]', { timeout: 20000 })
    // Scroll detail body so Timing/Area + map + About are visible below the photo.
    await page.evaluate(() => {
      const scroll = document.querySelector('.browse-hc-detail-scroll')
      if (scroll) scroll.scrollTop = 200
    })
    await page.waitForSelector('[data-testid="job-area-map"]', { timeout: 10000 })
    await page.locator('[data-testid="job-area-map"] img').first().waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForFunction(() => {
      const img = document.querySelector('[data-testid="job-area-map"] img')
      return img && img.complete && img.naturalWidth > 0
    }, null, { timeout: 15000 })
    // Assert sample marker is not visible in the detail panel.
    const detailText = await page.locator('[data-testid="browse-job-detail"]').innerText()
    if (/HouseCall sample|Beam sample/i.test(detailText)) {
      throw new Error(`sample marker still visible in browse detail (${role})`)
    }
    await shot(page, `browse-detail-${role}-1280x800`)
    await page.locator('[data-testid="browse-job-detail"]').screenshot({
      path: join(OUT, `${PHASE}-browse-detail-panel-${role}-1280x800.png`),
    })
    await page.close()
  }

  // Mobile job sheet
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const jobId = await seedRole(page, role)
    if (role === 'helper') await setVerification(page, 'approved')
    await page.goto(`${BASE}/browse?demo=1&radius=all`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    // Mobile opens the sheet via row tap (URL job= alone can race with layout).
    const row = page.locator(`[data-testid="browse-job-row"][data-job-id="${jobId}"]`)
    const anyRow = page.locator('[data-testid="browse-job-row"]').first()
    if (await row.count()) await row.click()
    else await anyRow.click()
    await page.waitForSelector('[data-testid="browse-job-sheet"]', { timeout: 20000 })
    await page.waitForSelector('[data-testid="job-area-map"]', { timeout: 10000 })
    await page.locator('[data-testid="job-area-map"]').scrollIntoViewIfNeeded()
    await page.waitForFunction(() => {
      const img = document.querySelector('[data-testid="job-area-map"] img')
      return img && img.complete && img.naturalWidth > 0
    }, null, { timeout: 15000 })
    const sheetText = await page.locator('[data-testid="browse-job-sheet"]').innerText()
    if (/HouseCall sample|Beam sample/i.test(sheetText)) {
      throw new Error(`sample marker still visible in mobile sheet (${role})`)
    }
    await shot(page, `mobile-sheet-${role}-390x844`)
    await page.close()
  }

  // Full request page
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const jobId = await seedRole(page, role)
    if (role === 'helper') await setVerification(page, 'approved')
    await page.goto(`${BASE}/requests/${jobId}?demo=1`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForSelector('[data-testid="request-detail-root"]', { timeout: 20000 })
    await page.waitForSelector('[data-testid="job-area-map"]', { timeout: 10000 })
    await page.locator('[data-testid="job-area-map"]').scrollIntoViewIfNeeded()
    await page.waitForFunction(() => {
      const img = document.querySelector('[data-testid="job-area-map"] img')
      return img && img.complete && img.naturalWidth > 0
    }, null, { timeout: 15000 })
    const pageText = await page.locator('[data-testid="request-detail-root"]').innerText()
    if (/HouseCall sample|Beam sample/i.test(pageText)) {
      throw new Error(`sample marker still visible on request detail (${role})`)
    }
    await shot(page, `request-detail-${role}-1280x800`)
    await page.close()
  }
}

async function main() {
  const browser = await chromium.launch()
  await runRole(browser, 'neighbor')
  await runRole(browser, 'helper')
  await browser.close()
  console.log(`phase ${PHASE} done`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
