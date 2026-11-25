/**
 * Verify solid white sticky landing header stays fully visible while scrolling,
 * sits above the hero (never over the photo), and keeps white chrome when scrolled.
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

function isWhite(bg) {
  if (!bg) return false
  const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!m) return bg === 'white' || bg === '#ffffff' || bg === '#fff'
  return Number(m[1]) >= 250 && Number(m[2]) >= 250 && Number(m[3]) >= 250
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
      const frame = document.querySelector('.landing-hero-frame')
      const root = document.querySelector('.landing-root')
      if (!nav || !hero || !root) return { ok: false, reason: 'missing nodes' }
      const cs = getComputedStyle(nav)
      const nr = nav.getBoundingClientRect()
      const fr = frame?.getBoundingClientRect()
      return {
        ok: !hero.contains(nav) && root.contains(nav),
        navInHero: hero.contains(nav),
        navInRoot: root.contains(nav),
        navStyle: nav.getAttribute('data-nav-style'),
        borderRadius: cs.borderRadius,
        background: cs.backgroundColor,
        borderBottom: cs.borderBottomColor,
        position: cs.position,
        top: Math.round(nr.top),
        left: Math.round(nr.left),
        widthRatio: nr.width / window.innerWidth,
        frameTop: fr ? Math.round(fr.top) : null,
        navBottom: Math.round(nr.bottom),
        heroStartsBelowNav: fr ? fr.top >= nr.bottom - 1 : false,
      }
    })
    record(placement.ok, `${vp.name}: solid nav outside hero`, placement)
    record(placement.navStyle === 'flat', `${vp.name}: data-nav-style=flat`, placement)
    record(
      placement.top === 0 &&
        placement.left === 0 &&
        placement.widthRatio >= 0.98 &&
        placement.position === 'sticky',
      `${vp.name}: full-width sticky header at top`,
      placement,
    )
    record(isWhite(placement.background), `${vp.name}: white header background`, placement)
    record(
      placement.heroStartsBelowNav === true,
      `${vp.name}: hero frame below header (not behind)`,
      placement,
    )
    record(
      placement.borderRadius === '0px' || placement.borderRadius === '0',
      `${vp.name}: no pill radius on header`,
      placement,
    )

    for (const y of SCROLLS) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
      await page.waitForTimeout(350)

      const metrics = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="landing-nav"]')
        if (!nav) return null
        const r = nav.getBoundingClientRect()
        const cs = getComputedStyle(nav)
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
          background: cs.backgroundColor,
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

      const expectedH = vp.width >= 1024 ? 64 : 56
      const heightOk = Math.abs(metrics.height - expectedH) <= 2
      const samplesInNav = metrics.samples.every((s) => s.inNav)
      const notClipped =
        metrics.fullyInViewport &&
        metrics.visibleHeight >= expectedH - 2 &&
        samplesInNav &&
        metrics.top === 0
      record(heightOk && notClipped, `${vp.name}@scroll=${y}: sticky white header fully visible`, {
        height: metrics.height,
        expectedH,
        top: metrics.top,
        bottom: metrics.bottom,
        visibleHeight: metrics.visibleHeight,
        background: metrics.background,
        samples: metrics.samples,
      })
      record(isWhite(metrics.background), `${vp.name}@scroll=${y}: header stays white`, {
        background: metrics.background,
      })
    }

    await context.close()
  }
} finally {
  await browser.close()
}

const summaryPath = join(OUT, 'summary.json')
writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
writeFileSync(join(LOCAL_OUT, 'summary.json'), JSON.stringify(summary, null, 2))
if (!summary.ok) {
  console.error(`\n${summary.failures.length} failure(s)`)
  process.exit(1)
}
console.log(`\nAll checks passed (${summary.checks.length})`)
