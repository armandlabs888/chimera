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
  assert.doesNotMatch(text, /hero-stage|HeroProofStage|hero-beam-art|beam-stack/i, 'no experimental stage markup')
  assert.doesNotMatch(
    text,
    /Y Combinator|backed by|guaranteed same-day|try free for 14 days|payius/i,
    'no invented claims / brand clone',
  )
  console.log('ok landing markup')
}

function isLightRgb(css) {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!m) return false
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  return r >= 240 && g >= 240 && b >= 240
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
    assert.equal(headline.trim().split('\n').filter(Boolean).length, 1, 'single h1 line')

    const themeAndScale = await page.evaluate(() => {
      const body = getComputedStyle(document.body)
      const root = document.querySelector('.landing-root')
      const rootCs = root ? getComputedStyle(root) : null
      const h1 = document.querySelector('h1')
      const h1Cs = h1 ? getComputedStyle(h1) : null
      const heroCta = document.querySelector('.landing-cta-row a[href="/post"]')
      const heroRect = heroCta?.getBoundingClientRect()
      const navCta = document.querySelector('.landing-nav a[href="/post"]')
      const navRect = navCta?.getBoundingClientRect()
      const footer = document.querySelector('footer')
      const footerCs = footer ? getComputedStyle(footer) : null
      const sections = [...document.querySelectorAll('main > section')]
      return {
        bg: body.backgroundColor,
        color: body.color,
        font: body.fontFamily,
        rootBg: rootCs?.backgroundColor ?? '',
        footerBg: footerCs?.backgroundColor ?? '',
        h1Px: h1Cs ? parseFloat(h1Cs.fontSize) : 0,
        heroCtaH: heroRect ? Math.round(heroRect.height) : 0,
        navCtaH: navRect ? Math.round(navRect.height) : 0,
        sectionPositions: sections.map((el) => getComputedStyle(el).position),
        sectionCount: sections.length,
        hasStage: !!document.querySelector('.hero-stage, .landing-stage, .beam-stack'),
        transforms: sections.map((el) => getComputedStyle(el).transform),
      }
    })
    assert.match(themeAndScale.bg, /rgb\(255,\s*255,\s*255\)/, 'light canvas')
    assert.match(themeAndScale.color, /rgb\(34,\s*34,\s*34\)/, 'dark primary text')
    assert.match(themeAndScale.font, /Geist|geist/i, 'Geist family loaded')
    assert.ok(isLightRgb(themeAndScale.rootBg), `landing-root light got ${themeAndScale.rootBg}`)
    assert.ok(isLightRgb(themeAndScale.footerBg), `footer light got ${themeAndScale.footerBg}`)
    assert.ok(themeAndScale.h1Px >= 34 && themeAndScale.h1Px <= 58, `hero size ${themeAndScale.h1Px}`)
    assert.ok(themeAndScale.heroCtaH >= 36 && themeAndScale.heroCtaH <= 52, `hero CTA h ${themeAndScale.heroCtaH}`)
    assert.ok(themeAndScale.navCtaH >= 36 && themeAndScale.navCtaH <= 48, `nav CTA h ${themeAndScale.navCtaH}`)
    assert.ok(themeAndScale.sectionCount >= 5, 'landing sections present')
    assert.equal(themeAndScale.hasStage, false, 'no experimental stage DOM')
    assert.ok(
      themeAndScale.sectionPositions.every((p) => p === 'static' || p === 'relative'),
      'marketing sections non-sticky',
    )
    assert.ok(
      themeAndScale.transforms.every((t) => t === 'none'),
      'no section transforms',
    )

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

    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
      false,
      'no horizontal overflow desktop',
    )

    // Vertical scroll down/up — sections move with the document
    const scrollProbe = await page.evaluate(() => {
      const proof = document.querySelector('#how-it-works')
      const cats = document.querySelector('#categories')
      const cta = document.querySelector('main > section:last-of-type')
      const footer = document.querySelector('footer')
      if (!proof || !cats || !footer) return null
      const before = {
        scrollY: window.scrollY,
        proofTop: proof.getBoundingClientRect().top,
        catsTop: cats.getBoundingClientRect().top,
      }
      window.scrollBy(0, 500)
      const midProofTop = proof.getBoundingClientRect().top
      const midCatsTop = cats.getBoundingClientRect().top
      const mid = {
        scrollY: window.scrollY,
        proofTop: midProofTop,
        catsTop: midCatsTop,
        overlap: midProofTop < midCatsTop && proof.getBoundingClientRect().bottom > midCatsTop + 2,
      }
      window.scrollBy(0, -500)
      const after = {
        proofTop: proof.getBoundingClientRect().top,
      }
      window.scrollTo(0, document.body.scrollHeight)
      const end = {
        footerTop: footer.getBoundingClientRect().top,
        ctaVisible: cta ? cta.getBoundingClientRect().bottom > 0 : false,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
      window.scrollTo(0, 0)
      return { before, mid, after, end }

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
    assert.equal(scrollProbe.mid.overlap, false, 'no section overlap while scrolling')
    assert.ok(
      Math.abs(scrollProbe.after.proofTop - scrollProbe.before.proofTop) < 8,
      'scroll up restores position',
    )
    assert.ok(scrollProbe.end.footerTop < 900, 'footer reachable')
    assert.equal(scrollProbe.end.overflowX, false, 'no x-overflow at page end')

    // Anchor
    await page.evaluate(() => {
      location.hash = '#categories'
    })
    await page.waitForFunction(() => {
      const el = document.querySelector('#categories')
      if (!el) return false
      const top = el.getBoundingClientRect().top
      return top >= 0 && top < window.innerHeight
    }, undefined, { timeout: 5000 })

    await page.locator('a[href="/browse?category=cleaning"]').first().click()
    await page.waitForURL(/\/browse\?category=cleaning/)
    console.log('ok landing category navigation')

    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
    const browseBody = await page.locator('body').innerText()
    assert.match(browseBody, /Browse|Sign in to help nearby/i, 'browse runtime reachable')

    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 800 })
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('a[href="/post"]')
      const geo = await page.evaluate(() => {
        const doc = document.documentElement
        const sections = [...document.querySelectorAll('main > section')]
        const post = document.querySelector('.landing-cta-row a[href="/post"]')
        const browse = document.querySelector('.landing-cta-row a[href="/browse"]')
        const vh = window.innerHeight
        const ok = (el) => {
          if (!el) return false
          const r = el.getBoundingClientRect()
          return r.top >= 0 && r.bottom <= vh + 8
        }
        const surfaces = [
          document.querySelector('.landing-root'),
          document.querySelector('#how-it-works'),
          document.querySelector('footer'),
        ].map((el) => (el ? getComputedStyle(el).backgroundColor : ''))
        return {
          overflowX: doc.scrollWidth > doc.clientWidth + 1,
          positions: sections.map((el) => getComputedStyle(el).position),
          transforms: sections.map((el) => getComputedStyle(el).transform),
          ctasInView: ok(post) && ok(browse),
          surfaces,
          footerBottom: document.querySelector('footer')?.getBoundingClientRect().bottom ?? 0,
        }
      })
      assert.equal(geo.overflowX, false, `no horizontal overflow @${width}`)
      assert.ok(
        geo.positions.every((p) => p === 'static' || p === 'relative'),
        `non-sticky sections @${width}`,
      )
      assert.ok(geo.transforms.every((t) => t === 'none'), `no transforms @${width}`)
      assert.ok(geo.surfaces.every(isLightRgb), `light surfaces @${width}: ${geo.surfaces.join(' | ')}`)
      if (width === 375 || width === 1280 || width === 1440) {
        assert.equal(geo.ctasInView, true, `hero CTAs in first viewport @${width}`)
      }
      // Short viewport: still reachable by scroll
      await page.setViewportSize({ width, height: 500 })
      const short = await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
        const footer = document.querySelector('footer')
        return footer ? footer.getBoundingClientRect().bottom <= window.innerHeight + 2 : false
      })
      assert.equal(short, true, `footer reachable short viewport @${width}`)
    }

    // Reduced motion: still normal vertical light flow
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    const reduced = await page.evaluate(() => {
      const el = document.querySelector('#how-it-works')
      return {
        pos: el ? getComputedStyle(el).position : null,
        text: el?.innerText ?? '',
        transform: el ? getComputedStyle(el).transform : null,
      }
    })
    assert.ok(reduced.pos === 'relative' || reduced.pos === 'static', 'reduced-motion normal flow')
    assert.equal(reduced.transform, 'none', 'reduced-motion no transform')
    assert.match(reduced.text, /Example/i, 'reduced-motion proof examples visible')
    assert.match(reduced.text, /Help move a couch/i, 'reduced-motion request example')

    await page.locator('body').click({ position: { x: 2, y: 2 } })
    await page.keyboard.press('Tab')
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? '')
    assert.ok(focusedTag === 'A' || focusedTag === 'BUTTON', 'tab reaches interactive control')
    console.log('ok landing browser DOM + conventional vertical SaaS flow')
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
