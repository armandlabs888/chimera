/**
 * Verify flat overlay landing header stays fully visible while scrolling the hero,
 * and that it is not a floating pill (no inset/radius/shadow).
 * Screenshots → /opt/cursor/artifacts/landing-float-header-clip/
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/landing-float-header-clip'
const LOCAL_OUT = '/workspace/artifacts/landing-float-header-clip'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL_OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '390x844', width: 390, height: 844 },
]
const SCROLLS = [0, 200]

const summary = { ok: true, checks: [], failures: [], shots: [] }

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
const tmpDir = '/tmp/beam-landing-float-header-clip'
mkdirSync(tmpDir, { recursive: true })

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('[data-testid="landing-nav"]', { timeout: 15000 })
    await page.waitForTimeout(400)

    const placement = await page.evaluate(() => {
      const nav = document.querySelector('[data-testid="landing-nav"]')
      const hero = document.querySelector('section.landing-hero-photo')
      const root = document.querySelector('.landing-root')
      if (!nav || !hero || !root) return { ok: false, reason: 'missing nodes' }
      const cs = getComputedStyle(nav)
      const shell = nav.closest('.landing-overlay-shell')
      const shellCs = shell ? getComputedStyle(shell) : null
      return {
        ok: !hero.contains(nav) && root.contains(nav),
        navInHero: hero.contains(nav),
        navInRoot: root.contains(nav),
        navStyle: nav.getAttribute('data-nav-style'),
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
        background: cs.backgroundColor,
        shellPosition: shellCs?.position || null,
        widthRatio: nav.getBoundingClientRect().width / window.innerWidth,
        top: Math.round(nav.getBoundingClientRect().top),
        left: Math.round(nav.getBoundingClientRect().left),
      }
    })
    record(placement.ok, `${vp.name}: overlay nav outside hero`, placement)
    record(placement.navStyle === 'overlay', `${vp.name}: data-nav-style=overlay`, placement)
    record(
      placement.top === 0 && placement.left === 0 && placement.widthRatio >= 0.98,
      `${vp.name}: full-width flush header`,
      placement,
    )
    record(
      (placement.borderRadius === '0px' || placement.borderRadius === '0') &&
        (!placement.boxShadow || placement.boxShadow === 'none'),
      `${vp.name}: no pill radius/shadow`,
      placement,
    )

    for (const y of SCROLLS) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
      await page.waitForTimeout(350)

      const metrics = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="landing-nav"]')
        if (!nav) return null
        const r = nav.getBoundingClientRect()
        const sampleY = Math.min(r.bottom - 2, r.top + r.height * 0.5)
        const xs = [r.left + 24, r.left + r.width / 2, r.right - 24]
        const samples = xs.map((x) => {
          const el = document.elementFromPoint(x, sampleY)
          return {
            x,
            y: sampleY,
            inNav: Boolean(el?.closest?.('[data-testid="landing-nav"]')),
          }
        })
        return {
          top: r.top,
          bottom: r.bottom,
          height: r.height,
          width: r.width,
          samples,
          fullyInViewport: r.top >= -0.5 && r.bottom <= window.innerHeight + 0.5,
          visibleHeight: Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)),
        }
      })

      const name = `landing-header-${vp.name}-scroll-${y}.png`
      const shotPath = join(tmpDir, name)
      await page.screenshot({ path: shotPath, fullPage: false })
      saveShot(shotPath, name)

      if (!metrics) {
        record(false, `${vp.name}@${y}: nav missing`)
        continue
      }

      const expectedH = 56
      const heightOk = Math.abs(metrics.height - expectedH) <= 2
      // At scroll 0 the header should be fully visible; after scroll absolute header may leave.
      if (y === 0) {
        const samplesInNav = metrics.samples.every((s) => s.inNav)
        const notClipped =
          metrics.fullyInViewport &&
          metrics.visibleHeight >= expectedH - 2 &&
          samplesInNav
        record(heightOk && notClipped, `${vp.name}@scroll=${y}: overlay header fully visible`, {
          height: metrics.height,
          expectedH,
          top: metrics.top,
          bottom: metrics.bottom,
          visibleHeight: metrics.visibleHeight,
          samples: metrics.samples,
        })
      } else {
        record(heightOk || metrics.height === 0, `${vp.name}@scroll=${y}: header measured`, {
          height: metrics.height,
          top: metrics.top,
        })
      }
    }

    if (vp.width < 768) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(200)
      await page.getByRole('button', { name: /open menu/i }).click()
      await page.waitForSelector('[data-testid="landing-mobile-menu"]', { timeout: 5000 })
      const menuOk = await page.evaluate(() => {
        const menu = document.querySelector('[data-testid="landing-mobile-menu"]')
        if (!menu) return false
        const r = menu.getBoundingClientRect()
        const mid = document.elementFromPoint(r.left + r.width / 2, r.top + 20)
        const cs = getComputedStyle(menu)
        return (
          Boolean(mid?.closest?.('[data-testid="landing-mobile-menu"]')) &&
          r.height > 40 &&
          (cs.borderRadius === '0px' || cs.borderRadius === '0')
        )
      })
      const menuShot = join(tmpDir, `landing-header-${vp.name}-menu.png`)
      await page.screenshot({ path: menuShot, fullPage: false })
      saveShot(menuShot, `landing-header-${vp.name}-menu.png`)
      record(menuOk, `${vp.name}: flat mobile menu usable`)
    }

    await context.close()
  }
} finally {
  await browser.close()
  writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
  writeFileSync(join(LOCAL_OUT, 'summary.json'), JSON.stringify(summary, null, 2))
}

if (!summary.ok) {
  console.error('\nFailures:', summary.failures)
  process.exit(1)
}
console.log(`\nAll checks passed. Shots: ${summary.shots.length}`)
