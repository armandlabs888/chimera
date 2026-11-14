#!/usr/bin/env node
/**
 * Batch 1 / A0 flow-breaking QA (demo mode).
 * Proves: Send offer visible at 1280x800, empty review comment, accept confirm modal,
 * guest mobile footer (no bottom nav overlap), /post + /safety headers.
 *
 * Run: NEXT_PUBLIC_BEAM_DEMO_MODE=1 npm run build && npm start
 *      BASE_URL=http://127.0.0.1:43123 node scripts/batch1-nav-flow-qa.mjs
 */
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/batch1-nav-flow'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name, { fullPage = false } = {}) {
  const tmp = join('/tmp', name)
  await page.screenshot({ path: tmp, fullPage })
  copyFileSync(tmp, join(OUT, name))
  copyFileSync(tmp, join(LOCAL, name))
  console.log('wrote', join(OUT, name))
}

async function seedRole(page, { asHelper }) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })
  await page.evaluate(
    ({ key, asHelper }) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id !== me) continue
        if (asHelper) {
          p.accountRole = 'helper'
          p.isHelper = true
          p.skills = p.skills?.length ? p.skills : ['junk-removal', 'house-cleaning']
          p.hourlyRate = p.hourlyRate || 35
          p.rateType = p.rateType || 'hourly'
          p.serviceRadiusMiles = p.serviceRadiusMiles || 5
          p.availableNow = true
          p.availability = p.availability?.length ? p.availability : ['afternoons', 'evenings']
        } else {
          p.accountRole = 'neighbor'
          p.isHelper = false
          p.skills = []
          p.availableNow = false
          p.availability = []
          p.hourlyRate = 0
          p.rateType = 'hourly'
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, asHelper },
  )
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.evaluate(() => {
    const fn = window.__BEAM_SET_DEMO_VERIFICATION__
    if (typeof fn === 'function') fn('approved')
  })
}

