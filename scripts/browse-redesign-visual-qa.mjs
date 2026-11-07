#!/usr/bin/env node
/**
 * Visual QA for Browse Jobs redesign — empty + populated across target viewports.
 * Screenshots → /opt/cursor/artifacts/browse-redesign-visual-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/browse-redesign-visual-qa'
const LOCAL = '/workspace/artifacts/browse-redesign-visual-qa'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1680x960', width: 1680, height: 960 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
]

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  await page.screenshot({ path: join(LOCAL, name), fullPage: false })
  console.log(`saved ${path}`)
  return path
}

async function warmDemo(page) {
  await page.goto(`${BASE}/browse`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => !!localStorage.getItem('beam-demo-v1'), null, {
    timeout: 20000,
  })
}

async function seedHelper(page, { emptyJobs }) {
  await warmDemo(page)
  await page.evaluate(
    ({ key, emptyJobs }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      state.people = (state.people || []).map((p) => {
        if (p.id !== me) return p
        return {
          ...p,
          accountRole: 'helper',
          isHelper: false,
          skills: [],
          name: p.name || 'Kuni',
          city: 'San Jose',
          stateCode: 'CA',
          locationLabel: 'San Jose, CA',
          // Reset coords so prior Milpitas customer fixtures don't zero the feed.
          lat: 37.3382,
          lng: -121.8863,
          onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
          safetyDisclaimerAcceptedAt:
            p.safetyDisclaimerAcceptedAt || new Date().toISOString(),
        }
      })
      if (emptyJobs) {
        state.requests = (state.requests || []).map((r) =>
          r.status === 'open' ? { ...r, status: 'cancelled' } : r,
        )
      } else {
        // Restore open jobs near the helper pin after prior empty-state seeds.
        let opened = 0
        state.requests = (state.requests || []).map((r) => {
          if (r.status === 'cancelled' || r.status === 'open') {
            opened += 1
            return {
              ...r,
              status: 'open',
              locationLabel: 'San Jose, CA',
              lat: 37.3382,
              lng: -121.8863,
            }
          }
          return r
        })
        if (opened === 0) {
          state.requests = [
            {
              id: 'req-visual-qa-1',
              title: 'Help move a couch upstairs',
              details: 'Need careful help with furniture.',
              category: 'moving',
              neighborhood: 'east-austin',
              when: 'asap',
              whenLabel: 'ASAP',
              budget: 85,
              status: 'open',
              requesterId: 'p-maya',
              image: '',
              createdAt: new Date().toISOString(),
              locationLabel: 'San Jose, CA',
              lat: 37.3382,
              lng: -121.8863,
              radiusMiles: 5,
              budgetType: 'fixed',
            },
            ...(state.requests || []),
          ]
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, emptyJobs },
  )
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="browse-3col-grid"]', { timeout: 15000 })
}

async function seedCustomer(page, { emptyJobs = false, emptyHelpers = false } = {}) {
  await warmDemo(page)
  await page.evaluate(
    ({ key, emptyJobs, emptyHelpers }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      state.people = (state.people || []).map((p) => {
        if (p.id === me) {
          return {
            ...p,
            accountRole: 'customer',
            isHelper: false,
            skills: [],
            city: p.city || 'San Jose',
            stateCode: p.stateCode || 'CA',
            locationLabel: p.locationLabel || 'San Jose, CA',
            onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
          }
        }
        if (emptyHelpers) {
          return {
            ...p,
            isHelper: false,
            skills: [],
            hourlyRate: 0,
          }
        }
        if (!(p.isHelper || (p.skills || []).length)) {
          p.isHelper = true
          p.skills = ['moving', 'cleaning']
          if (!(p.hourlyRate > 0)) p.hourlyRate = 35
        }
        return p
      })
      if (emptyJobs) {
        state.requests = (state.requests || []).map((r) =>
          r.status === 'open' ? { ...r, status: 'cancelled' } : r,
        )
      } else {
        let opened = 0
        state.requests = (state.requests || []).map((r) => {
          if (r.status === 'cancelled' || r.status === 'open') {
            opened += 1
            return { ...r, status: 'open' }
          }
          return r
        })
        if (opened === 0) {
          state.requests = [
            {
              id: 'req-visual-qa-customer-1',
              title: 'Help move a couch upstairs',
              details: 'Need careful help with furniture.',
              category: 'moving',
              neighborhood: 'east-austin',
              when: 'asap',
              whenLabel: 'ASAP',
              budget: 85,
              status: 'open',
              requesterId: 'p-maya',
              image: '',
              createdAt: new Date().toISOString(),
              locationLabel: 'San Jose, CA',
              lat: 37.3382,
              lng: -121.8863,
              radiusMiles: 5,
              budgetType: 'fixed',
            },
            ...(state.requests || []),
          ]
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, emptyJobs, emptyHelpers },
  )
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="browse-3col-grid"]')
}

async function seedCustomerPopulated(page) {
  await seedCustomer(page, { emptyJobs: false, emptyHelpers: false })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const summary = { ok: true, shots: [], checks: [] }

  try {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height })

      await seedHelper(page, { emptyJobs: true })
      await page.waitForSelector('[data-testid="browse-fresh-empty"]')
      assert.equal(
        await page.locator('[data-testid="browse-tab-local-helpers"]').count(),
        0,
        'helper empty: no Local helpers tab',
      )
      assert.equal(
        await page.locator('[data-testid="browse-radar"]').count(),
        0,
        'helper: no radar illustration',
      )
      assert.equal(
        await page.locator('[data-testid="browse-fresh-empty"]').getAttribute('data-empty-layout'),
        'copy-only',
      )
      assert.ok(await page.locator('[data-testid="browse-while-you-wait"]').count())
      assert.equal(
        await page.locator('[data-testid="browse-safety-strip"]').count(),
        0,
        'helper: Protected marketplace safety strip removed',
      )
      assert.equal(
        await page.locator('[data-testid="browse-view-toggle"]').count(),
        0,
        'helper: no List/Map toggle',
      )
      assert.equal(
        await page.locator('[data-testid="browse-map-view"]').count(),
        0,
        'helper: no map view',
      )
      assert.equal(
        await page.getByRole('button', { name: /^Map$/ }).count(),
        0,
        'helper: no Map button',
      )
      // No fabricated social proof
      const body = await page.locator('body').innerText()
      assert.doesNotMatch(body, /48 helpers|3x faster|live scanning/i)
      const emptyShot = await shot(page, `helper-empty-${vp.name}.png`)
      summary.shots.push(emptyShot)
      summary.checks.push({ state: 'helper-empty', viewport: vp.name, ok: true })

      await seedHelper(page, { emptyJobs: false })
      await page.waitForSelector('[data-testid="browse-feed-scroll"] a[href^="/requests/"]')
      assert.equal(
        await page.locator('[data-testid="browse-fresh-empty"]').count(),
        0,
        'populated: no empty panel',
      )
      assert.equal(await page.locator('[data-testid="browse-view-toggle"]').count(), 0)
      const populatedShot = await shot(page, `helper-populated-${vp.name}.png`)
      summary.shots.push(populatedShot)
      summary.checks.push({ state: 'helper-populated', viewport: vp.name, ok: true })
    }

    // Customer role — empty jobs: no radar / no map hole; discovery tabs present
    for (const vp of [
      { name: '1440x900', width: 1440, height: 900 },
      { name: '390x844', width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await seedCustomer(page, { emptyJobs: true })
      await page.waitForSelector('[data-testid="browse-fresh-empty"]')
      assert.ok(await page.locator('[data-testid="browse-mode-tabs"]').count())
      assert.equal(
        await page.locator('[data-testid="browse-radar"]').count(),
        0,
        `customer empty jobs: no radar @${vp.name}`,
      )
      assert.equal(
        await page.locator('[data-testid="browse-fresh-empty"]').getAttribute('data-empty-layout'),
        'copy-only',
      )
      assert.ok(await page.locator('[data-testid="browse-mode-tabs"]').count())
      assert.match(await page.locator('[data-testid="browse-fresh-empty"]').innerText(), /Be the first on Beam/)
      assert.equal(await page.locator('[data-testid="browse-view-toggle"]').count(), 0)
      assert.equal(await page.locator('[data-testid="browse-map-view"]').count(), 0)
      summary.shots.push(await shot(page, `customer-empty-jobs-${vp.name}.png`))
      summary.checks.push({ state: 'customer-empty-jobs-no-radar', viewport: vp.name, ok: true })
    }

    // Customer Local helpers tab empty — still no radar/map
    await page.setViewportSize({ width: 1440, height: 900 })
    await seedCustomer(page, { emptyJobs: false, emptyHelpers: true })
    await page.getByTestId('browse-tab-local-helpers').click()
    await page.waitForTimeout(400)
    assert.equal(await page.locator('[data-testid="browse-radar"]').count(), 0)
    assert.equal(await page.locator('[data-testid="browse-map-view"]').count(), 0)
    summary.shots.push(await shot(page, 'customer-empty-helpers-1440x900.png'))
    summary.checks.push({ state: 'customer-empty-helpers-no-radar', ok: true })

    // Desktop customer discovery retention (populated, no map affordance)
    await seedCustomerPopulated(page)
    assert.ok(await page.locator('[data-testid="browse-mode-tabs"]').count())
    assert.ok(await page.locator('[data-testid="browse-trending-helpers"]').count())
    assert.equal(
      await page.locator('[data-testid="browse-view-toggle"]').count(),
      0,
      'customer: no List/Map toggle',
    )
    assert.equal(await page.locator('[data-testid="browse-radar"]').count(), 0)
    assert.equal(await page.locator('[data-testid="browse-map-view"]').count(), 0)
    summary.shots.push(await shot(page, 'customer-list-1440x900.png'))
    summary.checks.push({ state: 'customer-no-map', ok: true })

    // REAL fresh-customer shape after auth signup + complete_onboarding(customer)
    // (Milpitas matches the live bug screenshot locale).
    await warmDemo(page)
    await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      const now = new Date().toISOString()
      state.people = (state.people || []).map((p) => {
        if (p.id !== me) {
          if (!(p.isHelper || (p.skills || []).length)) {
            p.isHelper = true
            p.skills = ['moving', 'cleaning']
            p.hourlyRate = p.hourlyRate || 35
          }
          return p
        }
        // Exact post-onboarding customer profile shape from live RPC mapping.
        return {
          id: me,
          name: p.name || 'Neighbor',
          avatar: p.avatar || '',
          bio: '',
          neighborhood: '',
          skills: [],
          hourlyRate: 0,
          availability: [],
          rating: 0,
          reviewCount: 0,
          jobsCompleted: 0,
          isCurrentUser: true,
          locationLabel: 'Milpitas, CA',
          lat: 37.4283,
          lng: -121.9066,
          serviceRadiusMiles: 5,
          rateType: 'hourly',
          availableNow: false,
          isHelper: false,
          accountRole: 'customer',
          city: 'Milpitas',
          stateCode: 'CA',
          cityGeoid: null,
          onboardingCompletedAt: now,
          safetyDisclaimerAcceptedAt: now,
          safetyDisclaimerVersion: 'v1',
        }
      })
      state.requests = (state.requests || []).map((r) =>
        r.status === 'open' ? { ...r, status: 'cancelled' } : r,
      )
      localStorage.setItem(key, JSON.stringify(state))
    }, STORAGE_KEY)
    // Cold load (new document) — not just in-page mutate.
    await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('[data-testid="browse-fresh-empty"]')
    assert.ok(await page.locator('[data-testid="browse-mode-tabs"]').count(), 'fresh customer keeps discovery tabs')
    assert.ok(await page.locator('[data-testid="browse-tab-local-helpers"]').count())
    assert.equal(await page.locator('[data-testid="browse-radar"]').count(), 0)
    assert.equal(await page.locator('[data-testid="browse-map-view"]').count(), 0)
    assert.equal(
      await page.locator('[data-testid="browse-fresh-empty"]').getAttribute('data-empty-layout'),
      'copy-only',
    )
    assert.match(await page.locator('[data-testid="browse-fresh-empty"]').innerText(), /Be the first on Beam/)
    assert.doesNotMatch(
      await page.locator('[data-testid="browse-fresh-empty"]').innerText(),
      /No open jobs nearby|Near Milpitas/,
    )
    assert.match(await page.locator('body').innerText(), /Milpitas/)
    summary.shots.push(await shot(page, 'fresh-customer-milpitas-empty-1440x900.png'))
    summary.checks.push({ state: 'fresh-customer-milpitas-no-radar', ok: true })

    // Mobile cold load of same fresh customer
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('[data-testid="browse-fresh-empty"]')
    assert.equal(await page.locator('[data-testid="browse-radar"]').count(), 0)
    assert.ok(await page.locator('[data-testid="browse-mode-tabs"]').count())
    summary.shots.push(await shot(page, 'fresh-customer-milpitas-empty-390x844.png'))
    summary.checks.push({ state: 'fresh-customer-milpitas-mobile', ok: true })

    // Null/undefined accountRole during hydration must NOT enter helper-only chrome.
    await page.setViewportSize({ width: 1440, height: 900 })
    await warmDemo(page)
    await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      state.people = (state.people || []).map((p) => {
        if (p.id !== me) return p
        return {
          ...p,
          accountRole: null,
          isHelper: false,
          skills: [],
          hourlyRate: 0,
          city: 'Milpitas',
          stateCode: 'CA',
          locationLabel: 'Milpitas, CA',
          onboardingCompletedAt: new Date().toISOString(),
          safetyDisclaimerAcceptedAt: new Date().toISOString(),
        }
      })
      state.requests = (state.requests || []).map((r) =>
        r.status === 'open' ? { ...r, status: 'cancelled' } : r,
      )
      localStorage.setItem(key, JSON.stringify(state))
    }, STORAGE_KEY)
    await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('[data-testid="browse-3col-grid"]')
    // storage migrate may promote legacy helper-shaped rows; force null-role
    // after hydrate by re-writing without skills/isHelper and bypassing migrate
    // path via explicit null + empty skills already set above.
    const layout = await page.locator('[data-testid="browse-3col-grid"]').getAttribute('data-browse-layout')
    assert.equal(layout, 'discovery', `null-role layout should be discovery (got ${layout})`)
    assert.ok(await page.locator('[data-testid="browse-mode-tabs"]').count())
    assert.equal(await page.locator('[data-testid="browse-radar"]').count(), 0)
    summary.shots.push(await shot(page, 'null-role-keeps-discovery-1440x900.png'))
    summary.checks.push({ state: 'null-role-keeps-discovery', ok: true })

    // Legacy ?view=map deep links fall back to list for helper + customer
    await seedHelper(page, { emptyJobs: false })
    await page.goto(`${BASE}/browse?view=map&radius=10`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForSelector('[data-testid="browse-feed-scroll"] a[href^="/requests/"]')
    await page.waitForFunction(() => !new URL(location.href).searchParams.has('view'), null, {
      timeout: 10000,
    })
    assert.match(page.url(), /radius=10/)
    assert.doesNotMatch(page.url(), /view=/)
    assert.equal(await page.locator('[data-testid="browse-map-view"]').count(), 0)
    summary.checks.push({ state: 'helper-view-map-fallback', ok: true })

    await seedCustomerPopulated(page)
    await page.goto(`${BASE}/browse?view=map&tab=people`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForSelector('[data-testid="browse-mode-tabs"]')
    await page.waitForFunction(() => !new URL(location.href).searchParams.has('view'), null, {
      timeout: 10000,
    })
    assert.match(page.url(), /tab=people/)
    assert.doesNotMatch(page.url(), /view=/)
    assert.equal(await page.locator('[data-testid="browse-map-view"]').count(), 0)
    summary.checks.push({ state: 'customer-view-map-fallback', ok: true })
    summary.shots.push(await shot(page, 'customer-view-map-fallback-1440x900.png'))

    // Filter empty vs fresh empty distinction
    await seedHelper(page, { emptyJobs: false })
    await page.getByRole('button', { name: 'Moving & lifting' }).first().click()
    await page.waitForTimeout(300)
    // Force no matches by searching nonsense
    await page.getByLabel('Search browse').fill('zzzz-no-match-zzzz')
    await page.waitForSelector('[data-testid="browse-reset-filters"]', { timeout: 10000 })
    const filteredText = await page.locator('[data-testid="browse-feed-scroll"]').innerText()
    assert.match(filteredText, /No open requests match/i)
    assert.equal(await page.locator('[data-testid="browse-fresh-empty"]').count(), 0)
    summary.shots.push(await shot(page, 'helper-filtered-empty-1440x900.png'))
    summary.checks.push({ state: 'filtered-empty', ok: true })

    // Alerts toggle persists
    await seedHelper(page, { emptyJobs: true })
    await page.getByTestId('browse-alerts-toggle').click()
    const alertsOn = await page.evaluate(
      () => JSON.parse(localStorage.getItem('beam-job-alerts-v1') || '{}').enabled === true,
    )
    assert.equal(alertsOn, true, 'alerts preference persisted')
    await page.getByTestId('browse-widen-radius').click()
    await page.waitForTimeout(400)
    assert.match(page.url(), /radius=25/)

    // Keyboard focus on command bar
    await page.getByLabel('Search browse').focus()
    const tag = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
    assert.equal(tag, 'Search browse')

    writeFileSync(join(OUT, 'browse-redesign-visual-qa.json'), JSON.stringify(summary, null, 2))
    writeFileSync(join(LOCAL, 'browse-redesign-visual-qa.json'), JSON.stringify(summary, null, 2))
    console.log('browse-redesign visual QA passed')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
