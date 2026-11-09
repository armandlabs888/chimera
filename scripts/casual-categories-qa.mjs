#!/usr/bin/env node
/**
 * Demo/local browser QA for casual-launch categories + Other persistence.
 * Does not create production posts.
 */
import assert from 'node:assert/strict'
import { mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const ART = '/opt/cursor/artifacts'
mkdirSync(ART, { recursive: true })

const STORAGE_KEY = 'beam-demo-v1'

function saveShot(tmp, name) {
  const dest = join(ART, name)
  copyFileSync(tmp, dest)
  return dest
}

async function seedDemo(page) {
  await page.addInitScript((key) => {
    try {
      const raw = localStorage.getItem(key)
      const state = raw ? JSON.parse(raw) : { people: [], requests: [], offers: [] }
      state.authUserId = 'p-maya'
      state.currentUserId = 'p-maya'
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, STORAGE_KEY)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const summary = { checks: [] }

  try {
    // Desktop hero + browse parents
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.getByTestId('hero-category-trigger').click()
      const list = page.getByTestId('hero-category-listbox')
      await list.waitFor({ state: 'visible' })
      const text = await list.innerText()
      for (const label of ['All categories', 'Home', 'Auto', 'Junk Removal', 'Pets', 'Other']) {
        assert.match(text, new RegExp(label))
      }
      for (const bad of ['Moving & lifting', 'Handyman', 'Tutoring', 'Home cleaning']) {
        assert.equal(text.includes(bad), false, `hero still shows ${bad}`)
      }
      const shot = '/tmp/casual-hero-categories-desktop.png'
      await page.screenshot({ path: shot, fullPage: false })
      summary.checks.push({
        name: 'hero-parents-desktop',
        ok: true,
        artifact: saveShot(shot, 'casual-hero-categories-desktop.png'),
      })
      await page.close()
    }

    // Tablet browse filter parents (open mobile filters sheet)
    {
      const page = await browser.newPage({ viewport: { width: 834, height: 1112 } })
      await seedDemo(page)
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.getByRole('button', { name: 'Filters' }).click()
      const mobileFilters = page.locator('[data-testid="browse-mobile-filters-panel"]')
      await mobileFilters.getByTestId('browse-filters-reset').waitFor({ state: 'visible', timeout: 10000 })
      await mobileFilters.getByText('All categories', { exact: true }).waitFor({ state: 'visible' })
      for (const label of ['Home', 'Auto', 'Junk Removal', 'Pets', 'Other']) {
        assert.ok(
          (await mobileFilters.getByRole('button', { name: new RegExp(`^${label}\\b`) }).count()) >= 1,
          `missing filter ${label}`,
        )
      }
      assert.equal(await mobileFilters.getByRole('button', { name: /Moving & lifting/ }).count(), 0)
      assert.equal(await mobileFilters.getByRole('button', { name: /Handyman & assembly/ }).count(), 0)
      await mobileFilters.getByRole('button', { name: /^Home\b/ }).click()
      await page.waitForURL(/category=home/, { timeout: 10000 })
      const shot = '/tmp/casual-browse-home-tablet.png'
      await page.screenshot({ path: shot, fullPage: false })
      summary.checks.push({
        name: 'browse-home-tablet',
        ok: true,
        artifact: saveShot(shot, 'casual-browse-home-tablet.png'),
      })
      await page.close()
    }

    // Mobile post: parent → child + Other validation
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      await seedDemo(page)
      await page.goto(`${BASE}/post`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.getByTestId('post-category-select').waitFor({ timeout: 15000 })
      await page.getByTestId('post-category-parent-home').click()
      await page.getByTestId('post-category-children').waitFor({ state: 'visible' })
      await page.getByTestId('post-category-service-carpet-cleaning').click()
      const homeShot = '/tmp/casual-post-home-child-mobile.png'
      await page.screenshot({ path: homeShot, fullPage: false })
      summary.checks.push({
        name: 'post-home-child-mobile',
        ok: true,
        artifact: saveShot(homeShot, 'casual-post-home-child-mobile.png'),
      })

      await page.getByTestId('post-category-parent-other').click()
      await page.getByTestId('post-category-other-field').waitFor({ state: 'visible' })
      await page.getByTestId('post-category-other-input').fill('x')
      await page.getByRole('button', { name: /Post request|Post/i }).first().click()
      // Invalid Other should surface error (or stay on form)
      await page.waitForTimeout(400)
      const errVisible = await page.getByText(/at least 2 characters/i).count()
      assert.ok(errVisible >= 1 || (await page.url()).includes('/post'), 'invalid Other rejected')

      await page.getByTestId('post-category-other-input').fill('Patio furniture setup')
      const otherShot = '/tmp/casual-post-other-mobile.png'
      await page.screenshot({ path: otherShot, fullPage: false })
      summary.checks.push({
        name: 'post-other-field-mobile',
        ok: true,
        artifact: saveShot(otherShot, 'casual-post-other-mobile.png'),
      })

      // Round-trip Other in demo storage without relying on network
      await page.evaluate((key) => {
        const raw = localStorage.getItem(key)
        const state = raw ? JSON.parse(raw) : { requests: [], people: [] }
        state.requests = [
          {
            id: 'req-other-qa',
            title: 'Patio furniture setup',
            details: 'Need help arranging patio set before guests arrive.',
            category: 'other',
            categoryCustom: 'Patio furniture setup',
            when: 'today',
            whenLabel: 'Today',
            budget: 70,
            budgetType: 'fixed',
            status: 'open',
            requesterId: 'p-maya',
            createdAt: new Date().toISOString(),
            locationLabel: 'San Jose, CA',
            lat: 37.3382,
            lng: -121.8863,
            radiusMiles: 5,
          },
          ...(state.requests || []),
        ]
        // Legacy historical row stays readable
        state.requests.push({
          id: 'req-legacy-qa',
          title: 'Old moving job',
          details: 'Historical',
          category: 'moving',
          when: 'today',
          whenLabel: 'Today',
          budget: 50,
          budgetType: 'fixed',
          status: 'open',
          requesterId: 'p-maya',
          createdAt: new Date().toISOString(),
          locationLabel: 'San Jose, CA',
          lat: 37.3382,
          lng: -121.8863,
          radiusMiles: 5,
        })
        localStorage.setItem(key, JSON.stringify(state))
      }, STORAGE_KEY)

      await page.goto(`${BASE}/browse?category=other`, { waitUntil: 'networkidle' })
      const browseText = await page.locator('body').innerText()
      assert.match(browseText, /Patio furniture setup/)
      assert.doesNotMatch(browseText, /Old moving job/)

      await page.goto(`${BASE}/browse?category=all`, { waitUntil: 'networkidle' })
      const allText = await page.locator('body').innerText()
      assert.match(allText, /Patio furniture setup/)
      // Legacy label readable somewhere (card category chip)
      assert.match(allText, /Moving & lifting|Old moving job/)

      const legacyShot = '/tmp/casual-legacy-readable.png'
      await page.screenshot({ path: legacyShot, fullPage: false })
      summary.checks.push({
        name: 'other-filter-and-legacy-readable',
        ok: true,
        artifact: saveShot(legacyShot, 'casual-legacy-readable.png'),
      })
      await page.close()
    }

    console.log(JSON.stringify(summary, null, 2))
    console.log('ok casual-categories-qa')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
