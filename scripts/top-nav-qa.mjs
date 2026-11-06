/**
 * Top-nav marketplace QA — asserts sidebar removal, app-topnav chrome,
 * account menu, bottom dock, and viewport hygiene across desktop/tablet/mobile.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/top-nav-qa'
const LOCAL_OUT = '/workspace/artifacts/top-nav-qa'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL_OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
]

const AUTH_ROUTES = ['/browse', '/home', '/messages', '/post', '/you']
const DARK_REMNANTS = ['#0C0C0E', '#0c0c0e', '#D9A957', '#DCAB5A']

const summary = { ok: true, checks: [], failures: [] }

function record(ok, msg, detail = null) {
  const entry = { ok, msg, detail }
  summary.checks.push(entry)
  if (!ok) {
    summary.ok = false
    summary.failures.push(msg)
    console.error(`FAIL  ${msg}${detail ? ` — ${detail}` : ''}`)
  } else {
    console.log(`PASS  ${msg}`)
  }
}

function saveShot(pageShot, name) {
  const dest = join(OUT, name)
  copyFileSync(pageShot, dest)
  copyFileSync(pageShot, join(LOCAL_OUT, name))
  return dest
}

async function measureChrome(page) {
  return page.evaluate((darkHexes) => {
    const html = document.documentElement
    const bodyText = document.body?.innerText || ''
    const htmlSrc = html.outerHTML
    return {
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
      overflowX: html.scrollWidth > html.clientWidth + 1,
      sidebarCount: document.querySelectorAll('[data-testid="app-sidebar"]').length,
      asideSidebarRail: [...document.querySelectorAll('aside.app-sidebar, aside[data-testid="app-sidebar"]')]
        .length,
      topnav: !!document.querySelector('[data-testid="app-topnav"]'),
      landingNav: !!document.querySelector('[data-testid="landing-nav"]'),
      footer: !!document.querySelector('[data-testid="app-footer"]'),
      footerSafety: !!document.querySelector('[data-testid="app-footer"] a[href="/safety"]'),
      topnavHome: (() => {
        const nav = document.querySelector('[data-testid="app-topnav"]')
        if (!nav) return false
        return [...nav.querySelectorAll('a')].some((a) => {
          const href = a.getAttribute('href') || ''
          const label = (a.textContent || '').trim()
          return href === '/home' || /^Home$/i.test(label)
        })
      })(),
      topnavSafety: (() => {
        const nav = document.querySelector('[data-testid="app-topnav"]')
        if (!nav) return false
        return [...nav.querySelectorAll('a')].some((a) => {
          const href = a.getAttribute('href') || ''
          const label = (a.textContent || '').trim()
          return href === '/safety' || /^Safety$/i.test(label)
        })
      })(),
      contentLeftGutter: (() => {
        const el =
          document.querySelector('[data-testid="app-topnav"] .beam-container') ||
          document.querySelector('.beam-container')
        if (!el) return null
        const cs = getComputedStyle(el)
        return el.getBoundingClientRect().left + (parseFloat(cs.paddingLeft) || 0)
      })(),
      accountTrigger: !!document.querySelector('[data-testid="account-menu-trigger"]'),
      accountMenu: !!document.querySelector('[data-testid="account-menu"]'),
      notifBell: !!document.querySelector('[data-testid="notifications-bell"]'),
      postCta: !!document.querySelector('[data-testid="topnav-post-cta"]'),
      locationPill: !!document.querySelector('[data-testid="topnav-location"]'),
      bottomDock: !!document.querySelector('[data-testid="bottom-dock"]'),
      bottomDockVisible: (() => {
        const el = document.querySelector('[data-testid="bottom-dock"]')
        if (!el) return false
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') return false
        // Parent may be md:hidden
        let node = el
        while (node) {
          const s = window.getComputedStyle(node)
          if (s.display === 'none') return false
          node = node.parentElement
        }
        return true
      })(),
      commandSearch: !!document.querySelector('#app-command-search'),
      // Only guest-facing location assumptions — seed cards may legitimately mention Austin.
      austinCopy: /across Austin neighborhoods|Open requests and nearby helpers across Austin|helpers across Austin/i.test(
        bodyText,
      ),
      remnantHits: darkHexes.filter((hex) => htmlSrc.includes(hex)),
      headerPostButtons: [...document.querySelectorAll('a,button')]
        .filter((el) => /^Post a task$/i.test((el.textContent || '').trim()))
        .length,
      freshEmpty: !!document.querySelector('[data-testid="browse-fresh-empty"]'),
      bodySample: bodyText.slice(0, 400),
      fonts: (() => {
        const fontOf = (el) => (el ? getComputedStyle(el).fontFamily : '')
        return {
          body: fontOf(document.body),
          h1: fontOf(document.querySelector('h1')),
          h2: fontOf(document.querySelector('h2')),
          topnav: fontOf(document.querySelector('[data-testid="app-topnav"]')),
        }
      })(),
    }
  }, DARK_REMNANTS)
}

const SERIF_FONT_RE = /Fraunces|Georgia|ui-serif|(?:^|,\s)serif\s*(?:,|$)/i
const GEO_FONT_RE = /UberMove|DM Sans|__DM_Sans|UberMoveText|Inter|__Inter|system-ui/i

function assertGeometricFonts(fonts, label) {
  for (const [slot, family] of Object.entries(fonts || {})) {
    if (!family) continue
    record(
      !SERIF_FONT_RE.test(family),
      `${label}: ${slot} has no serif faces`,
      family,
    )
    record(GEO_FONT_RE.test(family), `${label}: ${slot} uses geometric sans stack`, family)
  }
}

const browser = await chromium.launch({ headless: true })
const tmpDir = join('/tmp', 'beam-top-nav-qa')
mkdirSync(tmpDir, { recursive: true })

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    for (const route of AUTH_ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForSelector('body', { timeout: 15000 })
      // Allow hydration
      await page.waitForTimeout(800)

      const m = await measureChrome(page)
      const label = `${route} @ ${vp.name}`

      record(m.sidebarCount === 0, `${label}: zero app-sidebar`)
      record(m.asideSidebarRail === 0, `${label}: zero aside sidebar rail`)
      record(!m.overflowX, `${label}: no horizontal overflow`, `sw=${m.scrollWidth} cw=${m.clientWidth}`)
      record(
        m.remnantHits.filter((h) => h.toLowerCase() === '#0c0c0e' || h === '#D9A957').length === 0,
        `${label}: no dark-mode leftovers`,
        m.remnantHits.join(',') || null,
      )
      assertGeometricFonts(m.fonts, label)

      // Auth/demo shell expectations when not gated to marketing auth
      const gated =
        /Welcome back|Continue with Google|Sign in to help|Create account|needs configuration/i.test(
          m.bodySample,
        ) && !/Browse tasks|Messages|Good morning|Good afternoon|Good evening|Profile/i.test(m.bodySample)

      if (!gated) {
        if (route === '/browse' || route === '/home' || route === '/messages' || route === '/you' || route === '/post') {
          // Live guest on public browse uses landing nav; demo/signed-in use topnav
          if (m.topnav) {
            record(true, `${label}: app-topnav present`)
            record(m.accountTrigger, `${label}: account menu trigger`)
            record(m.notifBell, `${label}: notifications bell`)
            record(m.locationPill, `${label}: location pill`)
            record(!m.commandSearch, `${label}: no command-bar search clutter`)
            record(!m.landingNav, `${label}: no double landing nav`)
            record(!m.topnavHome, `${label}: topnav has no Home link`)
            record(!m.topnavSafety, `${label}: topnav has no Safety link`)
            record(m.footer, `${label}: app-footer present`)
            record(m.footerSafety, `${label}: app-footer has /safety`)
            if (vp.width === 1440 && m.contentLeftGutter != null) {
              record(
                m.contentLeftGutter <= 40,
                `${label}: desktop left gutter <= 40px`,
                `left=${m.contentLeftGutter}`,
              )
            }
            if (route === '/post') {
              record(!m.postCta, `${label}: post CTA hidden on /post`)
            } else {
              record(m.postCta, `${label}: post CTA visible`)
            }
            // Mobile dock visible below md; hidden at md+
            if (vp.width < 768) {
              record(m.bottomDockVisible, `${label}: mobile bottom dock visible`)
            } else {
              record(!m.bottomDockVisible, `${label}: bottom dock hidden on md+`)
            }
          } else if (m.landingNav && route === '/browse') {
            record(true, `${label}: guest landing nav (live guest)`)
            record(!m.austinCopy, `${label}: no Austin guest assumptions`)
          } else {
            record(false, `${label}: missing topnav or landing nav`)
          }
        }

        if (route === '/browse' && !m.austinCopy) {
          record(true, `${label}: no Austin guest copy`)
        } else if (route === '/browse' && m.austinCopy) {
          record(false, `${label}: Austin guest copy found`)
        }
      }

      const shotPath = join(tmpDir, `${route.replace(/\W+/g, '_')}-${vp.name}.png`)
      await page.screenshot({ path: shotPath, fullPage: true })
      saveShot(shotPath, `${route.replace(/\W+/g, '_')}-${vp.name}.png`)
    }

    // Account dropdown open shot on browse desktop/tablet
    if (vp.width >= 768) {
      await page.goto(`${BASE}/browse`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)
      const trigger = page.locator('[data-testid="account-menu-trigger"]')
      if ((await trigger.count()) > 0) {
        await trigger.click()
        await page.waitForSelector('[data-testid="account-menu"]', { timeout: 5000 })
        const openShot = join(tmpDir, `browse-account-open-${vp.name}.png`)
        await page.screenshot({ path: openShot, fullPage: false })
        saveShot(openShot, `browse-account-open-${vp.name}.png`)
        const menuVisible = await page.locator('[data-testid="account-menu"]').isVisible()
        record(menuVisible, `account menu open @ ${vp.name}`)
        // Escape closes
        await page.keyboard.press('Escape')
        await page.waitForTimeout(200)
        const closed = (await page.locator('[data-testid="account-menu"]').count()) === 0
        record(closed, `account menu closes on Escape @ ${vp.name}`)
      }
    }

    // Filter-aware empty state: apply Cleaning when marketplace may be empty or filtered
    if (vp.name === '1440x900') {
      await page.goto(`${BASE}/browse?category=cleaning`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(700)
      const emptyLogic = await page.evaluate(() => {
        const fresh = !!document.querySelector('[data-testid="browse-fresh-empty"]')
        const reset = !!document.querySelector('[data-testid="browse-reset-filters"]')
        const body = document.body.innerText
        const beFirst = /Be the first on Beam/i.test(body)
        const noMatch = /No open requests match/i.test(body)
        const hasCards = document.querySelectorAll('a[href^="/requests/"]').length > 0
        return { fresh, reset, beFirst, noMatch, hasCards }
      })
      if (!emptyLogic.hasCards) {
        record(
          !emptyLogic.fresh && !emptyLogic.beFirst,
          'filtered browse does not show fresh "Be the first" empty',
        )
        record(
          emptyLogic.reset || emptyLogic.noMatch,
          'filtered browse shows filter-aware empty / reset',
        )
      } else {
        record(true, 'filtered browse shows matching cards (populated)')
      }
      const filterShot = join(tmpDir, `browse-filter-cleaning-${vp.name}.png`)
      await page.screenshot({ path: filterShot, fullPage: true })
      saveShot(filterShot, `browse-filter-cleaning-${vp.name}.png`)

      // People tab should not be hijacked by requests-empty marketplace banner
      await page.goto(`${BASE}/browse?tab=people`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(700)
      const peopleLogic = await page.evaluate(() => {
        const fresh = !!document.querySelector('[data-testid="browse-fresh-empty"]')
        const helperCards = document.querySelectorAll('a[href^="/people/"]').length
        const helperEmpty = /No helpers nearby yet|No local helpers match|Become a helper/i.test(
          document.body.innerText,
        )
        return { fresh, helperCards, helperEmpty }
      })
      record(!peopleLogic.fresh, 'people tab is not hijacked by requests fresh-empty')
      record(
        peopleLogic.helperCards > 0 || peopleLogic.helperEmpty,
        'people tab shows helpers or helper-specific empty',
      )
      const peopleShot = join(tmpDir, `browse-people-tab-${vp.name}.png`)
      await page.screenshot({ path: peopleShot, fullPage: true })
      saveShot(peopleShot, `browse-people-tab-${vp.name}.png`)
    }

    await context.close()
  }
} finally {
  await browser.close()
}

const summaryPath = join(OUT, 'summary.json')
writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
if (existsSync(LOCAL_OUT)) {
  writeFileSync(join(LOCAL_OUT, 'summary.json'), JSON.stringify(summary, null, 2))
}
console.log(
  `\nSUMMARY passed=${summary.checks.filter((c) => c.ok).length} failed=${summary.failures.length}`,
)
if (!summary.ok) process.exit(1)
