/**
 * Verify hero headline size + vertical centering + describe dropdown room.
 * Screenshots → /opt/cursor/artifacts/ and /workspace/artifacts/
 */
import { chromium } from 'playwright'
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const LOCAL_OUT = '/workspace/artifacts'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL_OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
]

const summary = { ok: true, checks: [], failures: [], shots: [], metrics: {} }

function record(ok, msg, detail = null) {
  const entry = { ok, msg, detail }
  summary.checks.push(entry)
  if (!ok) {
    summary.ok = false
    summary.failures.push(msg)
    console.error(`FAIL  ${msg}${detail ? ` — ${JSON.stringify(detail)}` : ''}`)
  } else {
    console.log(`PASS  ${msg}${detail ? ` — ${JSON.stringify(detail)}` : ''}`)
  }
}

function saveShot(tmpPath, name) {
  const dest = join(OUT, name)
  copyFileSync(tmpPath, dest)
  copyFileSync(tmpPath, join(LOCAL_OUT, name))
  summary.shots.push(dest)
  return dest
}

const browser = await chromium.launch({ headless: true })
const tmpDir = '/tmp/beam-hero-vertical-center'
mkdirSync(tmpDir, { recursive: true })

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('[data-testid="landing-hero"]', { timeout: 15000 })

    const metrics = await page.evaluate(() => {
      const hero = document.querySelector('section.landing-hero-photo')
      const content = document.querySelector('[data-testid="landing-hero"]')
      const stack = content?.querySelector('.beam-container')
      const h1 = content?.querySelector('h1')
      const header =
        document.querySelector('.landing-overlay-nav') ||
        document.querySelector('[data-testid="landing-nav"]')
      if (!hero || !content || !stack || !h1) return { ok: false, reason: 'missing nodes' }

      const hr = hero.getBoundingClientRect()
      const sr = stack.getBoundingClientRect()
      const h1Style = getComputedStyle(h1)
      const headerBottom = header
        ? header.getBoundingClientRect().bottom
        : parseFloat(
            getComputedStyle(hero).getPropertyValue('--landing-hero-content-pad-top') ||
              getComputedStyle(hero).getPropertyValue('--landing-float-header-offset'),
          ) || 56

      const belowHeaderCenter = headerBottom + (window.innerHeight - headerBottom) / 2
      const stackCenter = sr.top + sr.height / 2
      const deltaFromBelowHeaderCenter = Math.round(stackCenter - belowHeaderCenter)

      return {
        ok: true,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        headerBottom: Math.round(headerBottom),
        stackTop: Math.round(sr.top),
        stackBottom: Math.round(sr.bottom),
        stackHeight: Math.round(sr.height),
        stackCenter: Math.round(stackCenter),
        belowHeaderCenter: Math.round(belowHeaderCenter),
        deltaFromBelowHeaderCenter,
        heroHeight: Math.round(hr.height),
        h1FontSize: h1Style.fontSize,
        h1LineHeight: h1Style.lineHeight,
        h1FontWeight: h1Style.fontWeight,
        h1Text: (h1.innerText || '').replace(/\s+/g, ' ').trim(),
      }
    })

    summary.metrics[vp.name] = metrics
    record(metrics.ok, `${vp.name}: hero nodes present`, metrics.ok ? null : metrics)

    if (metrics.ok) {
      const fontPx = parseFloat(metrics.h1FontSize)
      const expectedMax = vp.width >= 1280 ? 56 : null
      const expectedMin = vp.width <= 390 ? 36 : null
      if (expectedMax != null) {
        record(
          Math.abs(fontPx - expectedMax) <= 1.5,
          `${vp.name}: h1 ≈ 56px`,
          { fontPx },
        )
      }
      if (expectedMin != null) {
        record(
          Math.abs(fontPx - expectedMin) <= 1.5,
          `${vp.name}: h1 ≈ 36px`,
          { fontPx },
        )
      }
      if (vp.width === 768) {
        record(fontPx > 36 && fontPx < 56, `${vp.name}: h1 between 36–56px`, { fontPx })
      }

      const lh = parseFloat(metrics.h1LineHeight)
      const lhRatio = lh / fontPx
      record(
        lhRatio >= 1.05 && lhRatio <= 1.12,
        `${vp.name}: h1 line-height ~1.08`,
        { lhRatio: Number(lhRatio.toFixed(3)), fontPx, lh },
      )

      // Stack sits above below-header center (~48px mobile / ~72px desktop lift
      // from geometric center, plus the prior modest bottom-pad nudge).
      const maxAbove = vp.width <= 390 ? 90 : 130
      record(
        metrics.deltaFromBelowHeaderCenter <= 8 &&
          metrics.deltaFromBelowHeaderCenter >= -maxAbove,
        `${vp.name}: stack above below-header center with header clearance`,
        { delta: metrics.deltaFromBelowHeaderCenter, maxAbove },
      )

      record(
        metrics.stackTop >= metrics.headerBottom - 2,
        `${vp.name}: stack clears fixed header`,
        { stackTop: metrics.stackTop, headerBottom: metrics.headerBottom },
      )
    }

    const idleShot = join(tmpDir, `hero-center-${vp.name}.png`)
    await page.screenshot({ path: idleShot, fullPage: false })
    saveShot(idleShot, `hero-center-${vp.name}.png`)

    // Desktop: open describe dropdown and ensure it has room downward.
    if (vp.width >= 1280) {
      const query = page.getByTestId('describe-query-input')
      await query.click()
      await query.fill('Help moving a couch')
      await page.waitForTimeout(400)

      const drop = await page.evaluate(() => {
        const list =
          document.querySelector('[data-testid="describe-suggest-listbox"]') ||
          document.querySelector('#describe-suggest-listbox') ||
          document.querySelector('.describe-suggest')
        const pill =
          document.querySelector('[data-testid="hero-search-pill"]') ||
          document.querySelector('.describe-pill') ||
          document.querySelector('[data-testid="landing-hero"] form')
        if (!list || !pill) {
          return {
            ok: false,
            reason: 'missing dropdown or pill',
            hasList: !!list,
            hasPill: !!pill,
          }
        }
        const lr = list.getBoundingClientRect()
        const pr = pill.getBoundingClientRect()
        return {
          ok: true,
          listTop: Math.round(lr.top),
          listBottom: Math.round(lr.bottom),
          listHeight: Math.round(lr.height),
          pillBottom: Math.round(pr.bottom),
          opensDown: lr.top >= pr.bottom - 8,
          roomBelowPill: Math.round(window.innerHeight - pr.bottom),
          fitsInViewport: lr.bottom <= window.innerHeight + 1,
        }
      })

      record(drop.ok, `${vp.name}: describe dropdown present`, drop)
      if (drop.ok) {
        record(
          drop.opensDown && drop.roomBelowPill >= drop.listHeight - 8,
          `${vp.name}: describe dropdown has room to open downward`,
          drop,
        )
        const dropShot = join(tmpDir, `hero-dropdown-${vp.name}.png`)
        await page.screenshot({ path: dropShot, fullPage: false })
        saveShot(dropShot, `hero-dropdown-${vp.name}.png`)
      }
    }

    await context.close()
  }
} finally {
  await browser.close()
  writeFileSync(join(OUT, 'hero-vertical-center-qa.json'), JSON.stringify(summary, null, 2))
  writeFileSync(join(LOCAL_OUT, 'hero-vertical-center-qa.json'), JSON.stringify(summary, null, 2))
}

if (!summary.ok) {
  console.error('\nFAILED checks:', summary.failures)
  process.exit(1)
}
console.log('\nAll hero vertical-center + headline checks passed.')
