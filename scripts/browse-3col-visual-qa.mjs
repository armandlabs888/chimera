#!/usr/bin/env node
/**
 * Visual QA for Browse v3 — single column, sticky filters, job drawer.
 * Filename kept so existing npm/docs references still point here.
 * Screenshots → /opt/cursor/artifacts/browse-3col-visual-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/browse-3col-visual-qa'
const LOCAL = '/workspace/artifacts/browse-3col-visual-qa'
const STORAGE_KEY = 'beam-demo-v1'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function seedCustomerDiscovery(page) {
  await page.goto(`${BASE}/browse`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => !!localStorage.getItem('beam-demo-v1'), null, {
    timeout: 20000,
  })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    for (const p of state.people || []) {
      if (p.id === me) {
        p.accountRole = 'customer'
        p.isHelper = false
        p.skills = []
      } else if (!(p.isHelper || (p.skills || []).length)) {
        p.isHelper = true
        p.skills = ['house-cleaning', 'pet-sitting']
      }
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
}

function save(src, name) {
  copyFileSync(src, join(OUT, name))
  copyFileSync(src, join(LOCAL, name))
  return join(OUT, name)
}

async function measure(page) {
  return page.evaluate(() => {
    const html = document.documentElement
    const root = document.querySelector('[data-testid="browse-v3"]')
    const bar = document.querySelector('[data-testid="browse-filter-bar"]')
    const list = document.querySelector('[data-testid="browse-job-list"]')
    const row = document.querySelector('[data-testid="browse-job-row"]')
    const main = document.querySelector('main')
    return {
      overflowX: html.scrollWidth > html.clientWidth + 1,
      layout: root?.getAttribute('data-browse-layout') || null,
      columnWidth: root?.getBoundingClientRect().width ?? null,
      barWidth: bar?.getBoundingClientRect().width ?? null,
      listWidth: list?.getBoundingClientRect().width ?? null,
      rowRadius: row ? parseFloat(getComputedStyle(row).borderRadius) || 0 : 0,
      has3col: !!document.querySelector('[data-testid="browse-3col-grid"]'),
      hasTrending: /Trending helpers/i.test(document.body.innerText || ''),
      hasFeedScroll: !!document.querySelector('[data-testid="browse-feed-scroll"]'),
      hasBudget: [...document.querySelectorAll('button')].some((b) =>
        /^Budget$/i.test((b.textContent || '').replace(/\s+/g, ' ').trim()),
      ),
      hasSample: /Sample listings/i.test(document.body.innerText || ''),
      hasBell: !!document.querySelector('[data-testid="notifications-bell"]'),
      mainOverflow: main ? getComputedStyle(main).overflowY : null,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      sticky: bar ? getComputedStyle(bar.parentElement || bar).position : null,
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
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedCustomerDiscovery(page)
      await page.waitForSelector('text=/Jobs near|Helpers near/', { timeout: 15000 })
      await page.waitForSelector('[data-testid="browse-v3"]')
      await page.waitForSelector('[data-testid="browse-job-row"]')
      const m = await measure(page)
      assert.equal(m.overflowX, false, 'no x-overflow desktop')
      assert.equal(m.layout, 'discovery', 'discovery layout')
      assert.match(m.h1, /^Jobs near /)
      assert.equal(m.has3col, false, 'no 3-col grid')
      assert.equal(m.hasTrending, false, 'no trending copy')
      assert.equal(m.hasFeedScroll, false, 'no nested feed scroll')
      assert.equal(m.hasBudget, false, 'no budget pill')
      assert.equal(m.hasSample, false, 'no sample listings')
      assert.equal(m.hasBell, false, 'no bell')
      assert.notEqual(m.mainOverflow, 'hidden', 'main not overflow locked')
      assert.ok(m.columnWidth >= 760 && m.columnWidth <= 860, `column ${m.columnWidth}`)
      assert.ok(
        m.barWidth && m.listWidth && Math.abs(m.barWidth - m.listWidth) <= 48,
        `bar/list widths ${m.barWidth}/${m.listWidth}`,
      )
      assert.ok(m.rowRadius > 0 && m.rowRadius <= 12, `radius ${m.rowRadius}`)
      await shot(page, 'browse-v3-requests-1440x900.png')
      summary.checks.push({ name: 'requests-1440', ok: true, metrics: m })

      await page.getByTestId('browse-category-trigger').click()
      await page.getByTestId('browse-category-listbox').waitFor({ state: 'visible' })
      await page.getByRole('option', { name: /^Home\b/ }).click()
      await page.getByTestId('browse-radius-trigger').click()
      await page.getByTestId('browse-radius-listbox').waitFor({ state: 'visible' })
      await page.getByRole('option', { name: /Within 10 mi/i }).click()
      await page.waitForTimeout(250)
      assert.match(await page.locator('body').innerText(), /Home/)
      assert.match(await page.locator('body').innerText(), /Within 10 mi/)
      await shot(page, 'browse-v3-filtered-1440x900.png')
      summary.checks.push({ name: 'filtered-1440', ok: true })

      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-testid="browse-job-row"]')
      const row = page.locator('[data-testid="browse-job-row"]').first()
      const jobId = await row.getAttribute('data-job-id')
      await row.click()
      await page.waitForSelector('[data-testid="browse-job-drawer"]')
      assert.match(page.url(), new RegExp(`[?&]job=${jobId}`))
      assert.equal(await page.locator('[data-testid="browse-job-drawer"]').count(), 1)
      const drawerText = await page.locator('[data-testid="browse-job-drawer"]').innerText()
      assert.match(drawerText, /Exact address is shared after your offer is accepted/i)
      assert.equal(await page.locator('[data-testid="browse-job-drawer"] iframe, [data-testid="browse-job-drawer"] [data-testid="austin-map"]').count(), 0)
      await page.keyboard.press('Escape')
      await page.waitForSelector('[data-testid="browse-job-drawer"]', { state: 'detached' })
      assert.equal(new URL(page.url()).searchParams.get('job'), null)
      summary.checks.push({ name: 'drawer-1440', ok: true, jobId })

      await page.goto(`${BASE}/browse?tab=people`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-testid="browse-tab-local-helpers"][aria-selected="true"]')
      await page.waitForSelector('[data-testid="browse-helper-row"]')
      const mh = await measure(page)
      assert.equal(mh.overflowX, false, 'no x-overflow helpers')
      assert.equal(mh.hasTrending, false, 'helpers tab has no trending')
      await shot(page, 'browse-v3-helpers-1440x900.png')
      summary.checks.push({ name: 'helpers-1440', ok: true, metrics: mh })
      await page.close()
    }

    {
      const page = await browser.newPage({ viewport: { width: 768, height: 1024 } })
      await seedCustomerDiscovery(page)
      await page.waitForSelector('text=/Jobs near|Helpers near/')
      const m = await measure(page)
      assert.equal(m.overflowX, false, 'no x-overflow tablet')
      assert.equal(m.hasTrending, false, 'tablet has no trending')
      assert.equal(m.has3col, false, 'tablet has no 3-col')
      await shot(page, 'browse-v3-tablet-768x1024.png')
      summary.checks.push({ name: 'tablet-768', ok: true, metrics: m })
      await page.close()
    }

    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      await seedCustomerDiscovery(page)
      await page.waitForSelector('text=/Jobs near|Helpers near/')
      const m = await measure(page)
      assert.equal(m.overflowX, false, 'no x-overflow mobile')
      await shot(page, 'browse-v3-mobile-390x844.png')
      summary.checks.push({ name: 'mobile-390', ok: true, metrics: m })

      await page.getByTestId('browse-mobile-filters-trigger').click()
      await page.waitForSelector('[data-testid="browse-mobile-filters-panel"]')
      const sheetText = await page.getByTestId('browse-mobile-filters-panel').innerText()
      assert.match(sheetText, /Category/)
      assert.match(sheetText, /Distance/)
      assert.match(sheetText, /When/)
      assert.doesNotMatch(sheetText, /Budget/)
      await shot(page, 'browse-v3-mobile-filters-open-390x844.png')
      await page.keyboard.press('Escape')
      await page.waitForSelector('[data-testid="browse-mobile-filters-panel"]', { state: 'detached' })

      await page.locator('[data-testid="browse-job-row"]').first().click()
      await page.waitForSelector('[data-testid="browse-job-sheet"]')
      assert.match(page.url(), /[?&]job=/)
      const pinned =
        (await page.getByTestId('browse-make-offer').count()) +
        (await page.getByRole('link', { name: /View your listing|Open full page/ }).count())
      assert.ok(pinned >= 1, 'pinned job CTA')
      await shot(page, 'browse-v3-mobile-sheet-390x844.png')
      summary.checks.push({ name: 'mobile-filters-and-sheet', ok: true })
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
  console.log('browse v3 visual QA passed')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
