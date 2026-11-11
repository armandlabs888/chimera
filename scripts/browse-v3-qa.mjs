#!/usr/bin/env node
/**
 * Browse Jobs v3 Playwright QA — list/drawer/filters/empty across viewports.
 * Screenshots → /opt/cursor/artifacts/browse-v3/
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/browse-v3'
const LOCAL = '/workspace/artifacts/browse-v3'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage: false })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log(`saved ${join(OUT, name)}`)
  return name
}

async function seedCustomer(page) {
  await page.goto(`${BASE}/browse`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    for (const p of state.people || []) {
      if (p.id === me) {
        p.accountRole = 'customer'
        p.isHelper = false
        p.skills = []
        p.city = p.city || 'San Jose'
        p.stateCode = p.stateCode || 'CA'
        p.locationLabel = p.locationLabel || 'San Jose, CA'
        p.lat = p.lat ?? 37.3382
        p.lng = p.lng ?? -121.8863
      } else if (!(p.isHelper || (p.skills || []).length)) {
        p.isHelper = true
        p.skills = ['house-cleaning', 'pet-sitting']
      }
    }
    for (const r of state.requests || []) {
      if (r.status === 'open') {
        r.lat = r.lat ?? 37.34
        r.lng = r.lng ?? -121.89
      }
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
}

async function seedEmptyFilters(page) {
  await seedCustomer(page)
  await page.goto(`${BASE}/browse?category=auto&radius=3&q=zzzz-no-match`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
}

const summary = { ok: true, checks: [], shots: [] }

function pass(name, extra = {}) {
  summary.checks.push({ name, ok: true, ...extra })
  console.log(`PASS ${name}`)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const vp of [
      { name: '1440', width: 1440, height: 900 },
      { name: '1024', width: 1024, height: 768 },
      { name: '768', width: 768, height: 1024 },
      { name: '390', width: 390, height: 844 },
      { name: '320', width: 320, height: 720 },
    ]) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
      await seedCustomer(page)
      await page.waitForSelector('[data-testid="browse-v3"]', { timeout: 20000 })
      await page.waitForSelector('text=Browse Local Jobs')

      const metrics = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="browse-v3"]')
        const html = document.documentElement
        return {
          overflowX: html.scrollWidth > html.clientWidth + 1,
          layout: root?.getAttribute('data-browse-layout'),
          has3col: !!document.querySelector('[data-testid="browse-3col-grid"]'),
          hasFeedScroll: !!document.querySelector('[data-testid="browse-feed-scroll"]'),
          hasTrending: /Trending helpers/i.test(document.body.innerText || ''),
          hasSample: /Sample listings/i.test(document.body.innerText || ''),
          hasBudgetPill: [...document.querySelectorAll('button')].some((b) =>
            /^Budget$/i.test((b.textContent || '').trim()),
          ),
          hasTabs: !!document.querySelector('[data-testid="browse-mode-tabs"]'),
          rowCount: document.querySelectorAll('[data-testid="browse-job-row"]').length,
          floatNav: !!document.querySelector('[data-nav-style="float"]'),
          mainOverflow: document.querySelector('main')
            ? getComputedStyle(document.querySelector('main')).overflowY
            : null,
        }
      })
      assert.equal(metrics.overflowX, false, `${vp.name} x-overflow`)
      assert.equal(metrics.has3col, false)
      assert.equal(metrics.hasFeedScroll, false)
      assert.equal(metrics.hasTrending, false)
      assert.equal(metrics.hasSample, false)
      assert.equal(metrics.hasBudgetPill, false)
      assert.equal(metrics.floatNav, true)
      assert.ok(metrics.rowCount > 0 || metrics.hasTabs, 'has rows or tabs')
      assert.ok(['visible', 'auto', ''].includes(metrics.mainOverflow) || metrics.mainOverflow === 'visible' || metrics.mainOverflow !== 'hidden')

      summary.shots.push(await shot(page, `list-${vp.name}.png`))
      pass(`list-${vp.name}`, metrics)

      // Open drawer/sheet via first row
      if (metrics.rowCount > 0) {
        await page.locator('[data-testid="browse-job-row"]').first().click()
        await page.waitForTimeout(400)
        const drawerOpen = await page.evaluate(() => {
          const drawer = document.querySelector('[data-testid="browse-job-drawer"]')
          const sheet = document.querySelector('[data-testid="browse-job-sheet"]')
          const visible = (el) =>
            !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 40
          return {
            urlHasJob: /[?&]job=/.test(location.search),
            drawer: visible(drawer),
            sheet: visible(sheet),
            body: document.body.innerText.slice(0, 400),
          }
        })
        assert.equal(drawerOpen.urlHasJob, true, `${vp.name} job param`)
        if (vp.width >= 1024) assert.equal(drawerOpen.drawer, true, `${vp.name} drawer`)
        else assert.ok(drawerOpen.sheet || drawerOpen.drawer, `${vp.name} sheet/drawer`)
        assert.doesNotMatch(drawerOpen.body, /Sample listings|Elena R/i)
        summary.shots.push(await shot(page, `detail-${vp.name}.png`))
        pass(`detail-${vp.name}`)

        await page.keyboard.press('Escape')
        await page.waitForTimeout(250)
        const closed = await page.evaluate(() => !/[?&]job=/.test(location.search))
        assert.equal(closed, true, `${vp.name} escape closes job`)
        pass(`escape-${vp.name}`)
      }

      // Category popover / mobile filters
      if (vp.width >= 768) {
        const cat = page.locator('[data-testid="browse-filter-category"]')
        if (await cat.count()) {
          await cat.click()
          await page.waitForTimeout(200)
          summary.shots.push(await shot(page, `popover-category-${vp.name}.png`))
          await page.keyboard.press('Escape')
          pass(`popover-${vp.name}`)
        }
      } else {
        const filtersBtn = page.locator('[data-testid="browse-mobile-filters-trigger"]')
        if (await filtersBtn.count()) {
          await filtersBtn.click()
          await page.waitForSelector('[data-testid="browse-mobile-filters-panel"]', {
            state: 'visible',
            timeout: 10000,
          })
          summary.shots.push(await shot(page, `filters-sheet-${vp.name}.png`))
          await page.keyboard.press('Escape')
          pass(`filters-sheet-${vp.name}`)
        }
      }

      await page.close()
    }

    // Empty state @1440
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedEmptyFilters(page)
      await page.waitForSelector('[data-testid="browse-filtered-empty"], [data-testid="browse-fresh-empty"]', {
        timeout: 15000,
      })
      const emptyText = await page.locator('body').innerText()
      assert.doesNotMatch(emptyText, /Sample listings/i)
      assert.match(emptyText, /No jobs match|Reset|Post a task|nothing|widen|filters/i)
      summary.shots.push(await shot(page, 'empty-1440.png'))
      pass('empty-1440')
      await page.close()
    }

    // Location override still works
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedCustomer(page)
      await page.getByTestId('topnav-location').click()
      await page.waitForSelector('[data-testid="browse-location-dialog"]', { timeout: 10000 })
      summary.shots.push(await shot(page, 'location-dialog-1440.png'))
      await page.keyboard.press('Escape')
      pass('location-override')
      await page.close()
    }
  } catch (err) {
    summary.ok = false
    summary.error = String(err?.stack || err)
    console.error('FAIL', err)
    process.exitCode = 1
  } finally {
    await browser.close()
    writeFileSync(join(OUT, 'browse-v3-qa.json'), JSON.stringify(summary, null, 2))
    writeFileSync(join(LOCAL, 'browse-v3-qa.json'), JSON.stringify(summary, null, 2))
  }
}

main()