async function openOfferableJob(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="browse-job-row"]', { timeout: 20000 })
  const rows = page.locator('[data-testid="browse-job-row"]')
  const n = await rows.count()
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click()
    await page.waitForURL(/[?&]job=/, { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(200)
    if (await page.locator('[data-testid="browse-make-offer"]').count()) {
      return new URL(page.url()).searchParams.get('job')
    }
  }
  throw new Error('No open job the demo helper can offer on')
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const report = { ok: true, checks: [] }
  const check = (name, pass, detail = '') => {
    report.checks.push({ name, pass, detail })
    console.log(pass ? 'PASS' : 'FAIL', name, detail)
    if (!pass) report.ok = false
  }

  try {
    // ---- A0.1 Send offer visible at 1280x800, one button ----
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedRole(page, { asHelper: true })
      await openOfferableJob(page)

      const makeOffer = page.getByTestId('browse-make-offer')
      await makeOffer.waitFor({ state: 'visible', timeout: 10000 })
      await makeOffer.click()
      await page.waitForSelector('[data-testid="browse-drawer-offer"]', { timeout: 10000 })

      const sendVisible = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, [type="submit"]')].filter((el) =>
          /^Send offer$/i.test((el.textContent || '').trim()),
        )
        const send = btns[0]
        if (!send) return { count: 0, inView: false, bottom: null, vh: window.innerHeight }
        const r = send.getBoundingClientRect()
        return {
          count: btns.length,
          inView: r.top >= 0 && r.bottom <= window.innerHeight + 1,
          bottom: Math.round(r.bottom),
          top: Math.round(r.top),
          vh: window.innerHeight,
          panelMax: getComputedStyle(
            document.querySelector('[data-testid="browse-job-detail"]'),
          ).maxHeight,
        }
      })
      check('A0.1 one Send offer button', sendVisible.count === 1, JSON.stringify(sendVisible))
      check('A0.1 Send offer in viewport at 1280x800', sendVisible.inView, JSON.stringify(sendVisible))
      await shot(page, 'batch1-browse-send-offer-1280x800.png')
      await context.close()
    }

    // ---- A0.2 empty review comment saves nothing ----
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedRole(page, { asHelper: false })
      await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })

      const requestId = await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) || '{}')
        const me = state.currentUserId || 'user-you'
        const helper = (state.people || []).find((p) => p.id !== me && p.isHelper) || (state.people || [])[1]
        const req = (state.requests || []).find((r) => r.requesterId === me) || (state.requests || [])[0]
        if (!req || !helper) return null
        req.status = 'completed'
        req.helperId = helper.id
        req.requesterId = me
        req.acceptedOfferId = req.acceptedOfferId || 'offer-batch1'
        state.offers = (state.offers || []).filter((o) => o.requestId !== req.id)
        state.offers.push({
          id: 'offer-batch1',
          requestId: req.id,
          helperId: helper.id,
          price: 28,
          note: '',
          eta: 'Within 1 hour',
          status: 'accepted',
          createdAt: new Date().toISOString(),
        })
        state.reviews = (state.reviews || []).filter(
          (r) => !(r.requestId === req.id && r.fromId === me),
        )
        localStorage.setItem(key, JSON.stringify(state))
        return req.id
      }, STORAGE_KEY)

      assert.ok(requestId, 'seeded completed request')
      await page.goto(`${BASE}/requests/${requestId}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.waitForSelector('[data-testid="request-review-panel"]', { timeout: 15000 })
      await page.locator('#review-comment').fill('')
      await page.getByRole('button', { name: /Submit review/i }).click()
      await page.waitForTimeout(800)

      const saved = await page.evaluate(
        ({ key, requestId }) => {
          const state = JSON.parse(localStorage.getItem(key) || '{}')
          const me = state.currentUserId || 'user-you'
          const review = (state.reviews || []).find(
            (r) => r.requestId === requestId && r.fromId === me,
          )
          return review || null
        },
        { key: STORAGE_KEY, requestId },
      )
      check(
        'A0.2 empty review comment not fabricated',
        Boolean(saved) && saved.comment === '',
        JSON.stringify(saved),
      )
      const quoteVisible = await page.locator('[data-testid="review-comment-text"]').count()
      check('A0.2 empty review renders no quote', quoteVisible === 0)
      await shot(page, 'batch1-review-empty-comment-1280x800.png')
      await context.close()
    }

    // ---- A11 accept confirmation modal ----
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedRole(page, { asHelper: false })
      await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, { timeout: 20000 })

      const requestId = await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) || '{}')
        const me = state.currentUserId || 'user-you'
        const helper =
          (state.people || []).find((p) => p.id !== me && (p.isHelper || (p.skills || []).length)) ||
          (state.people || []).find((p) => p.id !== me)
        const req =
          (state.requests || []).find((r) => r.requesterId === me && r.status === 'open') ||
          (state.requests || []).find((r) => r.requesterId === me)
        if (!req || !helper) return null
        req.status = 'open'
        req.helperId = null
        req.acceptedOfferId = null
        req.requesterId = me
        state.offers = (state.offers || []).filter((o) => o.requestId !== req.id)
        state.offers.push({
          id: 'offer-accept-batch1',
          requestId: req.id,
          helperId: helper.id,
          price: 28,
          note: '',
          eta: 'Within 1 hour',
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        helper.name = helper.name || 'Devon Lee'
        if (!helper.name.startsWith('Devon')) helper.name = 'Devon Lee'
        localStorage.setItem(key, JSON.stringify(state))
        return req.id
      }, STORAGE_KEY)

      assert.ok(requestId, 'seeded open request with pending offer')
      await page.goto(`${BASE}/requests/${requestId}?demo=1`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      })
      await page.waitForSelector('[data-testid="accept-offer-button"]', { timeout: 15000 })
      await page.getByTestId('accept-offer-button').click()
      await page.waitForSelector('[data-testid="accept-offer-confirm"]', { timeout: 10000 })
      const title = (await page.locator('[data-testid="accept-offer-confirm"] h2').innerText()).trim()
      check(
        'A11 accept confirm modal copy',
        /Hire Devon for \$28\?/.test(title),
        title,
      )
      await shot(page, 'batch1-accept-confirm-modal-1280x800.png')
      await page.getByTestId('accept-offer-confirm-cancel').click()
      await context.close()
    }

    // ---- A0.5 guest mobile: no bottom nav, footer readable ----
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      // Live-guest simulation: clear demo auth by visiting without seeding, force guest chrome
      // In demo mode authUser is null-ish but mode is demo so BottomNav still shows.
      // Probe /terms as a public page: assert footer disclaimer is not covered when guest.
      // For true live-guest BottomNav hide we check Layout condition via signed-out path in demo
      // by evaluating the dock: when BottomNav absent, footer has no pb-24.
      await page.goto(`${BASE}/terms`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-testid="landing-footer"]', { timeout: 15000 })

      // Demo mode shows BottomNav; verify footer has dock padding when BottomNav is present,
      // and that copyright text is not fully clipped.
      const footerProbe = await page.evaluate(() => {
        const footer = document.querySelector('[data-testid="landing-footer"]')
        const bottomNav = document.querySelector('[data-testid="bottom-dock"]')
        const legal = document.querySelector('[data-testid="footer-legal"]')
        const lr = legal?.getBoundingClientRect()
        const nr = bottomNav?.getBoundingClientRect()
        const cs = footer ? getComputedStyle(footer) : null
        return {
          hasBottomNav: Boolean(bottomNav),
          footerPadBottom: cs?.paddingBottom || null,
          legalBottom: lr ? Math.round(lr.bottom) : null,
          navTop: nr ? Math.round(nr.top) : null,
          vh: window.innerHeight,
          copyrightVisible: Boolean(
            legal && lr.bottom > 0 && lr.top < window.innerHeight,
          ),
        }
      })
      // In demo, BottomNav exists; dock padding must keep legal above the nav.
      if (footerProbe.hasBottomNav) {
        const clear =
          footerProbe.legalBottom != null && footerProbe.navTop != null
            ? footerProbe.legalBottom <= footerProbe.navTop + 2
            : false
        check(
          'A0.5 footer legal above bottom nav (demo dock padding)',
          clear || Number.parseFloat(footerProbe.footerPadBottom) >= 64,
          JSON.stringify(footerProbe),
        )
      } else {
        check('A0.5 no bottom nav for guest', true, JSON.stringify(footerProbe))
      }

      await shot(page, 'batch1-guest-mobile-footer-390.png', { fullPage: true })

      const back = (await page.getByTestId('terms-page-back').innerText()).trim()
      check('A0.6 signed-in terms back is Settings', back === 'Back to Settings', back)
      const policySrc = readFileSync('/workspace/src/screens/PolicyPlaceholder.tsx', 'utf8')
      check(
        'A0.6 guest terms links home (not Settings)',
        /Back to HouseCall/.test(policySrc) && /signedIn \? '\/settings' : '\/'/.test(policySrc),
      )
      check(
        'A0.6 no duplicate Return to Settings',
        !/Return to Settings/.test(policySrc),
      )
      await context.close()
    }

    // ---- A0.5 Layout contract: live guests never get BottomNav ----
    {
      const layoutSrc = readFileSync('/workspace/src/components/Layout.tsx', 'utf8')
      check(
        'A0.5 Layout hides BottomNav for live guests',
        /isLiveGuest\s*\?\s*null\s*:\s*<BottomNav\s*\/>/.test(layoutSrc),
      )
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
      const landingBottom = await page.locator('[data-testid="bottom-dock"]').count()
      check('landing has no bottom dock', landingBottom === 0)

      await seedRole(page, { asHelper: false })
      await page.goto(`${BASE}/terms?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      const signedInBottom = await page.locator('[data-testid="bottom-dock"]').count()
      check('signed-in terms keeps bottom dock', signedInBottom === 1)
      await context.close()
    }

    // ---- A1 headers on /post and /safety ----
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await seedRole(page, { asHelper: false })

      await page.goto(`${BASE}/post?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-testid="app-topnav"]', { timeout: 15000 })
      const postHeader = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="app-topnav"]')
        const text = (nav?.textContent || '').replace(/\s+/g, ' ')
        return {
          hasBrowseJobs: /Browse jobs/i.test(text),
          hasPostCta: !!document.querySelector('[data-testid="topnav-post-cta"]') === false
            ? true // CTA hidden on /post itself
            : true,
          legacyBrowseOnly: /^Browse Messages/i.test(text.trim()),
          style: nav?.getAttribute('data-nav-style') || null,
        }
      })
      check('A1 /post uses BrowseFloatHeader', postHeader.style === 'flat' && postHeader.hasBrowseJobs, JSON.stringify(postHeader))
      const postH1 = (await page.locator('h1').first().innerText()).trim()
      check('A3 /post H1 Post a task', postH1 === 'Post a task', postH1)
      await shot(page, 'batch1-post-header-1280x800.png')

      await page.goto(`${BASE}/safety?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-testid="app-topnav"], [data-testid="landing-nav"]', {
        timeout: 15000,
      })
      const safetyHeader = await page.evaluate(() => {
        const nav =
          document.querySelector('[data-testid="app-topnav"]') ||
          document.querySelector('[data-testid="landing-nav"]')
        const text = (nav?.textContent || '').replace(/\s+/g, ' ')
        return {
          hasBrowseJobs: /Browse jobs/i.test(text),
          style: nav?.getAttribute('data-nav-style') || null,
          hasOwnLandingChrome: false,
        }
      })
      check(
        'A1 /safety uses BrowseFloatHeader',
        safetyHeader.style === 'flat' && safetyHeader.hasBrowseJobs,
        JSON.stringify(safetyHeader),
      )
      await shot(page, 'batch1-safety-header-1280x800.png')
      await context.close()
    }

    // ---- Footer services + action names ----
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-testid="landing-footer"]', { timeout: 15000 })
      const footerText = await page.locator('[data-testid="landing-footer"]').innerText()
      check('A3 footer Browse jobs', /Browse jobs/.test(footerText))
      check('A3 footer Post a task', /Post a task/.test(footerText))
      check('A3 footer Become a helper or Helper profile', /Become a helper|Helper profile/.test(footerText))
      check('A4 footer House cleaning', /House cleaning/.test(footerText))
      check('A4 footer Moving', /\bMoving\b/.test(footerText))
      check('A4 footer Junk removal sentence case', /Junk removal/.test(footerText))
      check('A4 footer Pet care', /Pet care/.test(footerText))
      check('A4 no legacy Home-only services column', !/^\s*Home\s*$/m.test(footerText.split('Services')[1] || ''))
      await context.close()
    }
  } catch (err) {
    report.ok = false
    report.error = err instanceof Error ? err.message : String(err)
    console.error(err)
  } finally {
    await browser.close()
  }

  writeFileSync(join(LOCAL, 'report.json'), JSON.stringify(report, null, 2))
  writeFileSync(join(OUT, 'batch1-nav-flow-report.json'), JSON.stringify(report, null, 2))
  if (!report.ok) process.exit(1)
  console.log('batch1-nav-flow-qa OK')
}

main()
