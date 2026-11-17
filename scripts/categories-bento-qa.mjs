#!/usr/bin/env node
/**
 * Popular services (Landing): 12-col bento with 4 photo tiles + light junk + custom CTA.
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
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForSelector('#categories', { timeout: 30000 })
      assert.equal(await page.getByTestId('popular-gigs').count(), 0, 'popular gigs removed')
      await page.locator('#categories').scrollIntoViewIfNeeded()
      const metrics = await page.evaluate(() => {
        const section = document.querySelector('#categories')
        const grid = document.querySelector('[data-testid="categories-bento"]')
        const cleaning = document.querySelector('[data-testid="categories-tile-cleaning"]')
        const auto = document.querySelector('[data-testid="categories-tile-auto"]')
        const moving = document.querySelector('[data-testid="categories-tile-moving"]')
        const junk = document.querySelector('[data-testid="categories-tile-junk"]')
        const pets = document.querySelector('[data-testid="categories-tile-pets"]')
        const custom = document.querySelector('[data-testid="categories-tile-custom"]')
        const customLink = document.querySelector('[data-testid="categories-custom-link"]')
        const cleaningImg = cleaning?.querySelector('img')
        const movingImg = moving?.querySelector('img')
        const junkImg = junk?.querySelector('img')
        const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0
        const sectionStyle = section ? getComputedStyle(section) : null
        const tiles = [...(grid?.querySelectorAll('a') || [])]
        const petsRect = pets?.getBoundingClientRect()
        const movingRect = moving?.getBoundingClientRect()
        const gridRect = grid?.getBoundingClientRect()
        const overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        return {
          tiles: tiles.length,
          cols,
          hasCleaning: !!cleaning,
          hasAuto: !!auto,
          hasMoving: !!moving,
          hasJunk: !!junk,
          hasPets: !!pets,
          hasCustomTile: !!custom,
          hasCustomLink: !!customLink,
          customHref: custom?.getAttribute('href') || '',
          junkHref: junk?.getAttribute('href') || '',
          cleaningSrc: cleaningImg?.getAttribute('src') || cleaningImg?.currentSrc || '',
          movingSrc: movingImg?.getAttribute('src') || movingImg?.currentSrc || '',
          junkHasImg: !!junkImg,
          labels: tiles.map((a) => a.getAttribute('aria-label') || ''),
          filterTabs: document.querySelectorAll('[data-testid="categories-filter-tabs"]').length,
          hrefs: tiles.map((a) => a.getAttribute('href')),
          sectionText: section?.innerText || '',
          padTop: sectionStyle ? Number.parseFloat(sectionStyle.paddingTop) : 0,
          padBottom: sectionStyle ? Number.parseFloat(sectionStyle.paddingBottom) : 0,
          popularGigs: !!document.querySelector('[data-testid="popular-gigs"]'),
          petsWidth: petsRect?.width || 0,
          movingWidth: movingRect?.width || 0,
          movingHeight: movingRect?.height || 0,
          gridWidth: gridRect?.width || 0,
          overflowX,
        }
      })
      assert.equal(metrics.popularGigs, false, `no popular gigs @ ${vp.name}`)
      assert.equal(metrics.tiles, 6, `6 popular tiles @ ${vp.name}`)
      assert.equal(metrics.cols, vp.width >= 768 ? 12 : 1, `grid cols @ ${vp.name}`)
      assert.equal(metrics.hasCleaning, true)
      assert.equal(metrics.hasAuto, true)
      assert.equal(metrics.hasMoving, true)
      assert.equal(metrics.hasJunk, true)
      assert.equal(metrics.hasPets, true)
      assert.equal(metrics.hasCustomTile, true)
      assert.equal(metrics.hasCustomLink, false, 'footer custom link replaced by tile')
      assert.deepEqual(metrics.labels, [
        'Moving & Hauling',
        'House cleaning',
        'Auto detailing',
        'Pet care',
        'Yard & Junk Removal',
        'Post a custom task',
      ])
      assert.equal(metrics.customHref, '/post')
      assert.equal(metrics.junkHref, '/browse?category=junk-removal')
      assert.equal(metrics.filterTabs, 0, 'popular has no filter chip row')
      assert.match(metrics.cleaningSrc, /avail-house-cleaning/, 'popular cleaning uses crew asset')
      assert.match(metrics.movingSrc, /avail-moving/, 'moving uses sofa photo')
      assert.equal(metrics.junkHasImg, false, 'junk is a light card without photo')
      assert.ok(metrics.hrefs.includes('/browse?category=home'))
      assert.ok(metrics.hrefs.includes('/browse?category=auto'))
      assert.ok(metrics.hrefs.includes('/browse?category=moving'))
      assert.ok(metrics.hrefs.includes('/browse?category=junk-removal'))
      assert.ok(metrics.hrefs.includes('/browse?category=pets'))
      assert.ok(metrics.hrefs.includes('/post'))
      assert.ok(!metrics.hrefs.includes('/browse?category=other'))
      if (vp.width >= 768) {
        assert.ok(
          metrics.movingWidth > metrics.gridWidth * 0.4,
          `moving tile is wide on desktop @ ${vp.name}`,
        )
      } else {
        assert.ok(metrics.movingHeight >= 210, `photo cards ~220px tall @ ${vp.name}`)
        assert.equal(metrics.overflowX, false, `no horizontal overflow @ ${vp.name}`)
      }
      assert.match(metrics.sectionText, /Start here/i)
      assert.match(metrics.sectionText, /Popular Neighborhood Services/)
      assert.match(
        metrics.sectionText,
        /Pick a category to start a request and see what neighbors nearby typically charge\./i,
      )
      assert.match(metrics.sectionText, /Post a custom task/)
      assert.match(metrics.sectionText, /Need something else\? Free to post/i)
      assert.doesNotMatch(metrics.sectionText, /Something else\?/)
      assert.doesNotMatch(metrics.sectionText, /Explore →/)
      assert.doesNotMatch(metrics.sectionText, /—|–/)
      assert.doesNotMatch(metrics.sectionText, /Carpet cleaning|Grooming/)
      assert.doesNotMatch(metrics.sectionText, /BlockSide|HouseCall|\bBeam\b/)
      assert.doesNotMatch(metrics.sectionText, /\$\d+|helpers nearby/i)
      const expectedPad = vp.width >= 768 ? 72 : 56
      assert.ok(
        Math.abs(metrics.padTop - expectedPad) <= 1,
        `categories pad-top ~${expectedPad} @ ${vp.name}, got ${metrics.padTop}`,
      )
      assert.ok(
        Math.abs(metrics.padBottom - expectedPad) <= 1,
        `categories pad-bottom ~${expectedPad} @ ${vp.name}, got ${metrics.padBottom}`,
      )
      const shot = join(OUT, `categories-bento-${vp.name}.png`)
      await page.locator('#categories').screenshot({ path: shot })
      await page.screenshot({ path: join(LOCAL, `categories-bento-${vp.name}.png`) })
      summary.checks.push({ name: `popular-${vp.name}`, ok: true, metrics })
      await page.close()
    }
    writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
    console.log('ok categories-bento-qa (landing popular services bento)')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
