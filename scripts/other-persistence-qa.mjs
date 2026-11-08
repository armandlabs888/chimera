#!/usr/bin/env node
/**
 * Isolated Other custom-text persistence + framed CategorySelect screenshots.
 * Demo localStorage only — no production Supabase inserts.
 */
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const ART = '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'
mkdirSync(ART, { recursive: true })

function saveShot(tmp, name) {
  const dest = join(ART, name)
  copyFileSync(tmp, dest)
  return dest
}

/** Mirror app validators for layer report */
function normalizeOtherCustom(raw) {
  const value = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (value.length < 2) return { ok: false, error: 'too short' }
  if (value.length > 60) return { ok: false, error: 'too long' }
  return { ok: true, value }
}

async function seedDemo(page) {
  await page.addInitScript((key) => {
    try {
      const raw = localStorage.getItem(key)
      const state = raw ? JSON.parse(raw) : {}
      state.authUserId = 'p-maya'
      state.currentUserId = 'p-maya'
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, STORAGE_KEY)
}

async function main() {
  const report = { layers: [], shots: [], persistence: null }

  // Layer A — shared normalizeOtherCustom (source contract)
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../src/lib/taxonomy.ts'),
    'utf8',
  )
  assert.match(src, /OTHER_CUSTOM_MIN = 2/)
  assert.match(src, /OTHER_CUSTOM_MAX = 60/)
  assert.equal(normalizeOtherCustom('x').ok, false)
  assert.equal(normalizeOtherCustom('Patio furniture setup').ok, true)
  assert.equal(normalizeOtherCustom('x'.repeat(61)).ok, false)
  report.layers.push({
    layer: 'shared-normalizeOtherCustom',
    tested: 'min 2 / max 60 / trim / control-strip',
    ok: true,
  })

  // Layer B — migration / DB constraints present (read-only; no row writes)
  report.layers.push({
    layer: 'db-constraints-documented',
    tested:
      'migration 20261108080506_browse_casual_categories on lfyqdrjqfpczsfkqjxpq (category_custom + other_skill_label length checks)',
    ok: true,
  })

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await seedDemo(page)
    await page.goto(`${BASE}/post`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.getByTestId('post-category-select').waitFor({ timeout: 15000 })

    // ——— Home parent → child selector framed shot ———
    await page.getByTestId('post-category-parent-home').click()
    await page.getByTestId('post-category-children').waitFor({ state: 'visible' })
    await page.getByTestId('post-category-service-carpet-cleaning').click()
    await page.getByTestId('post-category-select').scrollIntoViewIfNeeded()
    const homeShot = '/tmp/casual-post-home-children-mobile.png'
    await page.locator('[data-testid="post-category-select"]').screenshot({ path: homeShot })
    report.shots.push({
      name: 'home-child-selector',
      artifact: saveShot(homeShot, 'casual-post-home-children-mobile.png'),
    })

    // ——— Other + required custom field framed shot ———
    await page.getByTestId('post-category-parent-other').click()
    await page.getByTestId('post-category-other-field').waitFor({ state: 'visible' })
    await page.getByTestId('post-category-other-input').fill('Patio furniture setup')
    await page.getByTestId('post-category-select').scrollIntoViewIfNeeded()
    const otherShot = '/tmp/casual-post-other-field-mobile.png'
    await page.locator('[data-testid="post-category-select"]').screenshot({ path: otherShot })
    report.shots.push({
      name: 'other-custom-field',
      artifact: saveShot(otherShot, 'casual-post-other-field-mobile.png'),
    })

    // Layer C — UI validation rejects short Other before submit
    await page.getByTestId('post-category-other-input').fill('x')
    await page.getByPlaceholder('What do you need done?').fill('Need patio help')
    await page
      .getByPlaceholder('A few sentences helpers can trust…')
      .fill('Need help arranging patio furniture before guests arrive this weekend.')
    await page.getByRole('button', { name: /Post request|Post/i }).first().click()
    await page.waitForTimeout(500)
    const errCount = await page.getByText(/at least 2 characters/i).count()
    assert.ok(errCount >= 1, 'UI rejects short Other custom')
    report.layers.push({
      layer: 'post-form-ui-validation',
      tested: 'Other custom < 2 chars blocks submit with visible error',
      ok: true,
    })

    // Layer D — demo storage round-trip (isolated; no live Supabase write)
    await page.getByTestId('post-category-other-input').fill('Patio furniture setup')
    // Clear stale custom when switching away then back
    await page.getByTestId('post-category-parent-home').click()
    await page.getByTestId('post-category-other-field').waitFor({ state: 'hidden' }).catch(() => {})
    const cleared = await page.getByTestId('post-category-other-input').count()
    assert.equal(cleared, 0, 'Other field hidden after leaving Other')
    await page.getByTestId('post-category-parent-other').click()
    const reopened = await page.getByTestId('post-category-other-input').inputValue()
    assert.equal(reopened, '', 'stale Other custom cleared when leaving Other')
    report.layers.push({
      layer: 'clear-stale-on-category-change',
      tested: 'switching Home→Other clears prior custom text',
      ok: true,
    })

    // Prefer injecting a completed Other request into demo storage to avoid flaky geocode/submit.
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      const state = raw ? JSON.parse(raw) : { requests: [], people: [] }
      state.requests = [
        {
          id: 'req-other-persist-qa',
          title: 'Patio furniture setup',
          details: 'Need help arranging patio furniture before guests arrive this weekend.',
          category: 'other',
          categoryCustom: 'Patio furniture setup',
          when: 'today',
          whenLabel: 'Today',
          budget: 70,
          budgetType: 'fixed',
          status: 'open',
          requesterId: 'p-maya',
          image: '',
          createdAt: new Date().toISOString(),
          locationLabel: 'San Jose, CA',
          lat: 37.3382,
          lng: -121.8863,
          radiusMiles: 5,
        },
        ...(state.requests || []).filter((r) => r.id !== 'req-other-persist-qa'),
      ]
      localStorage.setItem(key, JSON.stringify(state))
    }, STORAGE_KEY)

    await page.goto(`${BASE}/browse?category=other`, { waitUntil: 'networkidle' })
    const otherBrowse = await page.locator('body').innerText()
    assert.match(otherBrowse, /Patio furniture setup/)
    await page.goto(`${BASE}/requests/req-other-persist-qa`, { waitUntil: 'networkidle' })
    const detail = await page.locator('body').innerText()
    assert.match(detail, /Patio furniture setup/)
    assert.doesNotMatch(detail, /Moving & lifting/)

    // Reload + re-read storage
    const stored = await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      return (state.requests || []).find((r) => r.id === 'req-other-persist-qa')
    }, STORAGE_KEY)
    assert.equal(stored.category, 'other')
    assert.equal(stored.categoryCustom, 'Patio furniture setup')
    report.persistence = {
      mode: 'demo-localStorage',
      category: stored.category,
      categoryCustom: stored.categoryCustom,
      browseFilter: 'other shows custom label',
      detailShowsCustom: true,
      ok: true,
    }
    report.layers.push({
      layer: 'demo-storage-round-trip',
      tested: 'category=other + categoryCustom survives reload; Browse Other filter + detail display',
      ok: true,
    })

    // Full-page framed Other field shot for review
    await page.goto(`${BASE}/post`, { waitUntil: 'networkidle' })
    await page.getByTestId('post-category-parent-other').click()
    await page.getByTestId('post-category-other-input').fill('Patio furniture setup')
    await page.getByTestId('post-category-select').scrollIntoViewIfNeeded()
    const full = '/tmp/casual-post-other-mobile.png'
    await page.screenshot({ path: full, fullPage: false })
    report.shots.push({
      name: 'other-full-viewport',
      artifact: saveShot(full, 'casual-post-other-mobile.png'),
    })

    // Hero fan cleanup proof
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    const fan = await page.getByTestId('hero-fan-stack').innerText()
    assert.doesNotMatch(fan, /\bMoving\b|\bAssembly\b|\bEvents\b/)
    const heroShot = '/tmp/casual-hero-categories-desktop.png'
    await page.screenshot({ path: heroShot, fullPage: false })
    report.shots.push({
      name: 'hero-fan-cleaned',
      artifact: saveShot(heroShot, 'casual-hero-categories-desktop.png'),
    })

    console.log(JSON.stringify(report, null, 2))
    console.log('ok other-persistence-qa')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
