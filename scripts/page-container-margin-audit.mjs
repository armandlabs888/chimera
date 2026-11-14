#!/usr/bin/env node
/**
 * Audit left/right content edges vs header shell container.
 * Demo mode: NEXT_PUBLIC_BEAM_DEMO_MODE=1, ?demo=1, localStorage beam-demo-v1.
 */
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const PHASE = process.env.AUDIT_PHASE || 'before'
const STORAGE_KEY = 'beam-demo-v1'
const HELPER_ID = 'p-maya'
const REQUEST_ID = 'req-1'

mkdirSync(OUT, { recursive: true })
mkdirSync('/workspace/artifacts/page-container', { recursive: true })

const VIEWPORTS = [
  { width: 1280, height: 800, label: '1280x800' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 390, height: 844, label: '390x844' },
]

const ROUTES = [
  // Auth is an intentional full-bleed modal; still audited but expected to differ.
  { path: '/', name: 'landing', shot: true },
  { path: '/browse', name: 'browse', shot: true },
  { path: '/people/' + HELPER_ID, name: 'people', shot: true },
  { path: '/you', name: 'you', shot: true },
  { path: '/you?tab=saved', name: 'saved', shot: false },
  { path: '/you?tab=offers', name: 'offers', shot: false },
  { path: '/browse?messages=1', name: 'messages', shot: true },
  { path: '/requests/' + REQUEST_ID, name: 'request-detail', shot: true },
  { path: '/post', name: 'post', shot: true },
  { path: '/settings', name: 'settings', shot: false },
  { path: '/onboarding/helper', name: 'helper-onboarding', shot: false },
  { path: '/verify', name: 'verify', shot: false },
  { path: '/auth', name: 'auth', shot: false },
  { path: '/onboarding?edit=1', name: 'onboarding-edit', shot: false },
  { path: '/safety', name: 'safety', shot: false },
  { path: '/terms', name: 'terms', shot: false },
  { path: '/privacy', name: 'privacy', shot: false },
  { path: '/home', name: 'home', shot: false },
  { path: '/not-a-real-route-404', name: '404', shot: false },
]

function bodyProbeSelectors(name) {
  const map = {
    landing: [
      '[data-testid="landing-hero"] .beam-container',
      '[data-testid="landing-categories"] .beam-container',
      '[data-testid="how-it-works"] .beam-container',
      'main .beam-container',
    ],
    browse: ['.browse-hc-wrap.browse-hc-page', '.browse-hc-page'],
    people: ['main .beam-container', '[data-testid="public-helper-profile"]'],
    you: ['[data-testid="you-page-shell"]', '[data-testid="you-page"] .beam-container', 'main'],
    saved: ['[data-testid="you-page-shell"]', '[data-testid="you-page"] .beam-container', 'main'],
    offers: ['[data-testid="you-page-shell"]', '[data-testid="you-page"] .beam-container', 'main'],
    messages: ['.browse-hc-wrap.browse-hc-page', 'main .browse-hc-wrap'],
    'request-detail': ['[data-testid="request-detail-root"]', 'main .beam-container'],
    post: ['main .beam-container', 'main'],
    settings: ['main .account-hc-wrap', '.account-hc-wrap'],
    'helper-onboarding': ['main .account-hc-wrap', '.account-hc-wrap'],
    verify: ['main .account-hc-wrap', '.account-hc-wrap'],
    auth: ['[role="dialog"]', '[data-testid="auth-experience"]'],
    'onboarding-edit': ['main .account-hc-wrap', '.account-hc-wrap'],
    safety: ['[data-testid="safety-page"]', 'main .beam-container'],
    terms: ['main .account-hc-wrap', '.account-hc-wrap'],
    privacy: ['main .account-hc-wrap', '.account-hc-wrap'],
    home: ['main .account-hc-wrap', '.account-hc-wrap'],
    '404': ['main .beam-container', 'main'],
  }
  return map[name] || ['main .beam-container', 'main .browse-hc-wrap', 'main .account-hc-wrap', 'main']
}

async function seedRole(page, role) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
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
        } else if (role === 'neighbor') {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
          p.hourlyRate = 0
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, role },
  )
}

