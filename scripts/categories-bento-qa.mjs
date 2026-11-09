#!/usr/bin/env node
/**
 * Popular services (Landing v2) — compact 3-up cards + Other custom tile.
 * Screenshots → /opt/cursor/artifacts/categories-bento-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? process.env.BEAM_BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/categories-bento-qa'
const LOCAL = '/workspace/artifacts/categories-bento-qa'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: true })
  const summary = { checks: [] }
  try {
    for (const vp of [
      { name: '1440x900', width: 1440, height: 900 },
      { name: '768x1024', width: 768, height: 1024 },
      { name: '390x844', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.locator('#categories').scrollIntoViewIfNeeded()
      const metrics = await page.evaluate(() => {
        const grid = document.querySelector('[data-testid="categories-bento"]')
        const cleaning = document.querySelector('[data-testid="categories-tile-cleaning"]')
        const pets = document.querySelector('[data-testid="categories-tile-pets"]')
        const custom = document.querySelector('[data-testid="categories-tile-custom"]')
        const cleaningImg = cleaning?.querySelector('img')
        return {
          tiles: grid ? grid.querySelectorAll('a').length : 0,
          hasCleaning: !!cleaning,
          hasPets: !!pets,
          hasCustom: !!custom,
          cleaningSrc: cleaningImg?.getAttribute('src') || cleaningImg?.currentSrc || '',
          filterTabs: document.querySelectorAll('[data-testid="categories-filter-tabs"]').length,
          hrefs: [...(grid?.querySelectorAll('a') || [])].map((a) => a.getAttribute('href')),
        }
      })
      assert.equal(metrics.tiles, 3, `3 popular tiles @ ${vp.name}`)
      assert.equal(metrics.hasCleaning, true)
      assert.equal(metrics.hasPets, true)
      assert.equal(metrics.hasCustom, true)
      assert.equal(metrics.filterTabs, 0, 'v2 popular has no filter chip row')
      assert.match(metrics.cleaningSrc, /avail-house-cleaning/, 'popular cleaning uses crew asset')
      assert.ok(metrics.hrefs.includes('/browse?category=home'))
      assert.ok(metrics.hrefs.includes('/browse?category=pets'))
      assert.ok(metrics.hrefs.includes('/browse?category=other'))
      const shot = join(OUT, `categories-bento-${vp.name}.png`)
      await page.locator('#categories').screenshot({ path: shot })
      await page.screenshot({ path: join(LOCAL, `categories-bento-${vp.name}.png`) })
      summary.checks.push({ name: `popular-${vp.name}`, ok: true, metrics })
      await page.close()
    }
    writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
    console.log('ok categories-bento-qa (landing v2 popular 3-up)')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
