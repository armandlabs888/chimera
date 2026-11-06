/**
 * Uber Move typography visual QA — geometric sans stack assertions +
 * multi-viewport screenshots under /opt/cursor/artifacts/uber-font-qa/.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/uber-font-qa'
const LOCAL_OUT = '/workspace/artifacts/uber-font-qa'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL_OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
]

const ROUTES = ['/', '/auth', '/onboarding', '/browse', '/home', '/post']

const SERIF_RE = /Fraunces|Georgia|ui-serif|(?:^|,\s)serif\s*(?:,|$)/i
const GEO_RE = /UberMove|DM Sans|__DM_Sans|UberMoveText|Inter|__Inter|system-ui/i

const summary = { ok: true, checks: [], failures: [], shots: [] }

function record(ok, msg, detail = null) {
  summary.checks.push({ ok, msg, detail })
  if (!ok) {
    summary.ok = false
    summary.failures.push(msg)
    console.error(`FAIL  ${msg}${detail ? ` — ${detail}` : ''}`)
  } else {
    console.log(`PASS  ${msg}`)
  }
}

function saveShot(tmpPath, name) {
  const dest = join(OUT, name)
  copyFileSync(tmpPath, dest)
  copyFileSync(tmpPath, join(LOCAL_OUT, name))
  summary.shots.push(dest)
  return dest
}

async function measureFonts(page) {
  return page.evaluate(() => {
    const fontOf = (el) => (el ? getComputedStyle(el).fontFamily : '')
    const html = document.documentElement
    return {
      overflowX: html.scrollWidth > html.clientWidth + 1,
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
      fonts: {
        body: fontOf(document.body),
        h1: fontOf(document.querySelector('h1')),
        h2: fontOf(document.querySelector('h2')),
        topnav: fontOf(document.querySelector('[data-testid="app-topnav"]')),
        landingNav: fontOf(document.querySelector('[data-testid="landing-nav"]')),
      },
    }
  })
}

const browser = await chromium.launch({ headless: true })
const tmpDir = join('/tmp', 'beam-uber-font-qa')
mkdirSync(tmpDir, { recursive: true })

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForSelector('body', { timeout: 15000 })
      await page.waitForTimeout(700)

      const m = await measureFonts(page)
      const label = `${route} @ ${vp.name}`

      record(!m.overflowX, `${label}: no horizontal overflow`, `sw=${m.scrollWidth} cw=${m.clientWidth}`)

      for (const [slot, family] of Object.entries(m.fonts)) {
        if (!family) continue
        record(!SERIF_RE.test(family), `${label}: ${slot} has no serif faces`, family)
        record(GEO_RE.test(family), `${label}: ${slot} uses geometric sans`, family)
      }

      const shotName = `${route.replace(/\W+/g, '_') || 'home'}-${vp.name}.png`
      const tmpShot = join(tmpDir, shotName)
      await page.screenshot({ path: tmpShot, fullPage: true })
      saveShot(tmpShot, shotName)
    }

    await context.close()
  }
} finally {
  await browser.close()
}

writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
if (existsSync(LOCAL_OUT)) {
  writeFileSync(join(LOCAL_OUT, 'summary.json'), JSON.stringify(summary, null, 2))
}
console.log(
  `\nSUMMARY passed=${summary.checks.filter((c) => c.ok).length} failed=${summary.failures.length} shots=${summary.shots.length}`,
)
if (!summary.ok) process.exit(1)
