#!/usr/bin/env node
/**
 * Responsive layout audit for BlockSide.
 * Loads each page at common viewports, asserts no horizontal overflow,
 * collects soft layout issues, and saves screenshots.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:43123 AUDIT_PHASE=before node scripts/responsive-audit.mjs
 *   BASE_URL=http://127.0.0.1:43123 AUDIT_PHASE=after  node scripts/responsive-audit.mjs
 *
 * Env:
 *   BASE_URL       default http://127.0.0.1:43123
 *   AUDIT_PHASE    before | after (default before)
 *   SHOT_DIR       screenshot root (default /opt/cursor/artifacts/responsive-audit)
 *   STRICT         if 1, exit 1 when hard overflow failures remain
 *   QUICK          if 1, only key viewports (390, 375, 768, 1280x720, 1280x650)
 */
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const PHASE = process.env.AUDIT_PHASE || 'before'
const STRICT = process.env.STRICT === '1'
const QUICK = process.env.QUICK === '1'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts/responsive-audit'
const PHASE_DIR = join(OUT, PHASE)
const STORAGE_KEY = 'beam-demo-v1'
const HELPER_ID = 'p-maya'
const NEIGHBOR_ID = 'p-sam'
const REQUEST_ID = 'req-1'

mkdirSync(PHASE_DIR, { recursive: true })
mkdirSync('/workspace/artifacts/responsive-audit', { recursive: true })

const ALL_VIEWPORTS = [
  { width: 1920, height: 1080, label: '1920x1080' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1280, height: 720, label: '1280x720' },
  { width: 1280, height: 650, label: '1280x650' },
  { width: 1024, height: 768, label: '1024x768' },
  { width: 820, height: 1180, label: '820x1180' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 430, height: 932, label: '430x932' },
  { width: 390, height: 844, label: '390x844' },
  { width: 375, height: 667, label: '375x667' },
  { width: 360, height: 740, label: '360x740' },
]

const KEY_SHOT_LABELS = new Set(['390x844', '375x667', '768x1024', '1280x720'])

const VIEWPORTS = QUICK
  ? ALL_VIEWPORTS.filter((v) => KEY_SHOT_LABELS.has(v.label) || v.label === '1280x650')
  : ALL_VIEWPORTS

/** @typedef {{ path: string, name: string, role?: 'helper'|'neighbor'|'fresh', setup?: string, shotAlways?: boolean }} Route */

/** @type {Route[]} */
const ROUTES = [
  { path: '/?demo=1', name: 'landing', role: 'helper', shotAlways: true },
  { path: '/browse?demo=1', name: 'browse', role: 'helper', shotAlways: true },
  { path: '/browse?demo=1', name: 'browse-drawer', role: 'helper', setup: 'openJobDrawer', shotAlways: true },
  { path: `/requests/${REQUEST_ID}?demo=1`, name: 'job-detail', role: 'helper', shotAlways: true },
  {
    path: '/match?demo=1&q=Looking%20for%20a%20weekly%20house%20cleaner&zip=78702&intent=helpers&category=house-cleaning',
    name: 'match',
    role: 'neighbor',
    shotAlways: true,
  },
  { path: '/post?demo=1', name: 'post-step1', role: 'neighbor', shotAlways: true },
  { path: '/post?demo=1', name: 'post-step2', role: 'neighbor', setup: 'postStep2', shotAlways: true },
  { path: `/people/${HELPER_ID}?demo=1`, name: 'people-helper', role: 'neighbor', shotAlways: true },
  { path: `/people/${NEIGHBOR_ID}?demo=1`, name: 'people-neighbor', role: 'helper', setup: 'seedNeighbor', shotAlways: true },
  { path: '/home?tab=saved&demo=1', name: 'saved', role: 'helper', shotAlways: true },
  { path: '/browse?demo=1&messages=1', name: 'messages-drawer', role: 'helper', setup: 'openMessages', shotAlways: true },
  { path: '/home?tab=offers&demo=1', name: 'offers', role: 'helper', shotAlways: true },
  { path: '/you?demo=1', name: 'you', role: 'helper', shotAlways: true },
  { path: '/settings?demo=1', name: 'settings', role: 'helper' },
  { path: '/settings/profile?demo=1', name: 'settings-profile', role: 'helper', shotAlways: true },
  { path: '/settings/account?demo=1', name: 'settings-account', role: 'helper' },
  { path: '/onboarding?preview=1&demo=1', name: 'onboarding-neighbor', role: 'fresh', shotAlways: true },
  { path: '/onboarding/helper?demo=1', name: 'onboarding-helper', role: 'fresh', shotAlways: true },
  { path: '/verify?demo=1', name: 'verify', role: 'helper' },
  { path: '/safety?demo=1', name: 'safety', role: 'helper' },
  { path: '/terms?demo=1', name: 'terms', role: 'helper' },
  { path: '/privacy?demo=1', name: 'privacy', role: 'helper' },
  { path: '/#how-it-works', name: 'how-it-works', role: 'helper', setup: 'scrollHow', shotAlways: true },
  { path: '/not-a-real-route-404?demo=1', name: '404', role: 'helper', shotAlways: true },
  { path: '/dev/error-ui?demo=1', name: 'error', role: 'helper', shotAlways: true },
]

