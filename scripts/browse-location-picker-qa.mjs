#!/usr/bin/env node
/**
 * Browse location picker QA:
 * - topnav location opens picker (does NOT navigate to /you)
 * - choosing another city updates eyebrow + filters results by distance
 * - preference persists across reload; does not mutate profile city
 * - cancel / validation errors
 * - helper jobs-only + customer discovery still intact
 * Screenshots → /opt/cursor/artifacts/browse-location-picker-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/browse-location-picker-qa'
const LOCAL = '/workspace/artifacts/browse-location-picker-qa'
const STORAGE_KEY = 'beam-demo-v1'
const BROWSE_LOC_KEY = 'beam-browse-location-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  await page.screenshot({ path: join(LOCAL, name), fullPage: false })
  console.log('saved', path)
  return path
}

async function warmDemo(page) {
  await page.goto(`${BASE}/browse`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => !!localStorage.getItem('beam-demo-v1'), null, {
    timeout: 20000,
  })
}

async function seedCustomerAustin(page) {
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
    // Ensure nearby open jobs around Austin
    let opened = 0
    state.requests = (state.requests || []).map((r) => {
      if (r.status === 'cancelled' || r.status === 'open') {
        opened += 1
        return {
          ...r,
          status: 'open',
          locationLabel: r.locationLabel || 'East Austin, TX',
          lat: r.lat ?? 30.2672,
          lng: r.lng ?? -97.7205,
        }
      }
      return r
    })
    if (opened === 0) {
      state.requests = [
        {
          id: 'req-loc-qa-1',
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
          locationLabel: 'East Austin, TX',
          lat: 30.2672,
          lng: -97.7205,
          radiusMiles: 5,
          budgetType: 'fixed',
        },
        ...(state.requests || []),
      ]
    }
    localStorage.removeItem('beam-browse-location-v1')
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.goto(`${BASE}/browse?radius=10`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="browse-3col-grid"]')
}

async function seedHelper(page) {
  await warmDemo(page)
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    state.people = (state.people || []).map((p) =>
      p.id === me
        ? {
            ...p,
            accountRole: 'helper',
            isHelper: true,
            skills: ['moving'],
            hourlyRate: 35,
            city: 'Austin',
            stateCode: 'TX',
            locationLabel: 'East Austin, TX',
            lat: 30.2672,
            lng: -97.7205,
            onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
          }
        : p,
    )
    localStorage.removeItem('beam-browse-location-v1')
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
}

async function pickCity(page, query, labelSubstring) {
  await page.waitForSelector('[data-testid="browse-location-dialog"]')
  // If verified chip showing, click Change
  const change = page.getByRole('button', { name: 'Change city' })
  if (await change.count()) await change.click()
  const input = page.getByTestId('onboarding-city-input')
  await input.waitFor({ state: 'visible', timeout: 15000 })
  await input.fill(query)
  await page.waitForTimeout(200)
  const option = page.locator('[role="option"]').filter({ hasText: labelSubstring }).first()
  await option.waitFor({ state: 'visible', timeout: 10000 })
  await option.click()
  await page.getByTestId('browse-location-apply').click()
  await page.waitForSelector('[data-testid="browse-location-dialog"]', {
    state: 'detached',
    timeout: 10000,
  })
}

const report = { ok: true, checks: [], shots: [] }

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    // Desktop customer: click location → picker, not /you
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedCustomerAustin(page)
      const beforeUrl = page.url()
      assert.match(beforeUrl, /\/browse/)
      assert.ok(await page.getByTestId('browse-mode-tabs').count(), 'customer discovery')

      await page.getByTestId('topnav-location').click()
      await page.waitForSelector('[data-testid="browse-location-dialog"]')
      assert.equal(new URL(page.url()).pathname, '/browse', 'still on browse — not /you')
      assert.doesNotMatch(page.url(), /\/you/)
      report.shots.push(await shot(page, 'desktop-customer-picker-open.png'))

      // Cancel closes without changing preference
      await page.getByTestId('browse-location-cancel').click()
      await page.waitForSelector('[data-testid="browse-location-dialog"]', { state: 'detached' })
      const prefAfterCancel = await page.evaluate((k) => localStorage.getItem(k), BROWSE_LOC_KEY)
      assert.equal(prefAfterCancel, null, 'cancel leaves preference unset')

      // Re-open via topnav + validation error
      await page.getByTestId('topnav-location').click()
      await page.waitForSelector('[data-testid="browse-location-dialog"]')
      const change = page.getByRole('button', { name: 'Change city' })
      if (await change.count()) await change.click()
      await page.getByTestId('onboarding-city-input').fill('')
      await page.getByTestId('browse-location-apply').click()
      await page.waitForSelector('[data-testid="browse-location-error"]')
      assert.match(
        await page.getByTestId('browse-location-error').innerText(),
        /Select a US city/i,
      )
      report.shots.push(await shot(page, 'desktop-customer-validation-error.png'))
      await page.getByTestId('browse-location-close').click()

      // Change to Milpitas — Austin jobs should fall outside 10mi
      const cardsBefore = await page
        .locator('[data-testid="browse-feed-scroll"] a[href^="/requests/"]')
        .count()
      assert.ok(cardsBefore >= 1, `expected Austin jobs before (got ${cardsBefore})`)

      await page.getByTestId('topnav-location').click()
      await pickCity(page, 'Milpitas', 'Milpitas')
      await page.waitForTimeout(400)

      assert.equal(await page.locator('[data-testid="browse-location-eyebrow"]').count(), 0)
      const topnav = await page.getByTestId('topnav-location').innerText()
      assert.match(topnav, /Milpitas/i)

      const cardsAfter = await page
        .locator('[data-testid="browse-feed-scroll"] a[href^="/requests/"]')
        .count()
      assert.equal(cardsAfter, 0, 'Milpitas + 10mi should hide Austin jobs')
      // radius=10 is an active filter → filtered empty (not fresh-marketplace empty)
      assert.match(
        await page.locator('[data-testid="browse-feed-scroll"]').innerText(),
        /No open requests match/i,
      )
      assert.ok(await page.getByTestId('browse-mode-tabs').count(), 'still customer discovery')

      const profileCity = await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) || '{}')
        const me = state.people.find((p) => p.id === state.currentUserId)
        return { city: me?.city, label: me?.locationLabel, pref: localStorage.getItem('beam-browse-location-v1') }
      }, STORAGE_KEY)
      assert.equal(profileCity.city, 'Austin', 'profile city unchanged')
      assert.match(profileCity.label || '', /Austin/i)
      assert.ok(profileCity.pref && /Milpitas/.test(profileCity.pref), 'browse pref persisted')

      report.shots.push(await shot(page, 'desktop-customer-milpitas-empty.png'))

      // Reload persistence
      await page.goto(`${BASE}/browse?radius=10`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-testid="topnav-location"]')
      assert.match(await page.getByTestId('topnav-location').innerText(), /Milpitas/i)
      assert.equal(await page.locator('[data-testid="browse-location-eyebrow"]').count(), 0)
      assert.equal(
        await page.locator('[data-testid="browse-feed-scroll"] a[href^="/requests/"]').count(),
        0,
      )

      // Reset to home restores Austin context
      await page.getByTestId('topnav-location').click()
      await page.waitForSelector('[data-testid="browse-location-use-home"]')
      await page.getByTestId('browse-location-use-home').click()
      await page.waitForSelector('[data-testid="browse-location-dialog"]', { state: 'detached' })
      await page.waitForTimeout(400)
      assert.match(await page.getByTestId('topnav-location').innerText(), /Austin/i)
      assert.ok(
        (await page.locator('[data-testid="browse-feed-scroll"] a[href^="/requests/"]').count()) >= 1,
      )
      report.shots.push(await shot(page, 'desktop-customer-reset-home.png'))
      report.checks.push({ state: 'desktop-customer-picker', ok: true })
      await page.close()
    }

    // Mobile
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      await seedCustomerAustin(page)
      await page.getByTestId('topnav-location').click()
      await page.waitForSelector('[data-testid="browse-location-dialog"]')
      assert.equal(new URL(page.url()).pathname, '/browse')
      report.shots.push(await shot(page, 'mobile-customer-picker-open.png'))
      await pickCity(page, 'San Jose', 'San Jose')
      assert.match(await page.getByTestId('topnav-location').innerText(), /San Jose/i)
      assert.equal(await page.locator('[data-testid="browse-location-eyebrow"]').count(), 0)
      report.shots.push(await shot(page, 'mobile-customer-san-jose.png'))
      report.checks.push({ state: 'mobile-customer-picker', ok: true })
      await page.close()
    }

    // Helper jobs-only preserved
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedHelper(page)
      assert.equal(await page.getByTestId('browse-mode-tabs').count(), 0)
      await page.getByTestId('topnav-location').click()
      await page.waitForSelector('[data-testid="browse-location-dialog"]')
      assert.equal(new URL(page.url()).pathname, '/browse')
      await page.getByTestId('browse-location-cancel').click()
      assert.equal(await page.getByTestId('browse-mode-tabs').count(), 0)
      assert.equal(await page.locator('[data-testid="browse-radar"]').count(), 0)
      report.shots.push(await shot(page, 'desktop-helper-location-no-profile-nav.png'))
      report.checks.push({ state: 'helper-jobs-only-location', ok: true })
      await page.close()
    }
  } catch (err) {
    report.ok = false
    report.error = String(err?.stack || err)
    throw err
  } finally {
    await browser.close()
    writeFileSync(join(OUT, 'summary.json'), JSON.stringify(report, null, 2))
    writeFileSync(join(LOCAL, 'summary.json'), JSON.stringify(report, null, 2))
  }

  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exit(1)
  console.log('browse-location-picker QA passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
