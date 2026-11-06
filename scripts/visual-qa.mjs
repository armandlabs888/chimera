import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/tmp/beam-visual-qa'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844 },
]

const ROUTES = ['/', '/browse', '/auth', '/post', '/safety']
const DARK_REMNANTS = ['#0C0C0E', '#0c0c0e', '#D9A957', '#DCAB5A', '#D6B06C']

const results = []

async function forceLoadImages(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    for (let y = 0; y < height; y += Math.max(300, window.innerHeight * 0.75)) {
      window.scrollTo(0, y)
      await sleep(80)
    }
    window.scrollTo(0, 0)
    await sleep(120)
    await Promise.all(
      Array.from(document.images).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve()
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
          // Force eager decode for lazy images
          if (img.loading === 'lazy') img.loading = 'eager'
          if (!img.src && img.dataset.src) img.src = img.dataset.src
          // Retrigger
          const src = img.currentSrc || img.src
          if (src) img.src = src
        })
      }),
    )
    await sleep(200)
  })
}

async function checkPage(page, route, viewport) {
  const entry = {
    route,
    viewport: viewport.name,
    ok: true,
    issues: [],
  }

  const response = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 60000 })
  if (!response || response.status() >= 400) {
    entry.ok = false
    entry.issues.push(`HTTP ${response?.status()}`)
  }

  await forceLoadImages(page)

  const metrics = await page.evaluate((darkHexes) => {
    const html = document.documentElement
    const visibleImgs = Array.from(document.images)
      .filter((img) => {
        const style = window.getComputedStyle(img)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false
        }
        const rect = img.getBoundingClientRect()
        // Include offscreen but laid-out images; exclude zero-box hidden ones
        return rect.width > 0 && rect.height > 0
      })
      .map((img) => ({
        src: img.currentSrc || img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
      }))

    const bodyText = document.body?.innerText || ''
    const htmlSnippet = document.documentElement.outerHTML
    const remnantHits = darkHexes.filter((hex) => htmlSnippet.includes(hex))

    const fontOf = (el) => (el ? getComputedStyle(el).fontFamily : '')
    const h1 = document.querySelector('h1')
    const h2 = document.querySelector('h2')
    const topnav = document.querySelector('[data-testid="app-topnav"]')

    return {
      scrollWidth: html.scrollWidth,
      innerWidth: window.innerWidth,
      visibleImgs,
      remnantHits,
      hasAppSidebar: document.querySelectorAll('[data-testid="app-sidebar"]').length,
      hasAppTopnav: !!topnav,
      hasLandingNav: !!document.querySelector('[data-testid="landing-nav"]'),
      hasBottomDock: !!document.querySelector('[data-testid="bottom-dock"]'),
      hasAccountMenu: !!document.querySelector('[data-testid="account-menu-trigger"]'),
      guestLabel: /\bGuest\b/.test(bodyText),
      heroSearchCount: document.querySelectorAll('[data-testid="hero-search-pill"]').length,
      austinGuestCopy: /across Austin neighborhoods|Open requests and nearby helpers across Austin/i.test(
        bodyText,
      ),
      bodyTextSample: bodyText.slice(0, 2000),
      fonts: {
        body: fontOf(document.body),
        h1: fontOf(h1),
        h2: fontOf(h2),
        topnav: fontOf(topnav),
      },
    }
  }, DARK_REMNANTS)

  const SERIF_RE = /Fraunces|Georgia|ui-serif|(?:^|,\s)serif\s*(?:,|$)/i
  const GEO_RE = /UberMove|DM Sans|__DM_Sans|UberMoveText|Inter|__Inter|system-ui/i
  for (const [label, family] of Object.entries(metrics.fonts || {})) {
    if (!family) continue
    if (SERIF_RE.test(family)) {
      entry.ok = false
      entry.issues.push(`Serif font on ${label}: ${family}`)
    } else if (!GEO_RE.test(family)) {
      entry.ok = false
      entry.issues.push(`Non-geometric font on ${label}: ${family}`)
    }
  }

  if (metrics.scrollWidth > metrics.innerWidth + 1) {
    entry.ok = false
    entry.issues.push(
      `Horizontal overflow: scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`,
    )
  }

  const broken = metrics.visibleImgs.filter((i) => !i.complete || i.naturalWidth <= 0)
  if (broken.length) {
    entry.ok = false
    entry.issues.push(
      `Broken visible images (${broken.length}): ${broken
        .slice(0, 4)
        .map((b) => b.src)
        .join(' | ')}`,
    )
  }

  // Hardcoded dark/gold leftovers in rendered markup (token aliases in CSS vars are OK)
  const hardRemnants = metrics.remnantHits.filter((hex) => {
    // allow only if solely in comments — treat any hit as soft warn unless class/style uses it
    return true
  })
  if (hardRemnants.length) {
    // Soft: only fail if used as inline style color-ish attribute values commonly
    entry.issues.push(`Remnant hex present in DOM source: ${hardRemnants.join(', ')}`)
  }

  if (route === '/browse') {
    if (metrics.guestLabel) {
      entry.ok = false
      entry.issues.push('Browse shows Guest label')
    }
    if (metrics.heroSearchCount > 0) {
      entry.ok = false
      entry.issues.push('Browse has duplicate hero search pill')
    }
    if (metrics.hasAppSidebar > 0) {
      entry.ok = false
      entry.issues.push('Browse still has app-sidebar')
    }
    if (metrics.austinGuestCopy) {
      entry.ok = false
      entry.issues.push('Browse has Austin guest copy')
    }
    // Guest: landing nav. Signed-in/demo: app topnav. Never both with a sidebar.
    if (metrics.hasLandingNav && metrics.hasAppTopnav) {
      entry.ok = false
      entry.issues.push('Browse has both landing nav and app topnav')
    }
    if (!metrics.hasLandingNav && !metrics.hasAppTopnav) {
      entry.ok = false
      entry.issues.push('Browse missing navigation chrome')
    }
    if (metrics.hasAppTopnav && !metrics.hasAccountMenu) {
      entry.ok = false
      entry.issues.push('App topnav missing account menu')
    }
  }

  if (route === '/') {
    // Must not overflow on mobile fan stack / scalloped band
    if (viewport.name === '390x844' && metrics.scrollWidth > metrics.innerWidth + 1) {
      entry.ok = false
    }
  }

  // Soft remnant warnings shouldn't fail the run if only leftover CSS class name "obsidian-popover"
  entry.issues = entry.issues.filter((i) => {
    if (i.startsWith('Remnant hex')) {
      // Fail only for true dark canvas leftovers
      return i.includes('#0C0C0E') || i.includes('#0c0c0e') || i.includes('#D9A957')
    }
    return true
  })
  if (entry.issues.some((i) => i.startsWith('Remnant hex'))) entry.ok = false

  const shot = join(OUT, `${route.replace(/\W+/g, '_') || 'home'}-${viewport.name}.png`)
  await page.screenshot({ path: shot, fullPage: true })
  entry.screenshot = shot
  entry.imgCount = metrics.visibleImgs.length
  entry.brokenCount = broken.length
  entry.scrollWidth = metrics.scrollWidth
  entry.innerWidth = metrics.innerWidth

  results.push(entry)
  console.log(
    `${entry.ok ? 'PASS' : 'FAIL'} ${route} @ ${viewport.name}` +
      (entry.issues.length ? ` — ${entry.issues.join('; ')}` : ` (imgs=${entry.imgCount})`),
  )
}

const browser = await chromium.launch({ headless: true })
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    for (const route of ROUTES) {
      await checkPage(page, route, vp)
    }
    await context.close()
  }
} finally {
  await browser.close()
}

const summary = {
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
  total: results.length,
  results,
}
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
console.log('\nSUMMARY', JSON.stringify({ passed: summary.passed, failed: summary.failed, total: summary.total }))
if (summary.failed > 0) process.exit(1)
