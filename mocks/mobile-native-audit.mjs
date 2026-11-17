#!/usr/bin/env node
/**
 * Audit-only: capture 390x844 screenshots + native-feel heuristics.
 * Uses local demo mode. Does not write to production or create auth users.
 */
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const LIVE = process.env.LIVE_URL || 'https://www.joinbunk.xyz'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'
const REQUEST_ID = 'req-1'

mkdirSync(OUT, { recursive: true })

const VP = { width: 390, height: 844 }

/** @type {{ path: string, name: string, role?: string, setup?: string, live?: boolean }[]} */
const ROUTES = [
  { path: '/', name: 'current_landing_signed_out', live: true },
  { path: '/auth', name: 'current_auth', live: true },
  { path: '/?demo=1', name: 'current_landing_demo', role: 'helper' },
  { path: '/onboarding?preview=1&demo=1', name: 'current_onboarding', role: 'fresh' },
  { path: '/browse?demo=1', name: 'current_browse', role: 'helper' },
  { path: `/requests/${REQUEST_ID}?demo=1`, name: 'current_job_details', role: 'helper' },
  { path: '/post?demo=1', name: 'current_post', role: 'neighbor' },
  { path: '/home?tab=offers&demo=1', name: 'current_offers', role: 'helper' },
  { path: '/browse?demo=1&messages=1', name: 'current_messages', role: 'helper', setup: 'openMessages' },
  { path: '/you?demo=1', name: 'current_profile', role: 'helper' },
  { path: '/settings?demo=1', name: 'current_settings', role: 'helper' },
  { path: '/verify?demo=1', name: 'current_verify', role: 'helper' },
  { path: '/help?demo=1', name: 'current_help', role: 'helper' },
]

async function ensureDemoSeed(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 30000 })
}

async function seedRole(page, role) {
  await ensureDemoSeed(page)
  await page.evaluate(
    ({ key, role }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id !== me) continue
        if (role === 'helper') {
          p.accountRole = 'helper'
          p.isHelper = true
          p.skills = p.skills?.length ? p.skills : ['junk-removal', 'house-cleaning']
          p.hourlyRate = p.hourlyRate || 35
          p.onboardingCompletedAt = p.onboardingCompletedAt || new Date().toISOString()
          p.safetyDisclaimerAcceptedAt = p.safetyDisclaimerAcceptedAt || new Date().toISOString()
        } else if (role === 'neighbor') {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
          p.hourlyRate = 0
          p.onboardingCompletedAt = p.onboardingCompletedAt || new Date().toISOString()
          p.safetyDisclaimerAcceptedAt = p.safetyDisclaimerAcceptedAt || new Date().toISOString()
        } else if (role === 'fresh') {
          p.accountRole = null
          p.isHelper = false
          p.skills = []
          p.hourlyRate = 0
          p.onboardingCompletedAt = null
          p.safetyDisclaimerAcceptedAt = null
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, role },
  )
}

