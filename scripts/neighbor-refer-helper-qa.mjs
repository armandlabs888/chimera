#!/usr/bin/env node
/**
 * Neighbor vs helper job-detail CTAs (demo mode).
 * Neighbors see Refer a helper (no Ask / Get verified / Make an offer / gate notice).
 * Helpers keep Ask a question + Get verified or Make an offer.
 *
 * Covers Browse panel + /requests/[id] at 1280x800 and 390x844, plus copy-link dialog.
 *
 * Run: NEXT_PUBLIC_BEAM_DEMO_MODE=1 npm run build && npm start
 *      BASE_URL=http://127.0.0.1:43123 node scripts/neighbor-refer-helper-qa.mjs
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/neighbor-refer-helper'
const STORAGE_KEY = 'beam-demo-v1'

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
  const jobId = await page.evaluate(
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

      const ownerId =
        (state.people || []).find((p) => p.id !== me)?.id || 'p-maya'
      const hyphenJob = {
        id: 'req-neighbor-refer-hyphen',
        title: 'Pack and label a 1-bedroom apartment',
        details:
          'Boxes and tape are here. Kitchen and closet are the big ones. Move is next week, so packing only.\n\n[BlockSide sample, Nov 12, 2026]',
        category: 'moving',
        neighborhood: 'east-austin',
        locationLabel: 'North San Jose',
        lat: 30.2672,
        lng: -97.7205,
        when: 'scheduled',
        whenLabel: 'Mon, Nov 16 • 9:00 AM',
        budget: 0,
        budgetType: 'open',
        radiusMiles: 10,
        status: 'open',
        requesterId: ownerId,
        helperId: null,
        acceptedOfferId: null,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        images: [
          'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1200&q=80',
        ],
        image:
          'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1200&q=80',
      }
      state.requests = [
        hyphenJob,
        ...(state.requests || []).filter((r) => r.id !== hyphenJob.id),
      ]
      // Clear any offer from current user on this job.
      state.offers = (state.offers || []).filter(
        (o) => !(o.requestId === hyphenJob.id && o.helperId === me),
      )
      localStorage.setItem(key, JSON.stringify(state))
      return hyphenJob.id
    },
    { key: STORAGE_KEY, role },
  )
  return jobId
}

async function setVerification(page, status) {
  await page.evaluate((s) => {
    const fn = window.__BEAM_SET_DEMO_VERIFICATION__
    if (typeof fn !== 'function') throw new Error('Demo verification hook missing')
    fn(s)
  }, status)
  await page.waitForTimeout(150)
}

async function shot(page, name) {
  const dest = join(OUT, name)
  await page.screenshot({ path: dest, fullPage: false })
  await page.screenshot({ path: join(LOCAL, name), fullPage: false })
  return name
}

async function assertNeighborChrome(page, scope) {
  assert.equal(
    await page.locator('[data-testid="browse-refer-helper"]').count(),
    1,
    `${scope}: missing Refer a helper`,
  )
  assert.equal(
    await page.locator('[data-testid="browse-refer-helper-hint"]').count(),
    1,
    `${scope}: missing refer hint`,
  )
  const btnMetrics = await page.locator('[data-testid="browse-refer-helper"]').evaluate((el) => {
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return {
      height: r.height,
      minHeight: Number.parseFloat(s.minHeight) || 0,
      paddingTop: Number.parseFloat(s.paddingTop) || 0,
      paddingBottom: Number.parseFloat(s.paddingBottom) || 0,
      fontSize: Number.parseFloat(s.fontSize) || 0,
      radius: Number.parseFloat(s.borderRadius) || 0,
    }
  })
  assert.ok(
    btnMetrics.height >= 43.5 && btnMetrics.height <= 46,
    `${scope}: refer button height ${btnMetrics.height} (expected ~44)`,
  )
  assert.ok(
    btnMetrics.minHeight >= 44,
    `${scope}: refer button min-height ${btnMetrics.minHeight} < 44`,
  )
  // Match offer CTAs: horizontal padding, flex-centered in 44px (~12px visual inset).
  assert.ok(
    btnMetrics.paddingTop <= 1 && btnMetrics.paddingBottom <= 1,
    `${scope}: refer button should flex-center like offer CTAs, not crush via vertical padding`,
  )
  assert.ok(btnMetrics.fontSize >= 14 && btnMetrics.fontSize <= 15, `${scope}: refer font ${btnMetrics.fontSize}`)
  assert.ok(
    btnMetrics.radius >= 7.5 && btnMetrics.radius <= 10,
    `${scope}: refer button radius ${btnMetrics.radius} (expected ~8)`,
  )
  assert.equal(await page.locator('[data-testid="browse-ask-question"]').count(), 0, `${scope}: ask`)
  assert.equal(await page.locator('[data-testid="browse-make-offer"]').count(), 0, `${scope}: offer`)
  assert.equal(await page.locator('[data-testid="browse-offer-gated"]').count(), 0, `${scope}: gated`)
  assert.equal(await page.locator('[data-testid="offer-gate-notice"]').count(), 0, `${scope}: notice`)
  assert.equal(await page.locator('[data-testid="request-offer-panel"]').count(), 0, `${scope}: offer panel`)
}

async function assertHelperChrome(page, scope, { verified }) {
  assert.equal(await page.locator('[data-testid="browse-refer-helper"]').count(), 0, `${scope}: refer`)
  assert.equal(await page.locator('[data-testid="browse-ask-question"]').count(), 1, `${scope}: ask`)
  if (verified) {
    assert.equal(await page.locator('[data-testid="browse-make-offer"]').count(), 1, `${scope}: offer`)
    assert.equal(await page.locator('[data-testid="browse-offer-gated"]').count(), 0, `${scope}: gated`)
  } else {
    assert.equal(await page.locator('[data-testid="browse-offer-gated"]').count(), 1, `${scope}: gated`)
    assert.equal(await page.locator('[data-testid="offer-gate-notice"]').count(), 1, `${scope}: notice`)
    assert.equal(await page.locator('[data-testid="browse-make-offer"]').count(), 0, `${scope}: offer`)
  }
}

async function assertTitleNoMidHyphenBreak(page, titleSelector, scope) {
  const ok = await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return { ok: false, reason: 'missing title' }
    const text = el.textContent || ''
    if (!text.includes('1') || !/bedroom/i.test(text)) {
      return { ok: false, reason: `unexpected title: ${text}` }
    }
    const nobreak = el.querySelector('.job-title-nobreak')
    if (!nobreak || !/1[\u2011-]bedroom/i.test(nobreak.textContent || '')) {
      return { ok: false, reason: 'missing nowrap compound span', text }
    }
    const style = getComputedStyle(nobreak)
    if (style.whiteSpace !== 'nowrap') {
      return { ok: false, reason: `nowrap missing: ${style.whiteSpace}`, text }
    }
    // Compound token must occupy a single line box.
    const range = document.createRange()
    range.selectNodeContents(nobreak)
    const tops = new Set(
      [...range.getClientRects()].map((r) => Math.round(r.top)),
    )
    return { ok: tops.size <= 1, tops: [...tops], text: nobreak.textContent }
  }, titleSelector)
  assert.equal(ok.ok, true, `${scope}: title mid-hyphen break ${JSON.stringify(ok)}`)
}

async function run() {
  const report = { checks: [], shots: [] }
  const browser = await chromium.launch()

  try {
    for (const vp of VIEWPORTS) {
      // --- Neighbor browse ---
      const neighborPage = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      })
      // Force clipboard-dialog path (no Web Share) and a working clipboard stub.
      await neighborPage.addInitScript(() => {
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: undefined,
        })
        const clipboard = {
          writeText: async () => undefined,
          readText: async () => '',
        }
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          get() {
            return clipboard
          },
        })
      })
      const jobId = await seedRole(neighborPage, 'neighbor')
      await neighborPage.goto(`${BASE}/browse?demo=1&job=${jobId}`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      if (vp.width >= 1000) {
        await neighborPage.waitForSelector('[data-testid="browse-job-detail"]', { timeout: 20000 })
        await assertNeighborChrome(neighborPage, `neighbor browse panel ${vp.name}`)
        await assertTitleNoMidHyphenBreak(
          neighborPage,
          '.browse-hc-detail-title',
          `neighbor panel title ${vp.name}`,
        )
        await neighborPage.locator('[data-testid="browse-refer-helper"]').scrollIntoViewIfNeeded()
        report.shots.push(await shot(neighborPage, `neighbor-browse-panel-${vp.name}.png`))
        const detail = neighborPage.locator('[data-testid="browse-job-detail"]')
        await detail.screenshot({
          path: join(OUT, `neighbor-browse-panel-detail-${vp.name}.png`),
        })
        await detail.screenshot({
          path: join(LOCAL, `neighbor-browse-panel-detail-${vp.name}.png`),
        })
        report.shots.push(`neighbor-browse-panel-detail-${vp.name}.png`)
      } else {
        await neighborPage.waitForSelector('[data-testid="browse-job-sheet"]', { timeout: 20000 })
        await assertNeighborChrome(neighborPage, `neighbor browse sheet ${vp.name}`)
        await assertTitleNoMidHyphenBreak(
          neighborPage,
          '[data-testid="browse-job-sheet"] h2',
          `neighbor sheet title ${vp.name}`,
        )
        report.shots.push(await shot(neighborPage, `neighbor-browse-sheet-${vp.name}.png`))
      }

      // Copy-link dialog (desktop neighbor once)
      if (vp.name === '1280x800') {
        await neighborPage.evaluate(() => {
          Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
          const clipboard = {
            writeText: async () => undefined,
            readText: async () => '',
          }
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            get() {
              return clipboard
            },
          })
        })
        await neighborPage.locator('[data-testid="browse-refer-helper"]').click()
        await neighborPage.waitForSelector('[data-testid="refer-helper-dialog"]')
        const linkVal = await neighborPage.locator('[data-testid="refer-helper-link"]').inputValue()
        assert.match(linkVal, new RegExp(`/requests/${jobId}$`))
        assert.match(
          await neighborPage.locator('[data-testid="refer-helper-dialog"]').innerText(),
          /Know someone who could help\? This job is open on BlockSide:/i,
        )
        await neighborPage.locator('[data-testid="refer-helper-copy"]').click()
        await neighborPage.waitForSelector('[data-testid="refer-helper-toast"]')
        assert.match(
          await neighborPage.locator('[data-testid="refer-helper-toast"]').innerText(),
          /Link copied/i,
        )
        report.shots.push(await shot(neighborPage, `neighbor-refer-copy-dialog-${vp.name}.png`))
        await neighborPage.locator('[data-testid="refer-helper-dialog-close"]').click()
        report.checks.push({ state: 'copy-dialog', ok: true })
      }

      // Neighbor /requests/[id]
      await neighborPage.goto(`${BASE}/requests/${jobId}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await neighborPage.waitForSelector('[data-testid="request-refer-panel"]', { timeout: 20000 })
      await assertNeighborChrome(neighborPage, `neighbor request ${vp.name}`)
      await assertTitleNoMidHyphenBreak(
        neighborPage,
        'h1.font-display',
        `neighbor request title ${vp.name}`,
      )
      await neighborPage.locator('[data-testid="browse-refer-helper"]').scrollIntoViewIfNeeded()
      report.shots.push(await shot(neighborPage, `neighbor-request-${vp.name}.png`))
      report.checks.push({ role: 'neighbor', viewport: vp.name, ok: true })
      await neighborPage.close()

      // --- Helper browse (unverified) ---
      const helperPage = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      })
      await seedRole(helperPage, 'helper')
      await helperPage.goto(`${BASE}/browse?demo=1&job=${jobId}`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await setVerification(helperPage, 'unverified')
      await helperPage.reload({ waitUntil: 'networkidle' })
      if (vp.width >= 1000) {
        await helperPage.waitForSelector('[data-testid="browse-job-detail"]', { timeout: 20000 })
        await assertHelperChrome(helperPage, `helper browse panel ${vp.name}`, { verified: false })
        report.shots.push(await shot(helperPage, `helper-browse-panel-${vp.name}.png`))
      } else {
        await helperPage.waitForSelector('[data-testid="browse-job-sheet"]', { timeout: 20000 })
        await assertHelperChrome(helperPage, `helper browse sheet ${vp.name}`, { verified: false })
        report.shots.push(await shot(helperPage, `helper-browse-sheet-${vp.name}.png`))
      }

      // Helper /requests/[id] verified path keeps Make an offer / Ask
      await setVerification(helperPage, 'approved')
      await helperPage.goto(`${BASE}/requests/${jobId}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await helperPage.waitForSelector('[data-testid="request-offer-panel"]', { timeout: 20000 })
      assert.equal(await helperPage.locator('[data-testid="browse-refer-helper"]').count(), 0)
      assert.equal(await helperPage.locator('[data-testid="request-refer-panel"]').count(), 0)
      assert.match(await helperPage.locator('[data-testid="request-offer-panel"]').innerText(), /Send an offer|Ask a question/i)
      report.shots.push(await shot(helperPage, `helper-request-${vp.name}.png`))
      report.checks.push({ role: 'helper', viewport: vp.name, ok: true })
      await helperPage.close()
    }

    writeFileSync(join(OUT, 'neighbor-refer-helper-qa.json'), JSON.stringify(report, null, 2))
    writeFileSync(join(LOCAL, 'neighbor-refer-helper-qa.json'), JSON.stringify(report, null, 2))
    console.log('neighbor-refer-helper-qa PASS')
    console.log(JSON.stringify(report, null, 2))
  } catch (err) {
    writeFileSync(
      join(OUT, 'neighbor-refer-helper-qa.json'),
      JSON.stringify({ ok: false, error: String(err), report }, null, 2),
    )
    console.error(err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

await run()
