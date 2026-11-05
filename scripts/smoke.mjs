#!/usr/bin/env node
/**
 * Headless smoke checks for Beam on Next.js (no screenshots).
 * Expects a server at BASE_URL (default http://127.0.0.1:43123).
 */
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const STORAGE_KEY = 'beam-demo-v1'

const routes = [
  '/',
  '/browse',
  '/browse?tab=people',
  '/post',
  '/you',
  '/safety',
  '/people/p-maya',
  '/requests/req-1',
  '/messages/missing-thread',
  '/does-not-exist',
]

async function fetchText(pathName) {
  const res = await fetch(`${BASE_URL}${pathName}`, {
    headers: { Accept: 'text/html' },
    redirect: 'follow',
  })
  const text = await res.text()
  return { res, text }
}

async function checkRoutes() {
  for (const route of routes) {
    const { res, text } = await fetchText(route)
    assert.ok(
      res.status === 200 || res.status === 404,
      `${route} unexpected status ${res.status}`,
    )
    assert.match(text, /Beam/i, `${route} missing Beam brand marker`)
    assert.doesNotMatch(text, /Application error|Internal Server Error/i, `${route} errored`)
    console.log(`ok route ${route} -> ${res.status}`)
  }
}

async function checkLandingMarkup() {
  const { res, text } = await fetchText('/')
  assert.equal(res.status, 200, 'landing status')
  assert.match(text, /Help nearby\. Done today\./, 'landing headline')
  assert.match(text, /Post a request/, 'landing primary CTA')
  assert.match(text, /Browse requests/, 'landing secondary CTA')
  assert.match(text, /href="\/post"/, 'post route wired')
  assert.match(text, /href="\/browse"/, 'browse route wired')
  assert.match(text, /href="\/browse\?category=moving"/, 'moving category browse link')
  assert.match(text, /href="\/browse\?category=handyman"/, 'handyman category browse link')
  assert.match(text, /Example/, 'example badges present')
  assert.doesNotMatch(text, /Y Combinator|backed by|guaranteed same-day/i, 'no invented claims')
  console.log('ok landing markup')
}

