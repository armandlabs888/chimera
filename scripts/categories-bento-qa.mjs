/**
 * Geometry QA for #categories Popular services bento.
 * Asserts flush full-width rows and aligned track edges across viewports.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/tmp/beam-categories-bento-qa'
const ARTIFACTS = '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })
mkdirSync(ARTIFACTS, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x800', width: 1024, height: 800 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
]

const SCREENSHOT_VIEWPORTS = new Set(['1440x900', '768x1024', '390x844'])
const TOL = 1.5

async function forceLoadImages(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    for (let y = 0; y < height; y += Math.max(300, window.innerHeight * 0.75)) {
      window.scrollTo(0, y)
      await sleep(60)
    }
    window.scrollTo(0, 0)
    await sleep(100)
    await Promise.all(
      Array.from(document.images).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve()
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
          if (img.loading === 'lazy') img.loading = 'eager'
        })
      }),
    )
    await sleep(200)
  })
}

function clusterBy(values, keyFn, tol) {
  const clusters = []
  for (const v of values) {
    const k = keyFn(v)
    let found = clusters.find((c) => Math.abs(c.key - k) <= tol)
    if (!found) {
      found = { key: k, items: [] }
      clusters.push(found)
    }
    found.items.push(v)
  }
  return clusters
}

async function measureCategories(page) {
  return page.evaluate((tol) => {
    const section = document.querySelector('#categories')
    const grid = document.querySelector('[data-testid="categories-bento"]')
    if (!section || !grid) {
      return { error: 'Missing #categories or [data-testid="categories-bento"]' }
    }

    const gridRect = grid.getBoundingClientRect()
    const kids = Array.from(grid.children).map((el, index) => {
      const r = el.getBoundingClientRect()
      return {
        index,
        tag: el.tagName.toLowerCase(),
        isQuote: el.tagName.toLowerCase() === 'blockquote',
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        label: el.querySelector('span')?.textContent?.trim() || el.textContent?.trim()?.slice(0, 40) || '',
      }
    })

    const quote = grid.querySelector('blockquote')
    let quoteOverflow = null
    if (quote) {
      quoteOverflow = {
        scrollHeight: quote.scrollHeight,
        clientHeight: quote.clientHeight,
        clipped: quote.scrollHeight > quote.clientHeight + 1,
      }
    }

    return {
      grid: {
        left: gridRect.left,
        right: gridRect.right,
        top: gridRect.top,
        bottom: gridRect.bottom,
        width: gridRect.width,
        height: gridRect.height,
      },
      kids,
      quoteOverflow,
      childCount: kids.length,
      tol,
    }
  }, TOL)
}

function analyzeGeometry(data) {
  const issues = []
  if (data.error) {
    issues.push(data.error)
    return { ok: false, issues, rows: [] }
  }
  if (data.childCount !== 7) {
    issues.push(`Expected 7 bento items, found ${data.childCount}`)
  }

  const { grid, kids, quoteOverflow } = data
  const tol = data.tol ?? TOL

  // Unique row-track start lines (from tile tops), sorted.
  const trackStarts = []
  for (const k of [...kids].sort((a, b) => a.top - b.top)) {
    if (!trackStarts.some((t) => Math.abs(t - k.top) <= tol)) trackStarts.push(k.top)
  }

  const rows = trackStarts.map((trackTop, i) => {
    // Every tile that occupies this horizontal track (including row-span leftovers).
    const occupying = kids
      .filter((k) => k.top <= trackTop + tol && k.bottom > trackTop + tol)
      .sort((a, b) => a.left - b.left)

    const leftmost = occupying[0]
    const rightmost = occupying.reduce((a, b) => (b.right > a.right ? b : a), occupying[0])
    const leftGap = Math.abs(leftmost.left - grid.left)
    const rightGap = Math.abs(rightmost.right - grid.right)

    // Tiles that *start* on this track: group by height; same-height peers must share bottoms.
    const starting = occupying.filter((k) => Math.abs(k.top - trackTop) <= tol)
    const heightGroups = clusterBy(starting, (k) => k.height, tol)
    let sameTopBottomSpread = 0
    for (const g of heightGroups) {
      const bottoms = g.items.map((x) => x.bottom)
      const spread = Math.max(...bottoms) - Math.min(...bottoms)
      sameTopBottomSpread = Math.max(sameTopBottomSpread, spread)
      const tops = g.items.map((x) => x.top)
      const topSpread = Math.max(...tops) - Math.min(...tops)
      if (topSpread > tol) {
        issues.push(
          `Track ${i} same-height peers have ragged tops: ${topSpread.toFixed(2)}px (${g.items.map((x) => x.label).join(' | ')})`,
        )
      }
    }

    return {
      index: i,
      labels: occupying.map((x) => x.label),
      leftGap,
      rightGap,
      sameTopBottomSpread,
      leftOk: leftGap <= tol,
      rightOk: rightGap <= tol,
      bottomsAligned: sameTopBottomSpread <= tol,
      itemCount: occupying.length,
    }
  })

  for (const row of rows) {
    if (!row.leftOk) {
      issues.push(
        `Row ${row.index} left edge misaligned by ${row.leftGap.toFixed(2)}px (labels: ${row.labels.join(' | ')})`,
      )
    }
    if (!row.rightOk) {
      issues.push(
        `Row ${row.index} RIGHT edge empty/gap ${row.rightGap.toFixed(2)}px — not flush (labels: ${row.labels.join(' | ')})`,
      )
    }
    if (!row.bottomsAligned) {
      issues.push(
        `Row ${row.index} ragged bottoms among same-track peers: spread ${row.sameTopBottomSpread.toFixed(2)}px (labels: ${row.labels.join(' | ')})`,
      )
    }
  }

  if (quoteOverflow?.clipped) {
    issues.push(
      `Quote text clipped: scrollHeight=${quoteOverflow.scrollHeight} > clientHeight=${quoteOverflow.clientHeight}`,
    )
  }

  return { ok: issues.length === 0, issues, rows, quoteOverflow }
}

async function checkOtherLandingGrids(page) {
  return page.evaluate(() => {
    const sectionIds = ['how-it-works', 'why-beam', 'helpers', 'coverage']
    const notes = []
    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (!el) {
        notes.push({ id, present: false })
        continue
      }
      const grids = el.querySelectorAll('.grid')
      notes.push({ id, present: true, gridCount: grids.length })
    }
    // Heuristic: any 12-col grid on landing whose children don't visually span full width
    const allGrids = Array.from(document.querySelectorAll('main .grid, #categories .grid, section .grid'))
    const suspects = []
    for (const grid of allGrids) {
      if (grid.getAttribute('data-testid') === 'categories-bento') continue
      const kids = Array.from(grid.children)
      if (kids.length < 2) continue
      const gr = grid.getBoundingClientRect()
      if (gr.width < 100) continue
      const rights = kids.map((k) => k.getBoundingClientRect().right)
      const maxRight = Math.max(...rights)
      const gap = gr.right - maxRight
      if (gap > 40) {
        suspects.push({
          className: grid.className.slice(0, 120),
          trailingGap: Math.round(gap),
          childCount: kids.length,
        })
      }
    }
    return { notes, suspects }
  })
}

const report = []
let failed = false

const browser = await chromium.launch({ headless: true })
try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
    const response = await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
    if (!response || response.status() >= 400) {
      report.push({ viewport: vp.name, ok: false, issues: [`HTTP ${response?.status()}`] })
      failed = true
      await page.close()
      continue
    }

    await forceLoadImages(page)
    await page.locator('#categories').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)

    const data = await measureCategories(page)
    const analysis = analyzeGeometry(data)
    const other = vp.name === '1440x900' ? await checkOtherLandingGrids(page) : null

    if (SCREENSHOT_VIEWPORTS.has(vp.name)) {
      const section = page.locator('#categories')
      const shotPath = join(OUT, `categories-${vp.name}.png`)
      await section.screenshot({ path: shotPath })
      const artifactPath = join(ARTIFACTS, `categories-bento-${vp.name}.png`)
      copyFileSync(shotPath, artifactPath)
    }

    const entry = {
      viewport: vp.name,
      ok: analysis.ok,
      issues: analysis.issues,
      rows: analysis.rows,
      quoteOverflow: analysis.quoteOverflow,
      otherLandingGrids: other,
    }
    report.push(entry)
    if (!analysis.ok) failed = true
    if (other?.suspects?.length) {
      entry.otherGridWarnings = other.suspects
    }

    console.log(`\n=== ${vp.name} ===`)
    console.log(analysis.ok ? 'PASS' : 'FAIL')
    for (const issue of analysis.issues) console.log(' -', issue)
    for (const row of analysis.rows) {
      console.log(
        `  row ${row.index}: leftΔ=${row.leftGap.toFixed(1)} rightΔ=${row.rightGap.toFixed(1)} bottomSpread=${row.sameTopBottomSpread.toFixed(1)} :: ${row.labels.join(' | ')}`,
      )
    }
    if (other?.suspects?.length) {
      console.log(' Other landing grid trailing gaps:', other.suspects)
    }

    await page.close()
  }
} finally {
  await browser.close()
}

const outFile = join(OUT, 'report.json')
writeFileSync(outFile, JSON.stringify(report, null, 2))
console.log(`\nWrote ${outFile}`)
console.log(failed ? '\nOVERALL: FAIL' : '\nOVERALL: PASS')
process.exit(failed ? 1 : 0)
