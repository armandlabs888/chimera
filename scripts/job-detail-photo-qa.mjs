#!/usr/bin/env node
/**
 * Job detail photo frame QA (demo mode).
 * Taller ~4:3 cover with object-fit contain + blurred fill on Browse panel,
 * mobile sheet, and /requests/[id], for neighbor and helper, landscape + portrait.
 *
 * Run: NEXT_PUBLIC_BEAM_DEMO_MODE=1 npm run build && npm start
 *      BASE_URL=http://127.0.0.1:43123 node scripts/job-detail-photo-qa.mjs
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/job-detail-photo'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844 },
]

/** Wide landscape listing photo (window / blinds style). */
const LANDSCAPE_SRC =
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&h=900&q=80'
/** Tall portrait listing photo. */
const PORTRAIT_SRC =
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&h=1400&q=80'

const JOBS = [
  {
    id: 'req-photo-qa-landscape',
    title: 'Install blinds on four windows',
    details:
      'Four inside-mount blinds, already measured and delivered. Need a drill and a steady hand.',
    category: 'other',
    categoryCustom: 'Window blinds',
    image: LANDSCAPE_SRC,
    images: [LANDSCAPE_SRC],
    orientation: 'landscape',
  },
  {
    id: 'req-photo-qa-portrait',
    title: 'Deep clean a studio kitchen',
    details: 'Counters, sink, and appliances. Bring your own supplies if you can.',
    category: 'house-cleaning',
    image: PORTRAIT_SRC,
    images: [PORTRAIT_SRC],
    orientation: 'portrait',
  },
]

async function warmDemo(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
}

async function seedRole(page, role) {
  await warmDemo(page)
  // Write role + jobs into localStorage, then full navigation reloads React from LS.
  // Do not call __BEAM_SET_DEMO_VERIFICATION__ before reload: it saves React state and
  // can wipe jobs that exist only in localStorage.
  await page.evaluate(
    ({ key, role, jobs }) => {
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

      if (role === 'helper') {
        const row = {
          id: 'ver-photo-qa',
          profileId: me,
          status: 'approved',
          email: 'alex.rivera@email.com',
          street: '1842 Willow Street',
          apt: null,
          city: 'San Jose',
          stateCode: 'CA',
          zip: '95125',
          documentPath: null,
          documentName: null,
          lastCheckResult: 'matched',
          reviewReason: null,
          reviewedBy: null,
          reviewedAt: null,
          verificationMethod: 'location',
          submittedAt: now,
          createdAt: now,
          updatedAt: now,
        }
        state.helperVerification = row
        state.helperVerifications = [
          row,
          ...(state.helperVerifications || []).filter((v) => v.profileId !== me),
        ]
      }

      const ownerId = (state.people || []).find((p) => p.id !== me)?.id || 'p-maya'
      const seeded = jobs.map((job) => ({
        id: job.id,
        title: job.title,
        details: job.details,
        category: job.category,
        categoryCustom: job.categoryCustom || undefined,
        neighborhood: 'east-austin',
        locationLabel: 'Mountain View',
        lat: 30.2672,
        lng: -97.7205,
        when: 'scheduled',
        whenLabel: 'Wed, Nov 18 · 6:00 PM',
        budget: 90,
        budgetType: 'fixed',
        radiusMiles: 10,
        status: 'open',
        requesterId: ownerId,
        helperId: null,
        acceptedOfferId: null,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        images: job.images,
        image: job.image,
      }))

      const ids = new Set(seeded.map((j) => j.id))
      state.requests = [...seeded, ...(state.requests || []).filter((r) => !ids.has(r.id))]
      state.offers = (state.offers || []).filter((o) => !ids.has(o.requestId) || o.helperId !== me)
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, role, jobs: JOBS },
  )
}

async function shot(page, name) {
  const dest = join(OUT, name)
  await page.screenshot({ path: dest, fullPage: false })
  await page.screenshot({ path: join(LOCAL, name), fullPage: false })
  return name
}

async function assertPhotoFrame(page, scope, { minHeight }) {
  const metrics = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="job-detail-photo"], [data-testid="request-detail-cover"]')
    if (!root) return null
    const main = root.querySelector('img.job-detail-photo-main')
    const blur = root.querySelector('img.job-detail-photo-blur')
    const cs = getComputedStyle(root)
    const mainCs = main ? getComputedStyle(main) : null
    return {
      height: root.getBoundingClientRect().height,
      width: root.getBoundingClientRect().width,
      aspect: cs.aspectRatio,
      maxHeight: cs.maxHeight,
      bg: cs.backgroundColor,
      hasMain: !!main,
      hasBlur: !!blur,
      objectFit: mainCs?.objectFit || null,
      mainNatural: main ? { w: main.naturalWidth, h: main.naturalHeight } : null,
    }
  })
  assert.ok(metrics, `${scope}: missing job detail photo frame`)
  assert.ok(metrics.hasMain, `${scope}: missing contain image`)
  assert.ok(metrics.hasBlur, `${scope}: missing blurred fill`)
  assert.equal(metrics.objectFit, 'contain', `${scope}: expected object-fit contain`)
  assert.ok(
    metrics.height >= minHeight,
    `${scope}: photo too short (${metrics.height}px, need >= ${minHeight})`,
  )
  return metrics
}

