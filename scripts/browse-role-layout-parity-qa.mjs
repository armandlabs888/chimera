#!/usr/bin/env node
/**
 * Neighbor vs helper /browse layout parity (demo mode).
 * Both roles keep the Jobs section tab row so title / filters / cards / detail
 * share the same Y positions. Helpers still never see the Helpers tab.
 *
 * Run: NEXT_PUBLIC_BEAM_DEMO_MODE=1 npm run build && npm start
 *      BASE_URL=http://127.0.0.1:43123 node scripts/browse-role-layout-parity-qa.mjs
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/browse-role-layout-parity'
const STORAGE_KEY = 'beam-demo-v1'
const TOLERANCE_PX = 1

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844 },
]

async function warmDemo(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
}

async function seedRole(page, role) {
  await warmDemo(page)
  await page.evaluate(
    ({ key, role }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      const now = new Date().toISOString()
      state.people = (state.people || []).map((p) => {
        if (p.id !== me) {
          if (!(p.isHelper || (p.skills || []).length)) {
            p.isHelper = true
            p.skills = p.skills?.length ? p.skills : ['moving', 'cleaning']
            p.hourlyRate = p.hourlyRate || 35
          }
          return p
        }
        if (role === 'helper') {
          return {
            ...p,
            accountRole: 'helper',
            isHelper: true,
            skills: p.skills?.length ? p.skills : ['moving', 'junk-removal'],
            hourlyRate: p.hourlyRate || 35,
            city: 'Austin',
            stateCode: 'TX',
            locationLabel: 'East Austin, TX',
            lat: 30.2672,
            lng: -97.7205,
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
          city: 'Austin',
          stateCode: 'TX',
          locationLabel: 'East Austin, TX',
          lat: 30.2672,
          lng: -97.7205,
          onboardingCompletedAt: now,
          safetyDisclaimerAcceptedAt: now,
        }
      })

      const open = (state.requests || []).filter((r) => r.status === 'open')
      if (open.length < 3) {
        const extras = Array.from({ length: 6 }, (_, i) => ({
          id: `req-parity-${i}`,
          title: i === 0 ? 'Help move a couch upstairs' : `Neighborhood job ${i + 1}`,
          details: 'Clear scope, flexible timing, upfront budget.',
          category: ['junk-removal', 'house-cleaning', 'pet-sitting'][i % 3],
          neighborhood: 'east-austin',
          locationLabel: 'East Austin, TX',
          lat: 30.2672,
          lng: -97.7205,
          when: 'asap',
          whenLabel: 'ASAP',
          budget: 70 + i * 5,
          budgetType: 'fixed',
          radiusMiles: 10,
          status: 'open',
          requesterId: (state.people || []).find((p) => p.id !== me)?.id || 'p-maya',
          createdAt: new Date(Date.now() - i * 3600 * 1000).toISOString(),
        }))
        state.requests = [...extras, ...(state.requests || [])]
      } else {
        state.requests = (state.requests || []).map((r) =>
          r.status === 'open'
            ? {
                ...r,
                locationLabel: r.locationLabel || 'East Austin, TX',
                lat: r.lat ?? 30.2672,
                lng: r.lng ?? -97.7205,
              }
            : r,
        )
      }

      localStorage.removeItem('beam-browse-location-v1')
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, role },
  )
  await page.goto(`${BASE}/browse?demo=1&radius=all`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForSelector('[data-testid="browse-v3"]')
  await page.waitForSelector('[data-testid="browse-mode-tabs"]')
  await page.waitForSelector('[data-testid="browse-job-row"]')
}

async function measure(page) {
  return page.evaluate(() => {
    function box(el) {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        x: Math.round(r.x * 100) / 100,
        y: Math.round(r.y * 100) / 100,
        width: Math.round(r.width * 100) / 100,
        height: Math.round(r.height * 100) / 100,
      }
    }
    const title = document.querySelector('[data-testid="browse-hero-title"]')
    const filterBar = document.querySelector('[data-testid="browse-filter-bar"]')
    const firstJob = document.querySelector('[data-testid="browse-job-row"]')
    const detail = document.querySelector('[data-testid="browse-job-detail"]')
    const tabs = document.querySelector('[data-testid="browse-mode-tabs"]')
    const helpersTab = document.querySelector('[data-testid="browse-tab-local-helpers"]')
    const jobsTab = document.querySelector('[data-testid="browse-tab-jobs"]')
    const root = document.querySelector('[data-testid="browse-v3"]')
    return {
      layout: root?.getAttribute('data-browse-layout') || null,
      hasSectionTabs: !!tabs,
      hasHelpersTab: !!helpersTab,
      jobsTabActive: jobsTab?.classList.contains('is-active') || false,
      title: box(title),
      filterBar: box(filterBar),
      firstJob: box(firstJob),
      detail: box(detail),
      sectionTabs: box(tabs),
    }
  })
}

function assertNear(label, a, b, keys = ['x', 'y', 'width', 'height']) {
  assert.ok(a, `${label}: neighbor missing`)
  assert.ok(b, `${label}: helper missing`)
  for (const key of keys) {
    const delta = Math.abs(a[key] - b[key])
    assert.ok(
      delta <= TOLERANCE_PX,
      `${label}.${key}: neighbor=${a[key]} helper=${b[key]} delta=${delta}`,
    )
  }
}

async function sideBySide(leftPath, rightPath, outPath) {
  const left = sharp(leftPath)
  const right = sharp(rightPath)
  const leftMeta = await left.metadata()
  const rightMeta = await right.metadata()
  const width = (leftMeta.width || 0) + (rightMeta.width || 0)
  const height = Math.max(leftMeta.height || 0, rightMeta.height || 0)
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: await left.png().toBuffer(), left: 0, top: 0 },
      { input: await right.png().toBuffer(), left: leftMeta.width || 0, top: 0 },
    ])
    .png()
    .toFile(outPath)
}

const report = { ok: true, viewports: [], checks: [] }

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const vp of VIEWPORTS) {
      const neighborPage = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      })
      const helperPage = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      })

      await seedRole(neighborPage, 'neighbor')
      await seedRole(helperPage, 'helper')

      const isDesktop = vp.width >= 1024
      if (isDesktop) {
        // Select first job so the side detail panel is present for measurement.
        await neighborPage.locator('[data-testid="browse-job-row"]').first().click()
        await helperPage.locator('[data-testid="browse-job-row"]').first().click()
        await neighborPage.waitForSelector('[data-testid="browse-job-detail"]')
        await helperPage.waitForSelector('[data-testid="browse-job-detail"]')
        await neighborPage.waitForTimeout(200)
        await helperPage.waitForTimeout(200)
      }

      const neighbor = await measure(neighborPage)
      const helper = await measure(helperPage)

      assert.equal(neighbor.layout, 'discovery', `${vp.name}: neighbor discovery`)
      assert.equal(helper.layout, 'helper-jobs', `${vp.name}: helper jobs layout`)
      assert.equal(neighbor.hasSectionTabs, true, `${vp.name}: neighbor tabs`)
      assert.equal(helper.hasSectionTabs, true, `${vp.name}: helper tabs`)
      assert.equal(neighbor.hasHelpersTab, true, `${vp.name}: neighbor Helpers tab`)
      assert.equal(helper.hasHelpersTab, false, `${vp.name}: helper must not see Helpers tab`)
      assert.equal(helper.jobsTabActive, true, `${vp.name}: helper Jobs tab underlined`)

      assertNear(`${vp.name} title`, neighbor.title, helper.title)
      assertNear(`${vp.name} filterBar`, neighbor.filterBar, helper.filterBar)
      assertNear(`${vp.name} firstJob`, neighbor.firstJob, helper.firstJob)
      if (neighbor.detail || helper.detail) {
        assertNear(`${vp.name} detail`, neighbor.detail, helper.detail)
      }
      assertNear(`${vp.name} sectionTabs`, neighbor.sectionTabs, helper.sectionTabs, [
        'y',
        'height',
      ])

      const nShot = join(LOCAL, `browse-neighbor-${vp.name}.png`)
      const hShot = join(LOCAL, `browse-helper-${vp.name}.png`)
      await neighborPage.screenshot({ path: nShot, fullPage: false })
      await helperPage.screenshot({ path: hShot, fullPage: false })

      const compositeName = `browse-parity-${vp.name}.png`
      const compositeOut = join(OUT, compositeName)
      const compositeLocal = join(LOCAL, compositeName)
      await sideBySide(nShot, hShot, compositeOut)
      await sideBySide(nShot, hShot, compositeLocal)

      report.viewports.push({
        name: vp.name,
        neighbor,
        helper,
        composite: compositeOut,
      })
      report.checks.push({ viewport: vp.name, ok: true })

      await neighborPage.close()
      await helperPage.close()
    }
  } catch (err) {
    report.ok = false
    report.error = String(err?.stack || err)
    throw err
  } finally {
    await browser.close()
    writeFileSync(join(OUT, 'browse-role-layout-parity.json'), JSON.stringify(report, null, 2))
    writeFileSync(join(LOCAL, 'summary.json'), JSON.stringify(report, null, 2))
  }
}

main()
  .then(() => {
    console.log('browse-role-layout-parity-qa: ok')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
