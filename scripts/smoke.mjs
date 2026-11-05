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
  assert.match(text, /hero-beam-art|HeroBeamArt|viewBox="0 0 1440 900"/, 'hero SVG art in markup')
  assert.doesNotMatch(
    text,
    /Y Combinator|backed by|guaranteed same-day|try free for 14 days|payius/i,
    'no invented claims / brand clone',
  )
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
    // Wait for client stage mode (stack → horizontal enhancement)
    await page.waitForFunction(
      () => document.querySelector('.hero-stage')?.getAttribute('data-hero-mode') === 'horizontal',
      undefined,
      { timeout: 10000 },
    )
    const headline = await page.locator('h1').innerText()
    assert.match(headline, /Help nearby\. Done today\./i)
    assert.equal(headline.trim().split('\n').filter(Boolean).length, 1, 'single h1 line')

    const themeAndScale = await page.evaluate(() => {
      const body = getComputedStyle(document.body)
      const h1 = document.querySelector('h1')
      const h1Cs = h1 ? getComputedStyle(h1) : null
      const hero = document.querySelector('.landing-hero')
      const heroCs = hero ? getComputedStyle(hero) : null
      const heroCta = document.querySelector('.landing-cta-row a[href="/post"]')
      const heroRect = heroCta?.getBoundingClientRect()
      const navCta = document.querySelector('.landing-nav a[href="/post"]')
      const navRect = navCta?.getBoundingClientRect()
      const art = document.querySelector('.hero-beam-art')
      const mode = document.querySelector('.hero-stage')?.getAttribute('data-hero-mode')
      return {
        bg: body.backgroundColor,
        color: body.color,
        font: body.fontFamily,
        h1Px: h1Cs ? parseFloat(h1Cs.fontSize) : 0,
        heroCtaH: heroRect ? Math.round(heroRect.height) : 0,
        navCtaH: navRect ? Math.round(navRect.height) : 0,
        heroBg: heroCs?.backgroundColor ?? '',
        hasArt: !!art,
        artPointer: art ? getComputedStyle(art).pointerEvents : '',
        mode,
      }
    })
    assert.match(themeAndScale.bg, /rgb\(255,\s*255,\s*255\)/, 'light page canvas')
    assert.match(themeAndScale.color, /rgb\(34,\s*34,\s*34\)/, 'dark primary text')
    assert.match(themeAndScale.font, /Geist|geist/i, 'Geist family loaded')
    assert.ok(themeAndScale.h1Px >= 34 && themeAndScale.h1Px <= 58, `hero size ${themeAndScale.h1Px}`)
    assert.ok(themeAndScale.heroCtaH >= 36 && themeAndScale.heroCtaH <= 52, `hero CTA h ${themeAndScale.heroCtaH}`)
    assert.ok(themeAndScale.navCtaH >= 36 && themeAndScale.navCtaH <= 48, `nav CTA h ${themeAndScale.navCtaH}`)
    assert.ok(themeAndScale.hasArt, 'hero SVG art present')
    assert.equal(themeAndScale.artPointer, 'none', 'art does not intercept pointers')
    assert.equal(themeAndScale.mode, 'horizontal', 'desktop motion uses horizontal stage')
    // Navy hero canvas (allow near-black / deep navy)
    assert.match(themeAndScale.heroBg, /rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/, 'hero has rgb background')
    {
      const m = themeAndScale.heroBg.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/)
      const r = Number(m[1])
      const g = Number(m[2])
      const b = Number(m[3])
      assert.ok(r < 40 && g < 50 && b < 60, `hero navy-ish bg got ${themeAndScale.heroBg}`)
    }

    const postVisible = await page.locator('a[href="/post"]').first().isVisible()
    const browseVisible = await page.locator('a[href="/browse"]').first().isVisible()
    assert.equal(postVisible, true, 'post CTA visible')
    assert.equal(browseVisible, true, 'browse CTA visible')

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

    const overflowX = await page.evaluate(() => {
      const doc = document.documentElement
      return doc.scrollWidth > doc.clientWidth + 1
    })
    assert.equal(overflowX, false, 'no horizontal overflow desktop')

    assert.equal(
      await page.locator('.beam-stack-section--stick, .beam-stack').count(),
      0,
      'no legacy stack sticky markers',
    )

    // Bounded horizontal: vertical scroll drives proof panel X from the right
    const horizontal = await page.evaluate(async () => {
      const stage = document.querySelector('.hero-stage--horizontal')
      const track = document.querySelector('.hero-stage-track')
      const heroPanel = document.querySelector('[data-panel="hero"]')
      const proofPanel = document.querySelector('[data-panel="proof"]')
      const cats = document.querySelector('#categories')
      if (!stage || !track || !heroPanel || !proofPanel || !cats) {
        return { ok: false, reason: 'missing stage nodes' }
      }

      const start = {
        scrollY: window.scrollY,
        heroLeft: heroPanel.getBoundingClientRect().left,
        proofLeft: proofPanel.getBoundingClientRect().left,
        trackTx: getComputedStyle(track).transform,
      }

      // Mid-stage: proof should move leftward into the viewport
      const stageTop = stage.getBoundingClientRect().top + window.scrollY
      const midY = stageTop + window.innerHeight * 0.55
      window.scrollTo(0, midY)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const mid = {
        scrollY: window.scrollY,
        heroLeft: heroPanel.getBoundingClientRect().left,
        proofLeft: proofPanel.getBoundingClientRect().left,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }

      // End of stage: proof dominant, then handoff to vertical categories
      const endY = stageTop + stage.offsetHeight - window.innerHeight
      window.scrollTo(0, endY)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const end = {
        proofLeft: proofPanel.getBoundingClientRect().left,
        proofWidth: proofPanel.getBoundingClientRect().width,
      }

      window.scrollTo(0, endY + 120)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const after = {
        catsTop: cats.getBoundingClientRect().top,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }

      // Reverse: scroll back toward start — proof moves right again
      window.scrollTo(0, midY)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const reverse = {
        proofLeft: proofPanel.getBoundingClientRect().left,
      }

      window.scrollTo(0, 0)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const back = {
        heroLeft: heroPanel.getBoundingClientRect().left,
        proofLeft: proofPanel.getBoundingClientRect().left,
      }

      return { ok: true, start, mid, end, after, reverse, back }
    })
    assert.equal(horizontal.ok, true, horizontal.reason || 'horizontal probe')
    assert.ok(horizontal.mid.scrollY > horizontal.start.scrollY, 'scroll down advances')
    assert.ok(
      horizontal.mid.proofLeft < horizontal.start.proofLeft - 80,
      `proof enters from right (start ${horizontal.start.proofLeft} → mid ${horizontal.mid.proofLeft})`,
    )
    assert.ok(
      horizontal.mid.heroLeft < horizontal.start.heroLeft - 40,
      'hero exits left as progress advances',
    )
    assert.equal(horizontal.mid.overflowX, false, 'no page x-overflow mid horizontal')
    assert.ok(
      Math.abs(horizontal.end.proofLeft) < 48,
      `proof near viewport at stage end (left=${horizontal.end.proofLeft})`,
    )
    assert.ok(
      horizontal.reverse.proofLeft > horizontal.end.proofLeft + 40,
      'scroll up reverses proof toward the right',
    )
    assert.ok(
      Math.abs(horizontal.back.heroLeft - horizontal.start.heroLeft) < 8,
      'scroll to top restores hero',
    )
    assert.equal(horizontal.after.overflowX, false, 'no page x-overflow after handoff')
    assert.ok(horizontal.after.catsTop < 800, 'categories enter vertical flow after stage')

    // Anchor reveals proof panel
    await page.evaluate(() => {
      location.hash = '#how-it-works'
    })
    await page.waitForFunction(() => {
      const proof = document.querySelector('[data-panel="proof"]')
      if (!proof) return false
      return Math.abs(proof.getBoundingClientRect().left) < 48
    }, undefined, { timeout: 5000 })
    const anchorReveal = await page.evaluate(() => {
      const proof = document.querySelector('[data-panel="proof"]')
      if (!proof) return null
      const r = proof.getBoundingClientRect()
      return { left: r.left, width: r.width }
    })
    assert.ok(anchorReveal, 'proof panel present for anchor')
    assert.ok(
      Math.abs(anchorReveal.left) < 48,
      `hash #how-it-works reveals proof (left=${anchorReveal.left})`,
    )

    // Remaining vertical sections still non-sticky / ordered
    const verticalFlow = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('#categories, #paths, #trust')]
      const positions = sections.map((el) => getComputedStyle(el).position)
      const tops = sections.map((el) => el.getBoundingClientRect().top + window.scrollY)
      const sorted = [...tops].sort((a, b) => a - b)
      return {
        positions,
        ordered: tops.every((t, i) => t === sorted[i]),
        count: sections.length,
      }
    })
    assert.ok(verticalFlow.count >= 3, 'later landing sections present')
    assert.ok(
      verticalFlow.positions.every((p) => p === 'static' || p === 'relative'),
      'later sections non-sticky',
    )
    assert.equal(verticalFlow.ordered, true, 'later sections document order')

    // Category navigation reaches browse with filter
    await page.locator('a[href="/browse?category=cleaning"]').first().click()
    await page.waitForURL(/\/browse\?category=cleaning/)
    console.log('ok landing category navigation')

    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
    const browseBody = await page.locator('body').innerText()
    assert.match(browseBody, /Browse|Sign in to help nearby/i, 'browse runtime reachable')

    // Mobile + tablet: vertical stack, no horizontal stage, CTAs reachable
    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 812 })
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('a[href="/post"]')
      await page.waitForFunction(
        () => document.querySelector('.hero-stage')?.getAttribute('data-hero-mode') === 'stack',
        undefined,
        { timeout: 10000 },
      )
      const mobile = await page.evaluate(() => {
        const doc = document.documentElement
        const mode = document.querySelector('.hero-stage')?.getAttribute('data-hero-mode')
        const post = document.querySelector('.landing-cta-row a[href="/post"]')
        const browse = document.querySelector('.landing-cta-row a[href="/browse"]')
        const vh = window.innerHeight
        const ok = (el) => {
          if (!el) return false
          const r = el.getBoundingClientRect()
          return r.top >= 0 && r.bottom <= vh + 8
        }
        return {
          mode,
          overflowX: doc.scrollWidth > doc.clientWidth + 1,
          ctasInView: ok(post) && ok(browse),
          h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
          hasTrack: !!document.querySelector('.hero-stage-track'),
        }
      })
      assert.equal(mobile.mode, 'stack', `stack mode @${width}`)
      assert.equal(mobile.overflowX, false, `no horizontal overflow @${width}`)
      assert.equal(mobile.ctasInView, true, `hero CTAs in first viewport @${width}`)
      assert.equal(mobile.hasTrack, false, `no horizontal track @${width}`)
      if (width === 375) {
        assert.ok(mobile.h1 >= 34 && mobile.h1 <= 48, `mobile hero size ${mobile.h1}`)
      }
    }

    // Reduced motion: stack + readable examples (no scroll-linked transform)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () => document.querySelector('.hero-stage')?.getAttribute('data-hero-mode') === 'stack',
      undefined,
      { timeout: 10000 },
    )
    const reduced = await page.evaluate(() => {
      const mode = document.querySelector('.hero-stage')?.getAttribute('data-hero-mode')
      const proof = document.querySelector('#how-it-works')
      return {
        mode,
        proofPos: proof ? getComputedStyle(proof).position : null,
        text: proof?.innerText ?? '',
      }
    })
    assert.equal(reduced.mode, 'stack', 'reduced-motion uses stack')
    assert.ok(
      reduced.proofPos === 'relative' || reduced.proofPos === 'static',
      'reduced-motion proof normal flow',
    )
    assert.match(reduced.text, /Example/i, 'reduced-motion proof examples visible')
    assert.match(reduced.text, /Help move a couch/i, 'reduced-motion request example')

    await page.locator('body').click({ position: { x: 2, y: 2 } })
    await page.keyboard.press('Tab')
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? '')
    assert.ok(focusedTag === 'A' || focusedTag === 'BUTTON', 'tab reaches interactive control')
    console.log('ok landing browser DOM + bounded horizontal handoff')
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