async function run() {
  const report = { checks: [], shots: [], metrics: [] }
  const browser = await chromium.launch()

  try {
    for (const role of ['neighbor', 'helper']) {
      for (const job of JOBS) {
        for (const vp of VIEWPORTS) {
          const page = await browser.newPage({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: 2,
          })
          await seedRole(page, role)

          await page.goto(`${BASE}/browse?demo=1&job=${job.id}`, {
            waitUntil: 'networkidle',
            timeout: 60000,
          })

          const isDesktop = vp.width >= 1000
          if (isDesktop) {
            await page.waitForSelector('[data-testid="browse-job-detail"]', { timeout: 20000 })
            await page.waitForFunction(
              (id) =>
                document
                  .querySelector('[data-testid="browse-job-detail"] .browse-hc-detail-title')
                  ?.textContent?.includes(
                    id === 'req-photo-qa-landscape'
                      ? 'Install blinds'
                      : 'Deep clean a studio kitchen',
                  ),
              job.id,
              { timeout: 20000 },
            )
            await page.waitForSelector('[data-testid="job-detail-photo"] img.job-detail-photo-main', {
              timeout: 20000,
            })
            await page.waitForFunction(() => {
              const img = document.querySelector(
                '[data-testid="job-detail-photo"] img.job-detail-photo-main',
              )
              return img && img.complete && img.naturalWidth > 0
            })
            const m = await assertPhotoFrame(page, `${role} browse panel ${job.orientation} ${vp.name}`, {
              minHeight: 300,
            })
            report.metrics.push({ surface: 'browse-panel', role, ...job, vp: vp.name, ...m })
            report.shots.push(
              await shot(page, `job-photo-${role}-browse-panel-${job.orientation}-${vp.name}.png`),
            )
            const detail = page.locator('[data-testid="browse-job-detail"]')
            const detailName = `job-photo-${role}-browse-panel-detail-${job.orientation}-${vp.name}.png`
            await detail.screenshot({ path: join(OUT, detailName) })
            await detail.screenshot({ path: join(LOCAL, detailName) })
            report.shots.push(detailName)
          } else {
            await page.waitForSelector('[data-testid="browse-job-sheet"]', { timeout: 20000 })
            await page.waitForFunction(
              (id) =>
                document
                  .querySelector('[data-testid="browse-job-sheet"] h2')
                  ?.textContent?.includes(
                    id === 'req-photo-qa-landscape'
                      ? 'Install blinds'
                      : 'Deep clean a studio kitchen',
                  ),
              job.id,
              { timeout: 20000 },
            )
            await page.waitForSelector('[data-testid="job-detail-photo"] img.job-detail-photo-main', {
              timeout: 20000,
            })
            await page.waitForFunction(() => {
              const img = document.querySelector(
                '[data-testid="job-detail-photo"] img.job-detail-photo-main',
              )
              return img && img.complete && img.naturalWidth > 0
            })
            const m = await assertPhotoFrame(page, `${role} browse sheet ${job.orientation} ${vp.name}`, {
              minHeight: 220,
            })
            report.metrics.push({ surface: 'browse-sheet', role, ...job, vp: vp.name, ...m })
            report.shots.push(
              await shot(page, `job-photo-${role}-browse-sheet-${job.orientation}-${vp.name}.png`),
            )
          }

          await page.goto(`${BASE}/requests/${job.id}?demo=1`, {
            waitUntil: 'networkidle',
            timeout: 60000,
          })
          await page.waitForSelector('[data-testid="request-detail-cover"]', { timeout: 20000 })
          await page.waitForFunction(() => {
            const img = document.querySelector(
              '[data-testid="request-detail-cover"] img.job-detail-photo-main',
            )
            return img && img.complete && img.naturalWidth > 0
          })
          const rm = await assertPhotoFrame(page, `${role} request ${job.orientation} ${vp.name}`, {
            minHeight: isDesktop ? 300 : 220,
          })
          report.metrics.push({ surface: 'request-detail', role, ...job, vp: vp.name, ...rm })
          report.shots.push(
            await shot(page, `job-photo-${role}-request-${job.orientation}-${vp.name}.png`),
          )

          report.checks.push({
            role,
            orientation: job.orientation,
            viewport: vp.name,
            ok: true,
          })
          await page.close()
        }
      }
    }

    writeFileSync(join(OUT, 'job-detail-photo-qa.json'), JSON.stringify(report, null, 2))
    writeFileSync(join(LOCAL, 'job-detail-photo-qa.json'), JSON.stringify(report, null, 2))
    console.log('job-detail-photo-qa PASS')
    console.log(JSON.stringify({ checks: report.checks.length, shots: report.shots.length }, null, 2))
  } catch (err) {
    writeFileSync(
      join(OUT, 'job-detail-photo-qa.json'),
      JSON.stringify({ ok: false, error: String(err), report }, null, 2),
    )
    console.error(err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

await run()