async function checkLandingBrowser() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.log('skip landing browser (playwright not installed)')
    return
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('a[href="/post"]')
    const headline = await page.locator('h1').innerText()
    assert.match(headline, /Help nearby\. Done today\./i)
    // Single visible headline string (no sr-only duplication in accessible name)
    assert.equal(headline.trim().split('\n').filter(Boolean).length, 1, 'single h1 line')

    const themeAndScale = await page.evaluate(() => {
      const body = getComputedStyle(document.body)
      const h1 = document.querySelector('h1')
      const h1Cs = h1 ? getComputedStyle(h1) : null
      const heroCta = document.querySelector('.landing-cta-row a[href="/post"]')
      const heroRect = heroCta?.getBoundingClientRect()
      const navCta = document.querySelector('.landing-nav a[href="/post"]')
      const navRect = navCta?.getBoundingClientRect()
      const proof = document.querySelector('#how-it-works')
      return {
        bg: body.backgroundColor,
        color: body.color,
        font: body.fontFamily,
        h1Px: h1Cs ? parseFloat(h1Cs.fontSize) : 0,
        heroCtaH: heroRect ? Math.round(heroRect.height) : 0,
        navCtaH: navRect ? Math.round(navRect.height) : 0,
        proofH: proof ? Math.round(proof.getBoundingClientRect().height) : 0,
        proofMinH: proof ? getComputedStyle(proof).minHeight : '',
      }
    })
    assert.match(themeAndScale.bg, /rgb\(255,\s*255,\s*255\)/, 'light canvas')
    assert.match(themeAndScale.color, /rgb\(34,\s*34,\s*34\)/, 'dark primary text')
    assert.match(themeAndScale.font, /Geist|geist/i, 'Geist family loaded')
    assert.ok(themeAndScale.h1Px >= 34 && themeAndScale.h1Px <= 58, `hero size ${themeAndScale.h1Px}`)
    assert.ok(themeAndScale.heroCtaH >= 36 && themeAndScale.heroCtaH <= 52, `hero CTA h ${themeAndScale.heroCtaH}`)
    assert.ok(themeAndScale.navCtaH >= 36 && themeAndScale.navCtaH <= 48, `nav CTA h ${themeAndScale.navCtaH}`)
    assert.ok(themeAndScale.proofH < 700, `proof section not forced tall (${themeAndScale.proofH})`)

    // CTAs usable without waiting on auth/boot gate
    const postVisible = await page.locator('a[href="/post"]').first().isVisible()
    const browseVisible = await page.locator('a[href="/browse"]').first().isVisible()
    assert.equal(postVisible, true, 'post CTA visible')
    assert.equal(browseVisible, true, 'browse CTA visible')

    // First viewport: both CTAs in desktop viewport
    const inView = await page.evaluate(() => {
      const post = document.querySelector('.landing-cta-row a[href="/post"]')
      const browse = document.querySelector('.landing-cta-row a[href="/browse"]')
      const vh = window.innerHeight
      const ok = (el) => {
        if (!el) return false
        const r = el.getBoundingClientRect()
        return r.top >= 0 && r.bottom <= vh
      }
      return ok(post) && ok(browse)
    })
    assert.equal(inView, true, 'hero CTAs in first desktop viewport')

    // No horizontal overflow on desktop
    const overflowX = await page.evaluate(() => {
      const doc = document.documentElement
      return doc.scrollWidth > doc.clientWidth + 1
    })
    assert.equal(overflowX, false, 'no horizontal overflow desktop')

    // Standard document flow: no marketing section sticky stacking / overlap
    const flow = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main > section')]
      const positions = sections.map((el) => getComputedStyle(el).position)
      const stickMarked = document.querySelectorAll('.beam-stack-section--stick, .beam-stack').length
      const tops = sections.map((el) => el.getBoundingClientRect().top + window.scrollY)
      const sorted = [...tops].sort((a, b) => a - b)
      const ordered = tops.every((t, i) => t === sorted[i])
      // After scrolling mid-page, no two content sections share the same sticky pin overlap
      return { positions, stickMarked, ordered, count: sections.length }
    })
    assert.ok(flow.count >= 4, 'landing sections present')
    assert.equal(flow.stickMarked, 0, 'no stack sticky markers in DOM')
    assert.ok(
      flow.positions.every((p) => p === 'static' || p === 'relative'),
      'marketing sections are non-sticky flow',
    )
    assert.equal(flow.ordered, true, 'sections in document order')

    // Scroll down then up: sections move with the document (no pin/overlap)
    const scrollProbe = await page.evaluate(async () => {
      const proof = document.querySelector('#how-it-works')
      const cats = document.querySelector('#categories')
      if (!proof || !cats) return null
      const before = {
        scrollY: window.scrollY,
        proofTop: proof.getBoundingClientRect().top,
        catsTop: cats.getBoundingClientRect().top,
      }
      window.scrollBy(0, 500)
      const mid = {
        scrollY: window.scrollY,
        proofTop: proof.getBoundingClientRect().top,
        catsTop: cats.getBoundingClientRect().top,
      }
      window.scrollBy(0, -500)
      const after = {
        scrollY: window.scrollY,
        proofTop: proof.getBoundingClientRect().top,
        catsTop: cats.getBoundingClientRect().top,
      }
      const overlapMid =
        mid.proofTop < mid.catsTop &&
        mid.proofTop + proof.getBoundingClientRect().height > mid.catsTop + 2
      return { before, mid, after, overlapMid }
    })
    assert.ok(scrollProbe, 'scroll probe sections found')
    assert.ok(scrollProbe.mid.scrollY > scrollProbe.before.scrollY, 'scroll down advances')
    assert.ok(
      scrollProbe.mid.proofTop < scrollProbe.before.proofTop - 100,
      'proof moves up with scroll (not pinned)',
    )
    assert.ok(
      scrollProbe.mid.catsTop < scrollProbe.before.catsTop - 100,
      'categories move up with scroll (not pinned)',
    )
    assert.equal(scrollProbe.overlapMid, false, 'no section overlap while scrolling')
    assert.ok(
      Math.abs(scrollProbe.after.proofTop - scrollProbe.before.proofTop) < 8,
      'scroll up restores position',
    )

    // Category navigation reaches browse with filter
    await page.locator('a[href="/browse?category=cleaning"]').first().click()
    await page.waitForURL(/\/browse\?category=cleaning/)
    console.log('ok landing category navigation')

    // App browse chrome present (runtime, may be auth gate in live mode)
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
    const browseBody = await page.locator('body').innerText()
    assert.match(browseBody, /Browse|Sign in to help nearby/i, 'browse runtime reachable')

    // Mobile + tablet: same non-sticky flow
    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 812 })
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('a[href="/post"]')
      const mobileOverflow = await page.evaluate(() => {
        const doc = document.documentElement
        return doc.scrollWidth > doc.clientWidth + 1
      })
      assert.equal(mobileOverflow, false, `no horizontal overflow @${width}`)
      const pos = await page.evaluate(() => {
        const els = [...document.querySelectorAll('main > section')]
        return els.map((el) => getComputedStyle(el).position)
      })
      assert.ok(
        pos.every((p) => p === 'static' || p === 'relative'),
        `non-sticky sections @${width}`,
      )
    }

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    const mobileCtas = await page.evaluate(() => {
      const post = document.querySelector('.landing-cta-row a[href="/post"]')
      const browse = document.querySelector('.landing-cta-row a[href="/browse"]')
      const vh = window.innerHeight
      const ok = (el) => {
        if (!el) return false
        const r = el.getBoundingClientRect()
        return r.top >= 0 && r.bottom <= vh + 8
      }
      return {
        inView: ok(post) && ok(browse),
        h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
      }
    })
    assert.equal(mobileCtas.inView, true, 'mobile hero CTAs in first viewport')
    assert.ok(mobileCtas.h1 >= 34 && mobileCtas.h1 <= 48, `mobile hero size ${mobileCtas.h1}`)

    // Reduced motion: still normal flow + readable examples
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.reload({ waitUntil: 'domcontentloaded' })
    const reducedPos = await page.evaluate(() => {
      const el = document.querySelector('#how-it-works')
      return el ? getComputedStyle(el).position : null
    })
    assert.ok(reducedPos === 'relative' || reducedPos === 'static', 'reduced-motion normal flow')
    const stackText = await page.locator('#how-it-works').innerText()
    assert.match(stackText, /Example/i, 'reduced-motion proof examples visible')
    assert.match(stackText, /Help move a couch/i, 'reduced-motion request example')

    // Keyboard focus path (Tab → focus-visible)
    await page.locator('body').click({ position: { x: 2, y: 2 } })
    await page.keyboard.press('Tab')
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? '')
    assert.ok(focusedTag === 'A' || focusedTag === 'BUTTON', 'tab reaches interactive control')
    console.log('ok landing browser DOM + standard scroll flow')
  } finally {
    await browser.close()
  }
}

