#!/usr/bin/env node
/**
 * Visual QA for Browse 3-column marketplace discovery layout.
 * Screenshots → /opt/cursor/artifacts/browse-3col-visual-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/browse-3col-visual-qa'
const LOCAL = '/workspace/artifacts/browse-3col-visual-qa'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

function save(src, name) {
  copyFileSync(src, join(OUT, name))
  copyFileSync(src, join(LOCAL, name))
  return join(OUT, name)
}

async function measure(page) {
  return page.evaluate(() => {
    const html = document.documentElement
    const filters = document.querySelector('[data-testid="browse-filters-sidebar"]')
    const feed = document.querySelector('[data-testid="browse-feed-main"]')
    const trending = document.querySelector('[data-testid="browse-trending-helpers"]')
    const command =
      document.querySelector('[data-testid="browse-command-bar"] > div') ||
      document.querySelector('[data-testid="browse-command-bar"]')
    const cards = [...document.querySelectorAll('[data-testid="browse-feed-main"] a')].slice(0, 8)
    const radii = [
      filters?.firstElementChild,
      trending,
      command,
      ...cards,
    ]
      .filter(Boolean)
      .map((el) => parseFloat(getComputedStyle(el).borderRadius) || 0)
    return {
      overflowX: html.scrollWidth > html.clientWidth + 1,
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
      filtersVisible: !!(filters && getComputedStyle(filters).display !== 'none'),
      feedVisible: !!feed,
      trendingVisible: !!(trending && getComputedStyle(trending).display !== 'none'),
      filtersX: filters?.getBoundingClientRect().x ?? null,
      feedX: feed?.getBoundingClientRect().x ?? null,
      trendingX: trending?.getBoundingClientRect().x ?? null,
      filtersY: filters?.getBoundingClientRect().y ?? null,
      feedY: feed?.getBoundingClientRect().y ?? null,
      trendingY: trending?.getBoundingClientRect().y ?? null,
      commandWidth: command?.getBoundingClientRect().width ?? null,
      maxRadius: radii.length ? Math.max(...radii) : 0,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    }
  })
}

const summary = { checks: [], ok: true }

async function shot(page, name) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage: false })
  save(tmp, name)
  return name
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    // Desktop 1440 — requests
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('text=Browse Local Jobs', { timeout: 15000 })
      await page.waitForSelector('[data-testid="browse-3col-grid"]')
      await page.waitForTimeout(400)
      const m = await measure(page)
      assert.equal(m.overflowX, false, 'no x-overflow desktop requests')
      assert.equal(m.filtersVisible, true, 'filters visible @1440')
      assert.equal(m.trendingVisible, true, 'trending visible @1440')
      assert.ok(m.filtersX < m.feedX && m.feedX < m.trendingX, '3col x-order')
      assert.ok(m.commandWidth <= 780, `command bar ${m.commandWidth}`)
      assert.ok(m.maxRadius > 0 && m.maxRadius <= 14, `radius ${m.maxRadius}`)
      await shot(page, 'browse-3col-requests-1440x900.png')
      summary.checks.push({ name: 'requests-1440', ok: true, metrics: m })

      // Active category + distance filter (demo signed-in)
      await page.getByRole('button', { name: /^Moving/ }).first().click()
      const radius = page.getByTestId('browse-radius-trigger')
      if ((await radius.count()) > 0) {
        await radius.click()
        await page.getByTestId('browse-radius-listbox').waitFor({ state: 'visible' })
        await page.getByRole('option', { name: /Within 10 mi/i }).click()
      }
      await page.waitForTimeout(300)
      await shot(page, 'browse-3col-filtered-1440x900.png')
      summary.checks.push({ name: 'filtered-1440', ok: true })

      // Helpers tab
      await page.goto(`${BASE}/browse?tab=people`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('text=Browse Local Jobs')
      await page.waitForTimeout(300)
      const mh = await measure(page)
      assert.equal(mh.overflowX, false, 'no x-overflow helpers')
      assert.ok(mh.filtersX < mh.feedX && mh.feedX < mh.trendingX, 'helpers 3col x-order')
      await shot(page, 'browse-3col-helpers-1440x900.png')
      summary.checks.push({ name: 'helpers-1440', ok: true, metrics: mh })
      await page.close()
    }

    // Tablet 768
    {
      const page = await browser.newPage({ viewport: { width: 768, height: 1024 } })
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('text=Browse Local Jobs')
      await page.waitForTimeout(300)
      const m = await measure(page)
      assert.equal(m.overflowX, false, 'no x-overflow tablet')
      assert.equal(m.filtersVisible, false, 'filters sidebar hidden < lg')
      assert.ok(m.trendingY == null || m.trendingY >= (m.feedY ?? 0), 'trending below/near feed on tablet')
      await shot(page, 'browse-3col-tablet-768x1024.png')
      summary.checks.push({ name: 'tablet-768', ok: true, metrics: m })
      await page.close()
    }

    // Mobile 390
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('text=Browse Local Jobs')
      await page.waitForTimeout(300)
      const m = await measure(page)
      assert.equal(m.overflowX, false, 'no x-overflow mobile')
      assert.equal(m.filtersVisible, false, 'filters sidebar hidden on mobile')
      await shot(page, 'browse-3col-mobile-390x844.png')
      summary.checks.push({ name: 'mobile-390', ok: true, metrics: m })

      await page.getByRole('button', { name: /^Filters$/ }).click()
      await page.waitForTimeout(200)
      await shot(page, 'browse-3col-mobile-filters-open-390x844.png')
      summary.checks.push({ name: 'mobile-filters-open', ok: true })
      await page.close()
    }
  } catch (err) {
    summary.ok = false
    summary.error = String(err?.stack || err)
    throw err
  } finally {
    await browser.close()
  }

  writeFileSync(join(OUT, 'browse-3col-visual-qa.json'), JSON.stringify(summary, null, 2))
  writeFileSync(join(LOCAL, 'browse-3col-visual-qa.json'), JSON.stringify(summary, null, 2))
  console.log('browse-3col visual QA passed')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