async function measure(page, routeName, vpWidth) {
  return page.evaluate(
    ({ selectors, vpWidth }) => {
      const headerInner =
        document.querySelector('[data-testid="app-topnav"] .browse-hc-wrap') ||
        document.querySelector('[data-testid="landing-nav"] .browse-hc-wrap') ||
        document.querySelector('[data-testid="app-topnav"] .beam-container') ||
        document.querySelector('[data-testid="landing-nav"] .beam-container') ||
        document.querySelector('.browse-hc-wrap') ||
        document.querySelector('.beam-container') ||
        document.querySelector('.account-hc-wrap')

      let headerLeft = null
      let headerRight = null
      if (headerInner) {
        const cs = getComputedStyle(headerInner)
        const padL = parseFloat(cs.paddingLeft) || 0
        const padR = parseFloat(cs.paddingRight) || 0
        const rect = headerInner.getBoundingClientRect()
        headerLeft = Math.round((rect.left + padL) * 10) / 10
        headerRight = Math.round((vpWidth - (rect.right - padR)) * 10) / 10
      }

      let bodyEl = null
      for (const sel of selectors) {
        const el = document.querySelector(sel)
        if (el) {
          bodyEl = el
          break
        }
      }

      let bodyLeft = null
      let bodyRight = null
      let bodySel = null
      if (bodyEl) {
        bodySel = bodyEl.getAttribute('data-testid') || bodyEl.className?.toString?.().slice(0, 80) || bodyEl.tagName
        const cs = getComputedStyle(bodyEl)
        const padL = parseFloat(cs.paddingLeft) || 0
        const padR = parseFloat(cs.paddingRight) || 0
        const rect = bodyEl.getBoundingClientRect()
        // Prefer content-box edges when the node is the shell container.
        const isShell =
          bodyEl.classList.contains('beam-container') ||
          bodyEl.classList.contains('browse-hc-wrap') ||
          bodyEl.classList.contains('account-hc-wrap')
        if (isShell) {
          bodyLeft = Math.round((rect.left + padL) * 10) / 10
          bodyRight = Math.round((vpWidth - (rect.right - padR)) * 10) / 10
        } else {
          // First meaningful content child edge, else element box.
          bodyLeft = Math.round(rect.left * 10) / 10
          bodyRight = Math.round((vpWidth - rect.right) * 10) / 10
        }
      }

      const deltaL =
        headerLeft != null && bodyLeft != null ? Math.round((bodyLeft - headerLeft) * 10) / 10 : null
      const deltaR =
        headerRight != null && bodyRight != null
          ? Math.round((bodyRight - headerRight) * 10) / 10
          : null

      return {
        headerLeft,
        headerRight,
        bodyLeft,
        bodyRight,
        deltaL,
        deltaR,
        bodySel,
        ok:
          deltaL != null &&
          deltaR != null &&
          Math.abs(deltaL) <= 2 &&
          Math.abs(deltaR) <= 2,
      }
    },
    { selectors: bodyProbeSelectors(routeName), vpWidth },
  )
}

async function shot(page, name) {
  const file = `${PHASE}-${name}.png`
  const tmp = join('/tmp', file)
  await page.screenshot({ path: tmp, fullPage: false })
  copyFileSync(tmp, join(OUT, file))
  copyFileSync(tmp, join('/workspace/artifacts/page-container', file))
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const results = []

  for (const role of ['neighbor', 'helper']) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await seedRole(page, role)

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      for (const route of ROUTES) {
        const url = `${BASE}${route.path}${route.path.includes('?') ? '&' : '?'}demo=1`
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
          await page.waitForTimeout(400)
          const m = await measure(page, route.name, vp.width)
          results.push({
            phase: PHASE,
            role,
            page: route.name,
            path: route.path,
            viewport: vp.label,
            ...m,
          })
          if (route.shot && role === 'neighbor' && (vp.label === '1280x800' || vp.label === '390x844')) {
            await shot(page, `${route.name}-${role}-${vp.label}`)
          }
        } catch (err) {
          results.push({
            phase: PHASE,
            role,
            page: route.name,
            path: route.path,
            viewport: vp.label,
            error: String(err),
            ok: false,
          })
        }
      }
    }
    await context.close()
  }

  // Guest: clear auth-ish demo user by opening landing without seeded helper chrome.
  // Demo mode always has a current user; treat guest as marketing landing + public people.
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE}/?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      for (const route of [
        { path: '/', name: 'landing' },
        { path: `/people/${HELPER_ID}`, name: 'people' },
        { path: '/browse', name: 'browse' },
        { path: '/auth', name: 'auth' },
        { path: '/safety', name: 'safety' },
        { path: '/terms', name: 'terms' },
        { path: '/privacy', name: 'privacy' },
      ]) {
        const url = `${BASE}${route.path}${route.path.includes('?') ? '&' : '?'}demo=1`
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
          await page.waitForTimeout(350)
          const m = await measure(page, route.name, vp.width)
          results.push({
            phase: PHASE,
            role: 'guest-demo',
            page: route.name,
            path: route.path,
            viewport: vp.label,
            ...m,
          })
        } catch (err) {
          results.push({
            phase: PHASE,
            role: 'guest-demo',
            page: route.name,
            path: route.path,
            viewport: vp.label,
            error: String(err),
            ok: false,
          })
        }
      }
    }
    await context.close()
  }

  await browser.close()

  const outJson = join(OUT, `page-container-audit-${PHASE}.json`)
  writeFileSync(outJson, JSON.stringify(results, null, 2))
  writeFileSync(
    join('/workspace/artifacts/page-container', `page-container-audit-${PHASE}.json`),
    JSON.stringify(results, null, 2),
  )

  const mismatches = results.filter((r) => !r.ok)
  console.log(`phase=${PHASE} total=${results.length} mismatches=${mismatches.length}`)
  for (const r of mismatches.slice(0, 40)) {
    console.log(
      `${r.role} ${r.page} @${r.viewport} header=${r.headerLeft}/${r.headerRight} body=${r.bodyLeft}/${r.bodyRight} dL=${r.deltaL} dR=${r.deltaR} sel=${r.bodySel || r.error}`,
    )
  }
  if (mismatches.length > 40) console.log(`... +${mismatches.length - 40} more`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