function withDemo(path) {
  if (path.includes('demo=1') || path.startsWith('/#')) return path
  return path.includes('?') ? `${path}&demo=1` : `${path}?demo=1`
}

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
          p.city = null
          p.stateCode = null
          p.locationLabel = ''
          p.onboardingCompletedAt = null
          p.safetyDisclaimerAcceptedAt = null
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, role },
  )
}

async function seedNeighborPoster(page) {
  await page.evaluate(
    ({ key, neighborId }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      for (const p of state.people || []) {
        if (p.id !== neighborId) continue
        p.accountRole = 'customer'
        p.isHelper = false
        p.skills = []
        p.availableNow = false
        p.availability = []
        p.hourlyRate = 0
        p.jobsCompleted = 0
        p.rating = 0
        p.reviewCount = 0
        p.bio = 'Neighbor posting jobs around South Congress.'
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, neighborId: NEIGHBOR_ID },
  )
}

async function runSetup(page, setup) {
  if (!setup) return
  if (setup === 'seedNeighbor') {
    await seedNeighborPoster(page)
    return
  }
  if (setup === 'scrollHow') {
    await page.goto(`${BASE}/?demo=1`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.locator('#how-it-works').scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(300)
    return
  }
  if (setup === 'openJobDrawer') {
    const card = page.locator('[data-testid="browse-job-card"], [data-testid="job-row"], a[href*="/requests/"]').first()
    if (await card.count()) {
      await card.click({ timeout: 8000 }).catch(() => {})
      await page
        .waitForSelector('[data-testid="job-drawer"], [data-testid="browse-job-drawer"], [role="dialog"]', {
          timeout: 5000,
        })
        .catch(() => {})
    }
    return
  }
  if (setup === 'openMessages') {
    await page
      .waitForSelector('[data-testid="messages-drawer"], [data-testid="messages-thread-list"]', {
        timeout: 8000,
      })
      .catch(async () => {
        const trigger = page
          .locator(
            '[data-testid="messages-nav-trigger"]:visible, [data-testid="messages-mobile-trigger"]:visible',
          )
          .first()
        if (await trigger.count()) await trigger.click().catch(() => {})
      })
    return
  }
  if (setup === 'postStep2') {
    const describe = page.getByTestId('post-describe-input')
    if (await describe.count()) {
      await describe.fill('Need help moving a couch this weekend around East Austin')
    }
    const zip = page.getByTestId('post-zip')
    if (await zip.count()) {
      await zip.fill('78702')
      await page.waitForTimeout(400)
    }
    const cont = page.getByTestId('post-continue').or(page.getByTestId('post-continue-mobile')).first()
    if (await cont.count()) {
      await cont.click({ timeout: 5000 }).catch(() => {})
      await page.waitForSelector('[data-testid="post-request-form"], [data-testid="post-title"]', {
        timeout: 15000,
      }).catch(() => {})
    }
  }
}

async function collectIssues(page, routeName, vp) {
  return page.evaluate(
    ({ routeName, vp, isMobile }) => {
      const issues = []
      const html = document.documentElement
      const body = document.body
      const scrollWidth = Math.max(html.scrollWidth, body?.scrollWidth || 0)
      const clientWidth = html.clientWidth
      const overflowX = scrollWidth > clientWidth + 1

      if (overflowX) {
        // Find widest overflowing descendants for diagnosis.
        const offenders = []
        const all = document.querySelectorAll('body *')
        for (const el of all) {
          const r = el.getBoundingClientRect()
          if (r.width < 2 || r.height < 2) continue
          if (r.right > clientWidth + 2 || r.left < -2) {
            const cs = getComputedStyle(el)
            if (cs.display === 'none' || cs.visibility === 'hidden') continue
            offenders.push({
              tag: el.tagName.toLowerCase(),
              id: el.id || '',
              testid: el.getAttribute('data-testid') || '',
              cls: (el.className?.toString?.() || '').slice(0, 80),
              left: Math.round(r.left),
              right: Math.round(r.right),
              width: Math.round(r.width),
            })
            if (offenders.length >= 8) break
          }
        }
        issues.push({
          kind: 'horizontal-overflow',
          severity: 'hard',
          page: routeName,
          viewport: vp.label,
          detail: `scrollWidth ${scrollWidth} > innerWidth ${clientWidth}`,
          offenders,
        })
      }

      // Drawers / dialogs taller than viewport without internal scroll
      for (const el of document.querySelectorAll(
        '[role="dialog"], [data-testid="job-drawer"], [data-testid="browse-job-drawer"], [data-testid="messages-drawer"]',
      )) {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        const oy = cs.overflowY
        const canScroll = oy === 'auto' || oy === 'scroll' || oy === 'overlay'
        const childScroll = [...el.querySelectorAll('*')].some((c) => {
          const s = getComputedStyle(c)
          return (
            (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
            c.scrollHeight > c.clientHeight + 4
          )
        })
        if (r.height > window.innerHeight + 4 && !canScroll && !childScroll) {
          issues.push({
            kind: 'drawer-no-scroll',
            severity: 'soft',
            page: routeName,
            viewport: vp.label,
            detail: `dialog height ${Math.round(r.height)} > vh ${window.innerHeight}`,
          })
        }
      }

      // Fixed / sticky bottom dock covering primary CTAs on mobile
      if (isMobile) {
        const dock = document.querySelector('[data-testid="bottom-dock"]')
        if (dock) {
          const dr = dock.getBoundingClientRect()
          const ctas = document.querySelectorAll(
            'button[type="submit"], [data-testid="post-continue"], [data-testid="post-submit-mobile"], [data-testid="post-continue-mobile"], [data-testid="php-request-cta"], a.touch-target, button.touch-target',
          )
          for (const cta of ctas) {
            const r = cta.getBoundingClientRect()
            if (r.width < 2 || r.height < 2) continue
            if (r.bottom > dr.top + 4 && r.top < dr.bottom && r.bottom <= window.innerHeight + 2) {
              issues.push({
                kind: 'bottom-nav-overlap',
                severity: 'soft',
                page: routeName,
                viewport: vp.label,
                detail: `${cta.getAttribute('data-testid') || cta.tagName} overlaps bottom dock`,
              })
              break
            }
          }
        }
      }

      // Tap targets < 40px on mobile (interactive)
      if (isMobile) {
        const selectors =
          'a, button, [role="button"], input[type="checkbox"], input[type="radio"], summary'
        let small = 0
        for (const el of document.querySelectorAll(selectors)) {
          const r = el.getBoundingClientRect()
          if (r.width < 2 || r.height < 2) continue
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none')
            continue
          // Allow 1px subpixel rounding; ignore inline text links in copy blocks.
          if (r.height < 39 || r.width < 39) {
            if (el.tagName === 'A' && el.closest('p, li, .type-sec, .type-meta, .legal-doc')) continue
            // Icon-only controls with adequate height but ~36-38px width are OK if padded hit area >= 40 via min sizes.
            const minH = parseFloat(cs.minHeight) || 0
            const minW = parseFloat(cs.minWidth) || 0
            if (Math.max(r.height, minH) >= 40 && Math.max(r.width, minW) >= 40) continue
            if (Math.max(r.height, minH) >= 44 && r.width >= 36) continue
            small += 1
            if (small <= 3) {
              issues.push({
                kind: 'small-tap-target',
                severity: 'soft',
                page: routeName,
                viewport: vp.label,
                detail: `${el.tagName.toLowerCase()} ${el.getAttribute('data-testid') || el.className?.toString?.().slice(0, 40) || ''} ${Math.round(r.width)}x${Math.round(r.height)}`,
              })
            }
          }
        }
      }

      // Inputs under 16px font on mobile (iOS zoom). Skip hidden/file controls.
      if (isMobile) {
        for (const el of document.querySelectorAll('input, textarea, select')) {
          const type = (el.getAttribute('type') || '').toLowerCase()
          if (['hidden', 'file', 'checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'image'].includes(type))
            continue
          if (el.classList.contains('sr-only')) continue
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.visibility === 'hidden') continue
          if (cs.position === 'absolute' && (parseFloat(cs.width) < 2 || parseFloat(cs.height) < 2)) continue
          const size = parseFloat(cs.fontSize) || 0
          if (size > 0 && size < 16) {
            issues.push({
              kind: 'input-font-lt-16',
              severity: 'soft',
              page: routeName,
              viewport: vp.label,
              detail: `${el.getAttribute('data-testid') || el.name || el.tagName} font-size ${size}px`,
            })
          }
        }
      }

      // Header nav overflow at tablet widths (true overflow only)
      if (vp.width >= 768 && vp.width <= 1024) {
        const nav =
          document.querySelector('[data-testid="app-topnav"]') ||
          document.querySelector('[data-testid="landing-nav"]')
        if (nav) {
          const r = nav.getBoundingClientRect()
          if (r.right > clientWidth + 2 || nav.scrollWidth > nav.clientWidth + 2) {
            issues.push({
              kind: 'header-nav-overflow',
              severity: 'soft',
              page: routeName,
              viewport: vp.label,
              detail: `nav scrollWidth ${nav.scrollWidth} client ${nav.clientWidth} right ${Math.round(r.right)}`,
            })
          }
        }
      }

      // Elements extending past the viewport without a scroll/clip ancestor handling it
      {
        const scrolls = (node) => {
          let n = node?.parentElement
          while (n && n !== document.body) {
            const s = getComputedStyle(n)
            if (
              s.overflowX === 'auto' ||
              s.overflowX === 'scroll' ||
              s.overflowX === 'hidden' ||
              s.overflow === 'auto' ||
              s.overflow === 'scroll' ||
              s.overflow === 'hidden' ||
              s.overflowX === 'clip'
            ) {
              return true
            }
            n = n.parentElement
          }
          return false
        }
        let clipped = 0
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect()
          if (r.width < 40 || r.height < 8) continue
          const cs = getComputedStyle(el)
          if (cs.position === 'fixed' || cs.position === 'sticky') continue
          if (cs.display === 'none' || cs.visibility === 'hidden') continue
          if (r.right > clientWidth + 8 && !scrolls(el)) {
            clipped += 1
            if (clipped <= 2) {
              issues.push({
                kind: 'clipped-overflow',
                severity: 'soft',
                page: routeName,
                viewport: vp.label,
                detail: `${el.tagName.toLowerCase()} ${el.getAttribute('data-testid') || (el.className?.toString?.() || '').slice(0, 48)} right=${Math.round(r.right)}`,
              })
            }
          }
        }
      }

      return {
        overflowX,
        scrollWidth,
        clientWidth,
        issues,
      }
    },
    { routeName, vp, isMobile: vp.width < 768 },
  )
}

async function shot(page, name) {
  const path = join(PHASE_DIR, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  const local = join('/workspace/artifacts/responsive-audit', PHASE, `${name}.png`)
  mkdirSync(join('/workspace/artifacts/responsive-audit', PHASE), { recursive: true })
  copyFileSync(path, local)
  return path
}

async function loadRoute(page, route) {
  if (route.setup === 'scrollHow') {
    await runSetup(page, route.setup)
    return
  }
  const url = `${BASE}${withDemo(route.path)}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(350)
  // Re-apply role after navigation in case page remount cleared nothing (localStorage persists).
  if (route.setup === 'seedNeighbor') await runSetup(page, 'seedNeighbor')
  if (route.setup && route.setup !== 'seedNeighbor' && route.setup !== 'scrollHow') {
    await runSetup(page, route.setup)
    await page.waitForTimeout(250)
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // Hide Next.js dev indicator so screenshots reflect product chrome (still noted in report).
  await page.addInitScript(() => {
    const style = document.createElement('style')
    style.setAttribute('data-responsive-audit-hide-next', '1')
    style.textContent =
      'nextjs-portal, [data-next-badge-root], [data-nextjs-toast], #__next-build-watcher { display: none !important; }'
    document.documentElement.appendChild(style)
  })

  /** @type {any[]} */
  const allIssues = []
  /** @type {any[]} */
  const results = []
  let hardFails = 0

  console.log(`responsive-audit phase=${PHASE} base=${BASE} viewports=${VIEWPORTS.length} routes=${ROUTES.length}`)

  // Warm demo seed once
  await page.setViewportSize({ width: 1280, height: 720 })
  await seedRole(page, 'helper')

  for (const route of ROUTES) {
    const role = route.role || 'helper'
    await seedRole(page, role)

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      try {
        await loadRoute(page, route)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        allIssues.push({
          kind: 'load-error',
          severity: 'hard',
          page: route.name,
          viewport: vp.label,
          detail: msg.slice(0, 200),
        })
        hardFails += 1
        results.push({ page: route.name, viewport: vp.label, overflowX: true, error: msg.slice(0, 200) })
        continue
      }

      const measured = await collectIssues(page, route.name, vp)
      results.push({
        page: route.name,
        viewport: vp.label,
        overflowX: measured.overflowX,
        scrollWidth: measured.scrollWidth,
        clientWidth: measured.clientWidth,
        issueCount: measured.issues.length,
      })
      for (const issue of measured.issues) {
        allIssues.push(issue)
        if (issue.severity === 'hard') hardFails += 1
      }

      const shouldShot =
        route.shotAlways && KEY_SHOT_LABELS.has(vp.label)
          ? true
          : measured.overflowX || (route.shotAlways && vp.label === '1280x650')
      if (shouldShot) {
        await shot(page, `${route.name}__${vp.label}`).catch(() => {})
      }
    }
  }

  const report = {
    phase: PHASE,
    base: BASE,
    generatedAt: new Date().toISOString(),
    viewportCount: VIEWPORTS.length,
    routeCount: ROUTES.length,
    hardFails,
    softCount: allIssues.filter((i) => i.severity === 'soft').length,
    issues: allIssues,
    results,
  }

  const reportPath = join(OUT, `report-${PHASE}.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  const localReport = join('/workspace/artifacts/responsive-audit', `report-${PHASE}.json`)
  writeFileSync(localReport, JSON.stringify(report, null, 2))

  // Concise console summary
  const hard = allIssues.filter((i) => i.severity === 'hard')
  console.log(`hard=${hard.length} soft=${report.softCount}`)
  for (const i of hard.slice(0, 40)) {
    console.log(`HARD ${i.page} @ ${i.viewport}: ${i.detail}`)
  }
  const softKinds = {}
  for (const i of allIssues.filter((x) => x.severity === 'soft')) {
    softKinds[i.kind] = (softKinds[i.kind] || 0) + 1
  }
  console.log('soft kinds', softKinds)
  console.log(`wrote ${reportPath}`)

  await browser.close()

  if (STRICT && hardFails > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
