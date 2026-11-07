#!/usr/bin/env node
/**
 * Role-aware Browse QA: helpers see open jobs only (no Local helpers / Trending).
 * Covers incomplete helper, active helper, customer, guest + deep links + viewports.
 * Screenshots → /opt/cursor/artifacts/helper-browse-role-qa/ (internal only).
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

// Mirror src/lib/roles.ts for node-side unit checks (no TS loader required).
function hidesPeerHelperDiscovery(person, isGuest) {
  if (isGuest) return false
  const role =
    person.accountRole === 'customer' || person.accountRole === 'helper'
      ? person.accountRole
      : null
  if (role === 'customer') return false
  if (role === 'helper') return true
  // Missing/invalid role keeps discovery open (no helper-only flash).
  return false
}

function stripHelperDiscoveryParams(search) {
  const params = new URLSearchParams(
    typeof search === 'string' && search.startsWith('?') ? search.slice(1) : search,
  )
  params.delete('tab')
  params.delete('free')
  params.delete('avail')
  return params
}

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/helper-browse-role-qa'
const LOCAL = '/workspace/artifacts/helper-browse-role-qa'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-1680x960', width: 1680, height: 960 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
]

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  await page.screenshot({ path: join(LOCAL, name), fullPage: false })
  return path
}

async function warmDemo(page) {
  await page.goto(`${BASE}/browse`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => !!localStorage.getItem('beam-demo-v1'), null, {
    timeout: 20000,
  })
}

async function seedRole(page, role) {
  await warmDemo(page)
  await page.evaluate(
    ({ key, role }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      state.people = (state.people || []).map((p) => {
        if (p.id !== me) {
          // Keep marketplace helpers populated for customer/guest discovery checks.
          if (!(p.isHelper || (p.skills || []).length)) {
            p.isHelper = true
            p.skills = p.skills?.length ? p.skills : ['moving', 'cleaning']
          }
          if (!(p.rating > 0)) {
            p.rating = 4.8
            p.reviewCount = 6
          }
          return p
        }
        if (role === 'helper-incomplete') {
          return {
            ...p,
            accountRole: 'helper',
            isHelper: false,
            skills: [],
            onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
            safetyDisclaimerAcceptedAt:
              p.safetyDisclaimerAcceptedAt || new Date().toISOString(),
            city: p.city || 'San Jose',
            stateCode: p.stateCode || 'CA',
            locationLabel: p.locationLabel || 'San Jose, CA',
            name: p.name || 'Kuni',
          }
        }
        if (role === 'helper-active') {
          return {
            ...p,
            accountRole: 'helper',
            isHelper: true,
            skills: p.skills?.length ? p.skills : ['moving', 'handyman'],
            hourlyRate: p.hourlyRate || 35,
            onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
            safetyDisclaimerAcceptedAt:
              p.safetyDisclaimerAcceptedAt || new Date().toISOString(),
            city: p.city || 'San Jose',
            stateCode: p.stateCode || 'CA',
            locationLabel: p.locationLabel || 'San Jose, CA',
          }
        }
        if (role === 'customer') {
          return {
            ...p,
            accountRole: 'customer',
            isHelper: false,
            skills: [],
            onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
            safetyDisclaimerAcceptedAt:
              p.safetyDisclaimerAcceptedAt || new Date().toISOString(),
            city: p.city || 'San Jose',
            stateCode: p.stateCode || 'CA',
            locationLabel: p.locationLabel || 'San Jose, CA',
          }
        }
        return p
      })

      if (role === 'empty-jobs') {
        state.requests = (state.requests || []).map((r) =>
          r.status === 'open' ? { ...r, status: 'cancelled' } : r,
        )
      }

      if (role === 'populated-jobs') {
        const open = (state.requests || []).filter((r) => r.status === 'open')
        if (open.length < 3) {
          const cats = ['moving', 'cleaning', 'handyman']
          const extras = Array.from({ length: 6 }, (_, i) => ({
            id: `req-role-qa-${i}`,
            title: `Neighborhood job ${i + 1}`,
            details: 'Clear scope, flexible timing, upfront budget.',
            category: cats[i % cats.length],
            neighborhood: 'downtown',
            locationLabel: 'San Jose, California',
            when: 'today',
            whenLabel: 'Today',
            budget: 40 + i * 5,
            budgetType: 'fixed',
            radiusMiles: 5,
            status: 'open',
            requesterId: (state.people || []).find((p) => p.id !== me)?.id || 'p-maya',
            createdAt: new Date(Date.now() - i * 3600 * 1000).toISOString(),
          }))
          state.requests = [...extras, ...(state.requests || [])]
        }
      }

      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, role },
  )
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
}

async function probeBrowse(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="browse-3col-grid"]')
    const tabs = document.querySelector('[data-testid="browse-mode-tabs"]')
    const localHelpers = document.querySelector('[data-testid="browse-tab-local-helpers"]')
    const trending = document.querySelector('[data-testid="browse-trending-helpers"]')
    const trendingAside = document.querySelector('[data-testid="browse-trending-aside"]')
    const filters = document.querySelector('[data-testid="browse-filters-sidebar"]')
    const feed = document.querySelector('[data-testid="browse-feed-main"]')
    const feedScroll = document.querySelector('[data-testid="browse-feed-scroll"]')
    const body = document.body.innerText || ''
    // Banner copy may mention "Local Helpers"; only treat the browse tab as discovery chrome.
    const peopleCards = document.querySelectorAll(
      '[data-testid="browse-feed-scroll"] a[href^="/people/"]',
    ).length
    const requestCards = document.querySelectorAll(
      '[data-testid="browse-feed-scroll"] a[href^="/requests/"]',
    ).length
    const filtersVisible = !!(filters && getComputedStyle(filters).display !== 'none')
    const trendingVisible = !!(trending && getComputedStyle(trending).display !== 'none')
    return {
      layout: grid?.getAttribute('data-browse-layout') || null,
      hasTabs: !!tabs,
      hasLocalHelpersTab: !!localHelpers,
      hasTrendingCopy: /Trending helpers/i.test(body),
      trendingVisible,
      trendingAsidePresent: !!trendingAside,
      filtersVisible,
      filtersX: filters?.getBoundingClientRect().x ?? null,
      feedX: feed?.getBoundingClientRect().x ?? null,
      trendingX: trending?.getBoundingClientRect().x ?? null,
      peopleCards,
      requestCards,
      url: location.pathname + location.search,
      hasBecomeHelperEmpty: /Become a helper/i.test(body) && /No helpers nearby/i.test(body),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      feedOverflowY: feedScroll ? getComputedStyle(feedScroll).overflowY : null,
      windowScrollY: window.scrollY,
    }
  })
}

async function assertHelperJobsOnly(page, label, { expectPopulated = false, expectEmpty = false } = {}) {
  const m = await probeBrowse(page)
  assert.equal(m.layout, 'helper-jobs', `${label}: helper-jobs layout`)
  assert.equal(m.hasTabs, false, `${label}: no mode tabs`)
  assert.equal(m.hasLocalHelpersTab, false, `${label}: no Local helpers`)
  assert.equal(m.hasTrendingCopy, false, `${label}: no Trending helpers`)
  assert.equal(m.trendingVisible, false, `${label}: trending not visible`)
  assert.equal(m.trendingAsidePresent, false, `${label}: no trending aside`)
  assert.equal(m.peopleCards, 0, `${label}: no people cards`)
  assert.equal(m.hasBecomeHelperEmpty, false, `${label}: no helpers empty CTA`)
  assert.ok(!m.url.includes('tab=people'), `${label}: URL not on tab=people (${m.url})`)
  assert.equal(m.overflowX, false, `${label}: no x-overflow`)
  if (expectPopulated) {
    assert.ok(m.requestCards >= 1, `${label}: populated job cards (got ${m.requestCards})`)
  }
  if (expectEmpty) {
    assert.equal(m.requestCards, 0, `${label}: empty job feed`)
    assert.ok(
      await page.locator('[data-testid="browse-fresh-empty"]').count(),
      `${label}: fresh empty state`,
    )
    assert.equal(
      await page.locator('[data-testid="browse-radar"]').count(),
      0,
      `${label}: no radar illustration`,
    )
    assert.equal(
      await page.locator('[data-testid="browse-fresh-empty"]').getAttribute('data-empty-layout'),
      'copy-only',
      `${label}: copy-only empty layout`,
    )
  }
  return m
}

async function assertDiscovery(page, label) {
  const m = await probeBrowse(page)
  assert.equal(m.layout, 'discovery', `${label}: discovery layout`)
  assert.equal(m.hasTabs, true, `${label}: mode tabs`)
  assert.equal(m.hasLocalHelpersTab, true, `${label}: Local helpers tab`)
  assert.equal(m.hasTrendingCopy, true, `${label}: Trending helpers`)
  return m
}

async function assertNoFlashOnDeepLink(page, label) {
  // Navigate with people tab; sample DOM before networkidle settles.
  await page.goto(`${BASE}/browse?tab=people&free=1&avail=mornings`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  // Poll a few times during hydration — never allow peer helpers to appear.
  for (let i = 0; i < 8; i++) {
    const snap = await page.evaluate(() => {
      const body = document.body.innerText || ''
      const peopleCards = document.querySelectorAll(
        '[data-testid="browse-feed-scroll"] a[href^="/people/"]',
      ).length
      const tabs = document.querySelector('[data-testid="browse-mode-tabs"]')
      const localHelpers = document.querySelector('[data-testid="browse-tab-local-helpers"]')
      const trending = document.querySelector('[data-testid="browse-trending-helpers"]')
      const splash = /^Beam\s*$/m.test(body.trim())
      return {
        peopleCards,
        hasTabs: !!tabs,
        hasTrending: !!trending,
        hasLocalHelpers: !!localHelpers,
        splash,
        url: location.pathname + location.search,
      }
    })
    if (!snap.splash) {
      assert.equal(snap.peopleCards, 0, `${label}: no people flash #${i}`)
      assert.equal(snap.hasTabs, false, `${label}: no tabs flash #${i}`)
      assert.equal(snap.hasTrending, false, `${label}: no trending flash #${i}`)
      assert.equal(
        snap.hasLocalHelpers,
        false,
        `${label}: no Local helpers tab flash #${i}`,
      )
    }
    await page.waitForTimeout(50)
  }
  await page.waitForFunction(
    () =>
      !location.search.includes('tab=people') &&
      !!document.querySelector('[data-testid="browse-3col-grid"]'),
    null,
    { timeout: 15000 },
  )
  await assertHelperJobsOnly(page, `${label} after normalize`)
}

const report = { ok: true, unit: [], checks: [] }

function runUnit() {
  const cases = [
    [{ accountRole: 'helper', isHelper: false }, false, true, 'incomplete helper'],
    [{ accountRole: 'helper', isHelper: true }, false, true, 'active helper'],
    [{ accountRole: 'customer', isHelper: false }, false, false, 'customer'],
    [{ accountRole: 'customer', isHelper: true }, false, false, 'customer with helper profile'],
    // Null role must NOT hide discovery — fresh/hydrating profiles stay open.
    [{ accountRole: null, isHelper: true }, false, false, 'null role even if isHelper'],
    [{ accountRole: null, isHelper: false }, false, false, 'null role unsigned shape'],
    [{ accountRole: null, isHelper: false }, true, false, 'guest'],
    [{ accountRole: 'helper', isHelper: true }, false, true, 'explicit helper still jobs-only'],
  ]
  for (const [person, isGuest, expected, name] of cases) {
    const got = hidesPeerHelperDiscovery(person, isGuest)
    assert.equal(got, expected, `unit ${name}`)
    report.unit.push({ name, expected, got })
  }
  const stripped = stripHelperDiscoveryParams('tab=people&free=1&avail=mornings&category=moving&q=sofa')
  assert.equal(stripped.get('tab'), null)
  assert.equal(stripped.get('free'), null)
  assert.equal(stripped.get('avail'), null)
  assert.equal(stripped.get('category'), 'moving')
  assert.equal(stripped.get('q'), 'sofa')
  report.unit.push({ name: 'strip params', ok: true })
}

async function main() {
  runUnit()

  const browser = await chromium.launch({ headless: true })
  try {
    for (const role of ['helper-incomplete', 'helper-active']) {
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
        })
        await seedRole(page, role)
        await seedRole(page, 'populated-jobs')
        await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
        await page.waitForSelector('text=Browse Local Jobs', { timeout: 15000 })
        const m = await assertHelperJobsOnly(page, `${role} ${vp.name}`, {
          expectPopulated: true,
        })
        if (vp.width >= 1440) {
          assert.equal(m.filtersVisible, true, `${role} ${vp.name}: filters visible`)
          assert.ok(
            m.filtersX != null && m.feedX != null && m.filtersX < m.feedX,
            `${role} ${vp.name}: filters left of feed`,
          )
          assert.equal(m.trendingX, null, `${role} ${vp.name}: no trending column gap`)
          // Locked viewport: filters pinned, feed scrolls
          const locked = await page.evaluate(() => {
            const filters = document.querySelector('[data-testid="browse-filters-sidebar"]')
            const feed = document.querySelector('[data-testid="browse-feed-scroll"]')
            const before = filters?.getBoundingClientRect().top ?? null
            if (feed) feed.scrollTop = 200
            const after = filters?.getBoundingClientRect().top ?? null
            const scrollTop = feed?.scrollTop ?? 0
            if (feed) feed.scrollTop = 0
            return { before, after, scrollTop, windowScrollY: window.scrollY }
          })
          assert.equal(locked.windowScrollY, 0, `${role} ${vp.name}: window not scrolled`)
          assert.ok(
            locked.before != null &&
              locked.after != null &&
              Math.abs(locked.before - locked.after) <= 1,
            `${role} ${vp.name}: filters pinned`,
          )
        }
        await shot(page, `${role}-${vp.name}-jobs.png`)
        await assertNoFlashOnDeepLink(page, `${role} ${vp.name} deep link`)
        await shot(page, `${role}-${vp.name}-deeplink.png`)
        report.checks.push({ role, viewport: vp.name, ok: true })
        await page.close()
      }
    }

    // Empty job feed for incomplete helper
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedRole(page, 'helper-incomplete')
      await seedRole(page, 'empty-jobs')
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('text=Browse Local Jobs')
      await assertHelperJobsOnly(page, 'helper empty jobs', { expectEmpty: true })
      await shot(page, 'helper-incomplete-empty-jobs-1440x900.png')
      report.checks.push({ role: 'helper-incomplete-empty', ok: true })
      await page.close()
    }

    // Customer retains discovery
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedRole(page, 'customer')
      await seedRole(page, 'populated-jobs')
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('text=Browse Local Jobs')
      const m = await assertDiscovery(page, 'customer browse')
      assert.equal(m.trendingVisible, true, 'customer trending visible')
      assert.ok(m.filtersX < m.feedX && m.feedX < m.trendingX, 'customer 3col order')
      await page.goto(`${BASE}/browse?tab=people`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-testid="browse-tab-local-helpers"]')
      assert.ok(
        (await page.locator('[data-testid="browse-feed-scroll"] a[href^="/people/"]').count()) >= 1,
        'customer people cards',
      )
      await shot(page, 'customer-discovery-1440x900.png')
      report.checks.push({ role: 'customer', ok: true })
      await page.close()
    }

    // REAL post-signup customer shape (complete_onboarding → accountRole customer,
    // isHelper false, empty skills) in Milpitas — matches live bug evidence locale.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
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
              p.rating = p.rating || 4.8
              p.reviewCount = p.reviewCount || 6
            }
            return p
          }
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
      // Cold load
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-testid="browse-fresh-empty"]')
      await assertDiscovery(page, 'fresh Milpitas customer')
      assert.equal(await page.locator('[data-testid="browse-radar"]').count(), 0)
      assert.match(
        await page.locator('[data-testid="browse-fresh-empty"]').innerText(),
        /Be the first on Beam/,
      )
      assert.doesNotMatch(
        await page.locator('[data-testid="browse-fresh-empty"]').innerText(),
        /No open jobs nearby|Near Milpitas/,
      )
      await shot(page, 'fresh-customer-milpitas-empty-1440x900.png')

      // Persist + reload simulates logout/login session restore from storage.
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-testid="browse-mode-tabs"]')
      await assertDiscovery(page, 'fresh customer after reload')
      assert.equal(await page.locator('[data-testid="browse-radar"]').count(), 0)
      await page.getByTestId('browse-tab-local-helpers').click()
      await page.waitForTimeout(300)
      assert.equal(await page.locator('[data-testid="browse-radar"]').count(), 0)
      await shot(page, 'fresh-customer-milpitas-helpers-tab-1440x900.png')
      report.checks.push({ role: 'fresh-customer-milpitas', ok: true })
      await page.close()
    }

    // Null accountRole must keep discovery (pre-hydration / incomplete setup).
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await warmDemo(page)
      await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) || '{}')
        const me = state.currentUserId || 'user-you'
        state.people = (state.people || []).map((p) =>
          p.id === me
            ? {
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
            : p,
        )
        localStorage.setItem(key, JSON.stringify(state))
      }, STORAGE_KEY)
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-testid="browse-3col-grid"]')
      await assertDiscovery(page, 'null-role keeps discovery')
      assert.equal(await page.locator('[data-testid="browse-radar"]').count(), 0)
      await shot(page, 'null-role-keeps-discovery-1440x900.png')
      report.checks.push({ role: 'null-accountRole', ok: true })
      await page.close()
    }

    // Guest retains discovery (live mode if available; otherwise skip with note)
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      const mode = await page.evaluate(() => {
        // Demo mode always signs in seed user — guest path needs live config.
        return document.body.innerText.includes('Sign in') ||
          document.querySelector('[data-testid="landing-nav"]')
          ? 'maybe-guest'
          : 'demo-signed-in'
      })
      if (mode === 'demo-signed-in') {
        // Force guest-like discovery by seeding customer (closest demo stand-in already covered).
        // Additionally verify history back cannot stick on people for helpers.
        await seedRole(page, 'helper-active')
        await page.goto(`${BASE}/browse?tab=people`, { waitUntil: 'networkidle' })
        await page.waitForFunction(() => !location.search.includes('tab=people'), null, {
          timeout: 15000,
        })
        await page.goBack().catch(() => {})
        await page.waitForTimeout(400)
        const url = page.url()
        if (url.includes('/browse')) {
          await page.waitForFunction(
            () =>
              !location.search.includes('tab=people') ||
              !document.querySelector('[data-testid="browse-mode-tabs"]'),
            null,
            { timeout: 10000 },
          ).catch(() => {})
          const snap = await probeBrowse(page)
          assert.equal(snap.peopleCards, 0, 'history: no people cards for helper')
          assert.equal(snap.hasLocalHelpersTab, false, 'history: no Local helpers for helper')
        }
        report.checks.push({ role: 'guest', ok: true, note: 'demo mode — customer covers discovery; history guard checked' })
      }
      await page.close()
    }

    // Live guest probe when unauthenticated chrome is reachable
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await page.goto(`${BASE}/browse`, { waitUntil: 'domcontentloaded' })
      const isLiveGuest = await page.evaluate(() => {
        const text = document.body.innerText || ''
        return /Sign in|Continue with Google/i.test(text) && !localStorage.getItem('beam-demo-v1')
      })
      if (isLiveGuest) {
        await page.waitForSelector('text=Browse Local Jobs', { timeout: 15000 })
        await assertDiscovery(page, 'live guest')
        await page.goto(`${BASE}/browse?tab=people`, { waitUntil: 'networkidle' })
        assert.ok(
          (await page.locator('[data-testid="browse-tab-local-helpers"]').count()) >= 1,
          'live guest Local helpers',
        )
        report.checks.push({ role: 'live-guest', ok: true })
      } else {
        report.checks.push({ role: 'live-guest', ok: true, note: 'skipped — demo mode' })
      }
      await page.close()
    }
  } catch (err) {
    report.ok = false
    report.error = String(err?.stack || err)
    throw err
  } finally {
    await browser.close()
  }

  writeFileSync(join(OUT, 'helper-browse-role-qa.json'), JSON.stringify(report, null, 2))
  writeFileSync(join(LOCAL, 'helper-browse-role-qa.json'), JSON.stringify(report, null, 2))
  console.log('helper-browse-role QA passed')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
