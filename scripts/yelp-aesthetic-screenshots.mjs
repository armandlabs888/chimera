#!/usr/bin/env node
/**
 * Capture HouseCall demo screenshots before/after Yelp-style aesthetic mock.
 * Usage: PHASE=before|after node scripts/yelp-aesthetic-screenshots.mjs
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const PHASE = process.env.PHASE === 'after' ? 'after' : 'before'
const OUT = `/opt/cursor/artifacts/housecall-${PHASE}`
const STORAGE_KEY = 'beam-demo-v1'
mkdirSync(OUT, { recursive: true })

async function waitDemo(page) {
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 25000,
  })
}

async function seedNeighbor(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitDemo(page)
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    for (const p of state.people || []) {
      if (p.id === me) {
        p.accountRole = 'customer'
        p.isHelper = false
        p.skills = []
      }
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
}

async function pickIds(page) {
  return page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const openJob =
      (state.requests || []).find((r) => r.status === 'open' || r.status === 'Open') ||
      (state.requests || [])[0]
    const helper =
      (state.people || []).find(
        (p) => p.id !== state.currentUserId && (p.isHelper || (p.skills || []).length),
      ) || (state.people || [])[0]
    return {
      jobId: openJob?.id || null,
      helperId: helper?.id || null,
    }
  }, STORAGE_KEY)
}

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  console.log('saved', path)
  return path
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const summary = { phase: PHASE, shots: [] }

  try {
    // Desktop suite
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
      await seedNeighbor(page)
      const ids = await pickIds(page)
      summary.ids = ids

      // Landing
      await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(600)
      summary.shots.push(await shot(page, `${PHASE}-landing-desktop.png`))

      // Browse with job detail open
      await page.goto(`${BASE}/browse?demo=1${ids.jobId ? `&job=${ids.jobId}` : ''}`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.waitForTimeout(900)
      // Ensure detail panel visible if possible
      const detail = page.locator('[data-testid="browse-job-detail"], [data-testid="browse-job-drawer"], aside').first()
      try {
        await detail.waitFor({ state: 'visible', timeout: 5000 })
      } catch {
        if (ids.jobId) {
          const row = page.locator(`[data-testid="browse-job-row"]`).first()
          if (await row.count()) await row.click()
          await page.waitForTimeout(700)
        }
      }
      summary.shots.push(await shot(page, `${PHASE}-browse-job-detail-desktop.png`))

      // Job page
      if (ids.jobId) {
        await page.goto(`${BASE}/requests/${ids.jobId}?demo=1`, {
          waitUntil: 'networkidle',
          timeout: 60000,
        })
        await page.waitForTimeout(700)
        summary.shots.push(await shot(page, `${PHASE}-request-desktop.png`))
      }

      // Public helper profile
      if (ids.helperId) {
        await page.goto(`${BASE}/people/${ids.helperId}?demo=1`, {
          waitUntil: 'networkidle',
          timeout: 60000,
        })
        await page.waitForTimeout(700)
        summary.shots.push(await shot(page, `${PHASE}-people-desktop.png`))
      }

      // Browse Helpers mode
      await page.goto(`${BASE}/browse?demo=1&mode=helpers`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.waitForTimeout(800)
      // Try clicking Helpers tab if mode query not enough
      const helpersTab = page.locator('button:has-text("Helpers"), a:has-text("Helpers")').first()
      if (await helpersTab.count()) {
        try {
          await helpersTab.click({ timeout: 2000 })
          await page.waitForTimeout(600)
        } catch {
          /* ignore */
        }
      }
      summary.shots.push(await shot(page, `${PHASE}-browse-helpers-desktop.png`))

      // Post a task
      await page.goto(`${BASE}/post?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(700)
      summary.shots.push(await shot(page, `${PHASE}-post-desktop.png`))

      await page.close()
    }

    // Mobile: Browse + job page
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      await seedNeighbor(page)
      const ids = await pickIds(page)

      await page.goto(`${BASE}/browse?demo=1${ids.jobId ? `&job=${ids.jobId}` : ''}`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.waitForTimeout(900)
      summary.shots.push(await shot(page, `${PHASE}-browse-job-detail-mobile.png`))

      if (ids.jobId) {
        await page.goto(`${BASE}/requests/${ids.jobId}?demo=1`, {
          waitUntil: 'networkidle',
          timeout: 60000,
        })
        await page.waitForTimeout(700)
        summary.shots.push(await shot(page, `${PHASE}-request-mobile.png`))
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }

  writeFileSync(join(OUT, `${PHASE}-summary.json`), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