async function collectNativeFeel(page, routeName) {
  return page.evaluate(({ routeName }) => {
    const findings = []
    const push = (priority, kind, detail) => findings.push({ priority, kind, page: routeName, detail })

    const html = document.documentElement
    const body = document.body
    const scrollWidth = Math.max(html.scrollWidth, body?.scrollWidth || 0)
    if (scrollWidth > html.clientWidth + 1) {
      push('P0', 'horizontal-scroll', `scrollWidth ${scrollWidth} > ${html.clientWidth}`)
    }

    const dock = document.querySelector('[data-testid="bottom-dock"]')
    const hamburger = document.querySelector(
      '[data-testid="mobile-menu"], [aria-label*="Menu" i], button[aria-label*="menu" i], .hc-hamburger, [data-testid="landing-menu"]',
    )
    const header = document.querySelector('header, [data-testid="browse-float-header"], nav')
    if (!dock && header) {
      push('P0', 'no-bottom-tab-bar', 'Signed-in chrome relies on top header / hamburger without visible bottom dock')
    }
    if (hamburger && getComputedStyle(hamburger).display !== 'none') {
      const r = hamburger.getBoundingClientRect()
      if (r.width > 0) push('P1', 'hamburger-nav', 'Hamburger / website-style menu still present on phone')
    }

    // Tap targets
    const interactives = [
      ...document.querySelectorAll('a, button, [role="button"], input, select, textarea, summary'),
    ]
    let smallTaps = 0
    for (const el of interactives) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue
      if (r.width < 44 || r.height < 44) smallTaps++
    }
    if (smallTaps > 0) push('P0', 'small-tap-targets', `${smallTaps} interactive elements under 44px`)

    // Input font sizes (iOS zoom risk)
    let zoomRisk = 0
    for (const el of document.querySelectorAll('input, select, textarea')) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      const fs = parseFloat(getComputedStyle(el).fontSize)
      if (fs > 0 && fs < 16) zoomRisk++
    }
    if (zoomRisk > 0) push('P0', 'input-zoom-risk', `${zoomRisk} inputs under 16px font-size`)

    // Hover-only affordances in class names
    const hoverHeavy = [...document.querySelectorAll('[class*="hover:"]')].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }).length
    if (hoverHeavy > 8) {
      push('P1', 'hover-dependent', `${hoverHeavy} elements use hover: utility classes (weak press feedback on touch)`)
    }

    // Dialogs that are not bottom sheets
    for (const el of document.querySelectorAll('[role="dialog"], [data-testid*="drawer"], [data-testid*="sheet"]')) {
      const r = el.getBoundingClientRect()
      if (r.width < 40 || r.height < 40) continue
      const nearBottom = r.bottom >= window.innerHeight - 8
      const fullWidth = r.width >= window.innerWidth - 24
      if (!(nearBottom && fullWidth)) {
        push(
          'P1',
          'modal-not-bottom-sheet',
          `${el.getAttribute('data-testid') || el.getAttribute('role')} is centered/floating rather than a bottom sheet`,
        )
      }
    }

    // Safe area usage
    const styles = [...document.styleSheets]
    let safeAreaHits = 0
    try {
      for (const sheet of styles) {
        let rules
        try {
          rules = sheet.cssRules
        } catch {
          continue
        }
        for (const rule of rules || []) {
          if (rule.cssText && /safe-area-inset|env\(safe-area/i.test(rule.cssText)) safeAreaHits++
        }
      }
    } catch {}
    const inlineSafe = !!document.querySelector('[class*="safe-"], [style*="safe-area"]')
    if (safeAreaHits === 0 && !inlineSafe && !document.querySelector('.safe-bottom')) {
      push('P1', 'missing-safe-area', 'No obvious safe-area-inset usage on this page')
    }

    // Website footer
    const footer = document.querySelector('footer')
    if (footer) {
      const r = footer.getBoundingClientRect()
      if (r.height > 80) push('P1', 'marketing-footer', 'Marketing-style footer present in app chrome')
    }

    // PWA / meta (document level, once)
    const manifest = document.querySelector('link[rel="manifest"]')
    const theme = document.querySelector('meta[name="theme-color"]')
    const apple = document.querySelector('link[rel="apple-touch-icon"]')
    const appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]')
    if (!manifest) push('P1', 'no-manifest-link', 'No link rel=manifest in document')
    if (!theme) push('P2', 'no-theme-color', 'No theme-color meta')
    if (!apple) push('P2', 'no-apple-touch-icon', 'No apple-touch-icon link')
    if (!appleCapable) push('P2', 'no-apple-standalone-meta', 'No apple-mobile-web-app-capable meta')

    // Overscroll / bounce not fully detectable; note body overscroll-behavior
    const ob = getComputedStyle(body).overscrollBehavior || getComputedStyle(html).overscrollBehavior
    if (!ob || ob === 'auto') {
      push('P2', 'overscroll-bounce', 'overscroll-behavior is auto (browser pull-to-refresh / bounce likely)')
    }

    // Desktop-style multi-column leftovers
    const wideFixed = [...document.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el)
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.left > 40 && r.right < window.innerWidth - 40 && r.height > 120
    })
    if (wideFixed.length) {
      push('P1', 'floating-desktop-panel', `${wideFixed.length} fixed/sticky panels look desktop-docked on phone`)
    }

    return findings
  }, { routeName })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: VP,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  const page = await context.newPage()
  const allFindings = []
  const shots = []

  for (const route of ROUTES) {
    const base = route.live ? LIVE : BASE
    try {
      if (!route.live && route.role) await seedRole(page, route.role)
      await page.goto(`${base}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForTimeout(900)
      if (route.setup === 'openMessages') {
        await page
          .waitForSelector('[data-testid="messages-drawer"], [data-testid="messages-thread-list"]', {
            timeout: 8000,
          })
          .catch(async () => {
            const trigger = page
              .locator(
                '[data-testid="messages-nav-trigger"]:visible, [data-testid="messages-mobile-trigger"]:visible, [data-testid="bottom-dock"] a[href="/messages"]',
              )
              .first()
            if (await trigger.count()) await trigger.click().catch(() => {})
          })
        await page.waitForTimeout(600)
      }

      const file = join(OUT, `${route.name}_390x844.png`)
      await page.screenshot({ path: file, fullPage: false })
      // Also keep a workspace copy for the PR mocks folder evidence list
      copyFileSync(file, join('/workspace/mocks', `${route.name}_390x844.png`))
      shots.push(file)

      const findings = await collectNativeFeel(page, route.name)
      allFindings.push(...findings)
      console.log(`OK ${route.name} (${findings.length} findings)`)
    } catch (err) {
      console.error(`FAIL ${route.name}:`, err.message)
      allFindings.push({
        priority: 'P0',
        kind: 'audit-load-failed',
        page: route.name,
        detail: err.message,
      })
    }
  }

  // Document-level PWA checks against local demo browse
  try {
    await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
    const pwa = await page.evaluate(async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]')?.href || null
      let manifestJson = null
      if (manifestLink) {
        try {
          const res = await fetch(manifestLink)
          manifestJson = await res.json()
        } catch (e) {
          manifestJson = { error: String(e) }
        }
      }
      return {
        manifestLink,
        manifestJson,
        themeColor: document.querySelector('meta[name="theme-color"]')?.content || null,
        appleTouchIcon: document.querySelector('link[rel="apple-touch-icon"]')?.href || null,
        appleCapable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content || null,
        appleTitle: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content || null,
        viewport: document.querySelector('meta[name="viewport"]')?.content || null,
      }
    })
    writeFileSync(join(OUT, 'pwa-meta.json'), JSON.stringify(pwa, null, 2))
    writeFileSync(join('/workspace/mocks', 'pwa-meta.json'), JSON.stringify(pwa, null, 2))
  } catch (e) {
    console.error('PWA meta check failed', e.message)
  }

  const report = {
    viewport: VP,
    base: BASE,
    live: LIVE,
    shots,
    findings: allFindings,
    summary: Object.fromEntries(
      ['P0', 'P1', 'P2'].map((p) => [p, allFindings.filter((f) => f.priority === p).length]),
    ),
  }
  writeFileSync(join(OUT, 'mobile-native-audit.json'), JSON.stringify(report, null, 2))
  writeFileSync(join('/workspace/mocks', 'mobile-native-audit.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report.summary))
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
