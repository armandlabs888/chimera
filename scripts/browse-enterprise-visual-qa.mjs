#!/usr/bin/env node
/**
 * Browse enterprise visual QA — updated for Browse v3 single-column layout.
 * Screenshots → /opt/cursor/artifacts/browse-enterprise-visual-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/browse-enterprise-visual-qa'
const LOCAL = '/workspace/artifacts/browse-enterprise-visual-qa'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  await page.screenshot({ path: join(LOCAL, name), fullPage: false })
  console.log(`saved ${path}`)
  return path
}

async function seedRole(page, role) {
  await page.goto(`${BASE}/browse`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, role }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id === me) {
          if (role === 'helper') {
            p.accountRole = 'helper'
            p.isHelper = true
            p.skills = p.skills?.length ? p.skills : ['house-cleaning']
          } else {
            p.accountRole = 'customer'
            p.isHelper = false
            p.skills = []
          }
          p.city = p.city || 'San Jose'
          p.stateCode = p.stateCode || 'CA'
          p.locationLabel = p.locationLabel || 'San Jose, CA'
        } else if (!(p.isHelper || (p.skills || []).length)) {
          p.isHelper = true
          p.skills = ['house-cleaning', 'pet-sitting']
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, role },
  )
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
}

const report = { ok: true, shots: [], checks: [] }

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedRole(page, 'helper')
      await page.waitForSelector('[data-testid="browse-v3"]')
      const m = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="browse-v3"]')
        return {
          layout: root?.getAttribute('data-browse-layout'),
          hasTabs: !!document.querySelector('[data-testid="browse-mode-tabs"]'),
          hasTrending: /Trending helpers/i.test(document.body.innerText || ''),
          has3col: !!document.querySelector('[data-testid="browse-3col-grid"]'),
          nestedScroll: !!document.querySelector('[data-testid="browse-feed-scroll"]'),
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          rowCount: document.querySelectorAll('[data-testid="browse-job-row"]').length,
        }
      })
      assert.equal(m.layout, 'helper-jobs')
      assert.equal(m.hasTabs, true)
      assert.equal(m.hasTrending, false)
      assert.equal(m.has3col, false)
      assert.equal(m.nestedScroll, false)
      assert.equal(m.overflowX, false)
      report.shots.push(await shot(page, '01-helper-jobs-1440.png'))
      report.checks.push({ name: 'helper-jobs-only', ok: true })
      await page.close()
    }

    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedRole(page, 'customer')
      await page.waitForSelector('[data-testid="browse-v3"]')
      await page.waitForSelector('[data-testid="browse-mode-tabs"]')
      const beforeY = await page.evaluate(() => window.scrollY)
      await page.evaluate(() => window.scrollBy(0, 400))
      await page.waitForTimeout(200)
      const afterY = await page.evaluate(() => window.scrollY)
      assert.ok(afterY > beforeY, 'document scroll works on browse')
      report.shots.push(await shot(page, '02-customer-list-1440.png'))

      await page.locator('[data-testid="browse-job-row"]').first().click()
      await page.waitForTimeout(300)
      assert.ok(await page.evaluate(() => /[?&]job=/.test(location.search)))
      report.shots.push(await shot(page, '03-customer-drawer-1440.png'))
      await page.keyboard.press('Escape')

      await page.getByTestId('browse-tab-local-helpers').click()
      await page.waitForTimeout(300)
      report.shots.push(await shot(page, '04-customer-helpers-1440.png'))
      report.checks.push({ name: 'customer-discovery', ok: true })
      await page.close()
    }

    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      await seedRole(page, 'customer')
      await page.waitForSelector('[data-testid="browse-v3"]')
      const ox = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      )
      assert.equal(ox, false)
      report.shots.push(await shot(page, '05-mobile-390.png'))
      report.checks.push({ name: 'mobile-no-x-overflow', ok: true })
      await page.close()
    }
  } catch (err) {
    report.ok = false
    report.error = String(err?.stack || err)
    console.error('FAIL', err)
    process.exitCode = 1
  } finally {
    await browser.close()
    writeFileSync(join(OUT, 'browse-enterprise-visual-qa.json'), JSON.stringify(report, null, 2))
    writeFileSync(join(LOCAL, 'browse-enterprise-visual-qa.json'), JSON.stringify(report, null, 2))
    if (report.ok) console.log('browse-enterprise-visual-qa PASS')
  }
}

main()