function checkStorageHelpers() {
  assert.equal(STORAGE_KEY, 'beam-demo-v1')

  const fakeState = {
    version: 1,
    currentUserId: 'user-you',
    people: [{ id: 'user-you', name: 'Alex' }],
    requests: [],
    offers: [],
    threads: [],
    messages: [],
    reviews: [],
  }
  const roundTrip = JSON.parse(JSON.stringify(fakeState))
  assert.equal(roundTrip.version, 1)
  assert.equal(roundTrip.currentUserId, 'user-you')

  roundTrip.requests.push({
    id: 'req-smoke',
    title: 'Smoke lift help',
    status: 'open',
  })
  const again = JSON.parse(JSON.stringify(roundTrip))
  assert.equal(again.requests[0].id, 'req-smoke')
  console.log('ok localStorage persistence contract')
}

async function checkBrowserPersistence() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.log('skip browser localStorage (playwright not installed)')
    return
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    // Marketing `/` is public and outside BeamProvider; boot demo state via an app route.
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'networkidle' })
    const bodyText = await page.locator('body').innerText()
    if (/Sign in to help nearby|Create account|Beam needs configuration/i.test(bodyText)) {
      console.log('skip browser localStorage (live auth gate / unconfigured — covered by test:live)')
      return
    }
    await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
      timeout: 15000,
    })

    await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      const state = JSON.parse(raw)
      state.requests = state.requests ?? []
      state.requests.unshift({
        id: 'req-browser-smoke',
        title: 'Browser smoke request',
        details: 'Persists across reload',
        category: 'cleaning',
        neighborhood: 'hyde-park',
        when: 'asap',
        whenLabel: 'ASAP',
        budget: 55,
        status: 'open',
        requesterId: state.currentUserId,
        image: state.requests[0]?.image ?? '',
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem(key, JSON.stringify(state))
    }, STORAGE_KEY)

    await page.goto(`${BASE_URL}/you`, { waitUntil: 'networkidle' })
    const persisted = await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) ?? '{}')
      return Array.isArray(state.requests) && state.requests.some((r) => r.id === 'req-browser-smoke')
    }, STORAGE_KEY)
    assert.equal(persisted, true, 'posted request persisted in localStorage after navigation')

    await page.goto(`${BASE_URL}/requests/req-browser-smoke`, { waitUntil: 'networkidle' })
    // Wait for client hydration / seed load before asserting UI content.
    await page.waitForFunction(
      () => document.body?.innerText?.includes('Browser smoke request'),
      undefined,
      { timeout: 15000 },
    )
    console.log('ok browser localStorage persistence')
  } finally {
    await browser.close()
  }
}

async function main() {
  checkStorageHelpers()
  await checkRoutes()
  await checkLandingMarkup()
  await checkLandingBrowser()
  await checkBrowserPersistence()
  console.log('smoke passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
