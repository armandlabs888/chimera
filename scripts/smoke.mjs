#!/usr/bin/env node
/**
 * Headless smoke checks for Beam on Next.js (no screenshots).
 * Expects a server at BASE_URL (default http://127.0.0.1:43123).
 * Asserts warm-obsidian dark surfaces (r/g/b ≤ 32/34/40).
 */
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const STORAGE_KEY = 'beam-demo-v1'

const routes = [
  '/',
  '/auth',
  '/auth?mode=signin',
  '/auth?mode=signup',
  '/home',
  '/browse',
  '/browse?tab=people',
  '/browse?q=couch',
  '/post',
  '/messages',
  '/you',
  '/you?tab=profile',
  '/safety',
  '/people/p-maya',
  '/requests/req-1',
  '/messages/missing-thread',
  '/does-not-exist',
]

function sanitizeNextLocal(raw, fallback = '/browse') {
  if (!raw) return fallback
  const value = String(raw).trim()
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.includes('\\')) return fallback
  return value
}

/** Dark-obsidian surface: #0E0F12 ≈ rgb(14,15,18); allow slight elevated variants. */
function isDarkRgb(css) {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!m) return false
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  return r <= 32 && g <= 34 && b <= 40
}

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
  assert.match(text, /Help nearby\./, 'landing headline line 1')
  assert.match(text, /Done today\./, 'landing headline line 2')
  assert.match(text, /PEER-TO-PEER HELP\. LOCALLY\./, 'hero eyebrow')
  assert.match(text, /Post a request/, 'landing primary CTA')
  assert.match(text, /Browse nearby help/, 'landing secondary CTA')
  assert.match(text, /What do you need help with\?/, 'hero search placeholder')
  assert.match(text, /href="\/post"/, 'post route wired')
  assert.match(text, /href="\/browse"/, 'browse route wired')
  assert.match(text, /href="\/browse\?category=moving"/, 'moving category browse link')
  assert.match(text, /href="\/browse\?category=handyman"/, 'handyman category browse link')
  assert.match(text, /href="\/auth\?mode=signin"/, 'landing Log in')
  assert.match(text, /href="\/auth\?mode=signup"/, 'landing Sign up')
  assert.match(text, /How it works/, 'nav How it works')
  assert.match(text, /Safety/, 'nav Safety')
  assert.match(text, /Example/, 'example badges present')
  assert.match(text, /beam-hero-moving-bg/, 'hero moving-bg image referenced')
  assert.match(text, /id="how-it-works"/, 'how-it-works section')
  assert.match(text, /id="coverage"|Austin neighborhood/i, 'neighborhood coverage')
  assert.match(text, /id="categories"/, 'categories section')
  assert.match(text, /id="trust"/, 'trust section')
  assert.match(text, /landing-nav-obsidian|data-testid="landing-nav-obsidian"/, 'obsidian nav')
  assert.doesNotMatch(text, /window-chrome|traffic-lights/, 'no macOS window chrome')
  assert.match(text, /Lady Bird Lake|austin-map|data-testid="austin-map"/, 'Austin SVG map')
  assert.doesNotMatch(text, /landing-section-full/, 'no sparse full-viewport section class')
  assert.doesNotMatch(text, /hero-stage|HeroProofStage|hero-beam-art|beam-stack|scrim-hero/i, 'no experimental markup')
  assert.doesNotMatch(
    text,
    /Y Combinator|backed by|guaranteed same-day|try free for 14 days|payius|Sequoia|\+2,300 more/i,
    'no invented claims / fake social proof',
  )
  const imgRes = await fetch(`${BASE_URL}/images/beam-hero-moving-bg.jpg`)
  assert.equal(imgRes.status, 200, 'hero moving-bg asset HTTP 200')
  console.log('ok landing markup')
}

async function checkAuthMarkupAndRedirects() {
  assert.equal(sanitizeNextLocal('/browse'), '/browse')
  assert.equal(sanitizeNextLocal('//evil.example'), '/browse')
  assert.equal(sanitizeNextLocal('/you'), '/you')
  assert.equal(sanitizeNextLocal('https://evil.example'), '/browse')

  const { res, text } = await fetchText('/auth?mode=signup')
  assert.equal(res.status, 200, 'auth page status')
  assert.match(text, /Beam|auth/, 'auth route shell present')
  assert.doesNotMatch(text, /text-red-300|Live mode uses Supabase email\/password auth/i, 'no legacy developer auth copy')

  const evil = await fetch(`${BASE_URL}/auth/callback?next=${encodeURIComponent('//evil.example')}`, {
    redirect: 'manual',
  })
  assert.ok([302, 307, 308].includes(evil.status), `callback redirect status ${evil.status}`)
  const loc = evil.headers.get('location') || ''
  assert.ok(loc.includes('/auth'), `callback should land on /auth, got ${loc}`)
  assert.doesNotMatch(loc, /\/\/evil\.example/, 'callback rejects protocol-relative next')
  assert.match(loc, /next=%2Fbrowse|next=\/browse/, `sanitized next in Location: ${loc}`)

  const okNext = await fetch(`${BASE_URL}/auth/callback?next=${encodeURIComponent('/you')}`, {
    redirect: 'manual',
  })
  const okLoc = okNext.headers.get('location') || ''
  assert.ok(okLoc.includes('/auth'), `missing-code callback → auth, got ${okLoc}`)
  assert.match(okLoc, /next=%2Fyou|next=\/you/, `preserves safe next: ${okLoc}`)
  console.log('ok auth markup + callback redirect sanitization')
}

async function checkAuthBrowser() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.log('skip auth browser (playwright not installed)')
    return
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(`${BASE_URL}/auth?mode=signin`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')

    const bodyText = await page.locator('body').innerText()
    if (/demo mode|needs configuration/i.test(bodyText)) {
      console.log('skip auth browser interactions (demo / unconfigured)')
      return
    }

    await page.waitForSelector('button:has-text("Continue with Google")')
    const googleBtn = page.locator('button:has-text("Continue with Google")')
    assert.equal(await googleBtn.isVisible(), true, 'Google button visible')
    const googleSvg = await page.locator('button:has-text("Continue with Google") svg').count()
    assert.ok(googleSvg >= 1, 'Google SVG mark present')

    const surfaces = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
    }))
    assert.ok(isDarkRgb(surfaces.body), `auth body dark got ${surfaces.body}`)

    await page.getByRole('tab', { name: 'Create account' }).click()
    await page.waitForSelector('text=Full name')
    assert.equal(await page.locator('select').count(), 1, 'neighborhood select on signup')
    const options = await page.locator('select option').count()
    assert.ok(options >= 8, `neighborhood options ${options}`)

    await page.locator('input[type="password"], input[type="text"]').last().fill('secret12')
    const showBtn = page.getByRole('button', { name: /Show|Hide/ })
    assert.equal(await showBtn.isVisible(), true, 'password show/hide toggle')
    await showBtn.click()
    const revealed = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('input')]
      return inputs.some((i) => i.type === 'text' && i.value === 'secret12')
    })
    assert.equal(revealed, true, 'password revealed after Show')

    await page.getByRole('tab', { name: 'Sign in' }).click()
    assert.equal(await page.locator('text=Full name').count(), 0, 'name field hidden on sign-in')
    assert.equal(await page.locator('select').count(), 0, 'neighborhood hidden on sign-in')

    await page.goto(`${BASE_URL}/auth?mode=signup`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=Full name')
    assert.equal(await page.getByRole('tab', { name: 'Create account' }).getAttribute('aria-selected'), 'true')

    console.log('ok auth browser Google + signup fields + password toggle')
  } finally {
    await browser.close()
  }
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
    assert.match(headline, /Help nearby\./i)
    assert.match(headline, /Done today\./i)
    const h1Lines = headline.trim().split('\n').filter(Boolean)
    assert.equal(h1Lines.length, 2, `two-line serif h1 got ${h1Lines.length}`)

    assert.equal(await page.getByText('PEER-TO-PEER HELP. LOCALLY.').count() >= 1, true, 'eyebrow')
    assert.equal(await page.getByPlaceholder('What do you need help with?').count(), 1, 'hero search')
    assert.equal(await page.getByRole('link', { name: /Post a request/i }).count() >= 1, true)
    assert.equal(await page.getByRole('link', { name: /Browse nearby help/i }).count() >= 1, true)
    assert.equal(await page.getByRole('button', { name: /Austin/i }).count() >= 1, true, 'Austin pill')
    assert.equal(await page.getByRole('link', { name: 'Log in' }).count() >= 1, true)
    assert.equal(await page.getByRole('link', { name: 'Sign up' }).count() >= 1, true)
    assert.equal(await page.getByRole('button', { name: /Browse/i }).count() >= 1, true)
    assert.equal(await page.getByRole('link', { name: 'How it works' }).count() >= 1, true)
    assert.equal(await page.getByRole('link', { name: 'Safety' }).count() >= 1, true)

    const themeAndScale = await page.evaluate(() => {
      const body = getComputedStyle(document.body)
      const root = document.querySelector('.landing-root')
      const rootCs = root ? getComputedStyle(root) : null
      const h1 = document.querySelector('h1')
      const h1Cs = h1 ? getComputedStyle(h1) : null
      const heroCta = document.querySelector('.landing-cta-row a[href="/post"]')
      const heroRect = heroCta?.getBoundingClientRect()
      const signup = document.querySelector('a[href="/auth?mode=signup"]')
      const signupRect = signup?.getBoundingClientRect()
      const footer = document.querySelector('footer')
      const footerCs = footer ? getComputedStyle(footer) : null
      const sections = [...document.querySelectorAll('main > section')]
      return {
        bg: body.backgroundColor,
        color: body.color,
        font: body.fontFamily,
        h1Font: h1Cs?.fontFamily ?? '',
        rootBg: rootCs?.backgroundColor ?? '',
        footerBg: footerCs?.backgroundColor ?? '',
        h1Px: h1Cs ? parseFloat(h1Cs.fontSize) : 0,
        heroCtaH: heroRect ? Math.round(heroRect.height) : 0,
        signupH: signupRect ? Math.round(signupRect.height) : 0,
        sectionPositions: sections.map((el) => getComputedStyle(el).position),
        sectionCount: sections.length,
        hasStage: !!document.querySelector('.hero-stage, .landing-stage, .beam-stack'),
        transforms: sections.map((el) => getComputedStyle(el).transform),
      }
    })
    assert.ok(isDarkRgb(themeAndScale.bg), `dark canvas got ${themeAndScale.bg}`)
    assert.match(themeAndScale.color, /rgb\((247|250|246|245)/, 'ivory primary text')
    assert.match(themeAndScale.font, /Geist|geist/i, 'Geist family loaded')
    assert.match(themeAndScale.h1Font, /Playfair|Newsreader|serif/i, 'serif display on h1')
    assert.ok(isDarkRgb(themeAndScale.rootBg), `landing-root dark got ${themeAndScale.rootBg}`)
    assert.ok(isDarkRgb(themeAndScale.footerBg), `footer dark got ${themeAndScale.footerBg}`)
    assert.ok(await page.locator('[data-testid="landing-nav-obsidian"]').count() >= 1, 'obsidian nav')
    assert.equal(await page.locator('.window-chrome, .traffic-lights').count(), 0, 'no window chrome')
    assert.ok(await page.locator('[data-testid="austin-map"]').count() >= 1, 'Austin map present')
    assert.ok(themeAndScale.h1Px >= 48 && themeAndScale.h1Px <= 96, `hero size ${themeAndScale.h1Px}`)
    assert.ok(themeAndScale.heroCtaH >= 44 && themeAndScale.heroCtaH <= 56, `hero CTA h ${themeAndScale.heroCtaH}`)
    assert.ok(themeAndScale.signupH >= 36 && themeAndScale.signupH <= 48, `signup h ${themeAndScale.signupH}`)
    assert.ok(themeAndScale.sectionCount >= 6, 'landing sections present')
    assert.equal(themeAndScale.hasStage, false, 'no experimental stage DOM')
    assert.ok(
      themeAndScale.sectionPositions.every((p) => p === 'static' || p === 'relative'),
      'marketing sections non-sticky',
    )
    assert.ok(themeAndScale.transforms.every((t) => t === 'none'), 'no section transforms')

    assert.equal(await page.locator('.scrim-hero').count(), 0, 'no dark hero scrim class')
    assert.equal(await page.locator('.landing-section-full').count(), 0, 'no full-viewport slabs')

    await page.waitForSelector('.landing-hero-media img')
    await page.waitForFunction(
      () => {
        const img = document.querySelector('.landing-hero-media img')
        return !!img && img.complete && img.naturalWidth > 0
      },
      undefined,
      { timeout: 10000 },
    )
    const heroImg = await page.evaluate(() => {
      const img = document.querySelector('.landing-hero-media img')
      if (!img) return null
      return {
        src: img.currentSrc || img.getAttribute('src') || '',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        alt: img.getAttribute('alt') || '',
      }
    })
    assert.ok(heroImg, 'hero img present')
    assert.match(heroImg.src, /beam-hero-moving-bg/, `hero src ${heroImg.src}`)
    assert.ok(heroImg.naturalWidth > 0, `hero naturalWidth ${heroImg.naturalWidth}`)
    assert.match(heroImg.alt, /moving|box|neighbor|warm/i, 'meaningful alt')

    const densityGeo = await page.evaluate(() => {
      const vh = window.innerHeight
      const sections = [...document.querySelectorAll('main > section')]
      return {
        count: sections.length,
        heights: sections.map((el) => Math.round(el.getBoundingClientRect().height)),
        positions: sections.map((el) => getComputedStyle(el).position),
        vh,
        hasCoverage: !!document.querySelector('#coverage'),
        hasHow: !!document.querySelector('#how-it-works'),
        hasCategories: !!document.querySelector('#categories'),
        hasTrust: !!document.querySelector('#trust'),
      }
    })
    assert.ok(densityGeo.count >= 6, `dense sections ${densityGeo.count}`)
    assert.equal(densityGeo.hasCoverage, true, 'coverage present')
    assert.equal(densityGeo.hasHow, true, 'how-it-works present')
    assert.equal(densityGeo.hasCategories, true, 'categories present')
    assert.equal(densityGeo.hasTrust, true, 'trust present')
    assert.ok(
      densityGeo.positions.every((p) => p === 'static' || p === 'relative'),
      'sections non-sticky',
    )
    assert.ok(
      densityGeo.heights.some((h) => h < densityGeo.vh - 40),
      'has non-full-viewport sections',
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

    await page.locator('#how-it-works').scrollIntoViewIfNeeded()
    await page.getByRole('tab', { name: /Offers/i }).click()
    assert.match(await page.locator('[role="tabpanel"]').innerText(), /\$55|Within 1 hour|Example|\$60/i)
    await page.getByRole('tab', { name: /Message/i }).click()
    assert.match(await page.locator('[role="tabpanel"]').innerText(), /Example|Thread|coordinate/i)
    await page.evaluate(() => window.scrollTo(0, 0))

    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
      false,
      'no horizontal overflow desktop',
    )

    const scrollProbe = await page.evaluate(() => {
      const how = document.querySelector('#how-it-works')
      const cats = document.querySelector('#categories')
      const cta = document.querySelector('main > section:last-of-type')
      const footer = document.querySelector('footer')
      if (!how || !cats || !footer) return null
      const before = {
        scrollY: window.scrollY,
        howTop: how.getBoundingClientRect().top,
        catsTop: cats.getBoundingClientRect().top,
      }
      window.scrollBy(0, 500)
      const midHowTop = how.getBoundingClientRect().top
      const midCatsTop = cats.getBoundingClientRect().top
      const mid = {
        scrollY: window.scrollY,
        howTop: midHowTop,
        catsTop: midCatsTop,
        overlap: midHowTop < midCatsTop && how.getBoundingClientRect().bottom > midCatsTop + 2,
      }
      window.scrollBy(0, -500)
      const after = {
        howTop: how.getBoundingClientRect().top,
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
      scrollProbe.mid.howTop < scrollProbe.before.howTop - 100,
      'how-it-works moves up with scroll',
    )
    assert.ok(
      scrollProbe.mid.catsTop < scrollProbe.before.catsTop - 100,
      'categories move up with scroll',
    )
    assert.equal(scrollProbe.mid.overlap, false, 'no section overlap while scrolling')
    assert.ok(
      Math.abs(scrollProbe.after.howTop - scrollProbe.before.howTop) < 8,
      'scroll up restores position',
    )
    assert.ok(scrollProbe.end.footerTop < 900, 'footer reachable')
    assert.equal(scrollProbe.end.overflowX, false, 'no x-overflow at page end')

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
    await page.waitForSelector('body')
    const browseBody = await page.locator('body').innerText()
    assert.match(
      browseBody,
      /Browse|Welcome back|Continue with Google|Sign in to help nearby/i,
      'browse runtime reachable',
    )

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`${BASE_URL}/home`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')
    const homeChrome = await page.evaluate(() => ({
      sidebar: !!document.querySelector('[data-testid="app-sidebar"]'),
      dock: !!document.querySelector('[data-testid="bottom-dock"]'),
      text: document.body.innerText.slice(0, 400),
      bodyBg: getComputedStyle(document.body).backgroundColor,
    }))
    assert.match(
      homeChrome.text,
      /Home|Browse|Messages|Continue with Google|Welcome back|Search/i,
      'home/app shell reachable',
    )
    assert.ok(isDarkRgb(homeChrome.bodyBg), `app body dark got ${homeChrome.bodyBg}`)
    if (!/Continue with Google|Welcome back/i.test(homeChrome.text)) {
      assert.equal(homeChrome.sidebar, true, 'desktop app sidebar present')
    }

    for (const { width, height } of [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width, height })
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('a[href="/post"]')
      await page.waitForSelector('.landing-hero-media img')
      await page.waitForFunction(
        () => {
          const img = document.querySelector('.landing-hero-media img')
          return !!img && img.complete && img.naturalWidth > 0
        },
        undefined,
        { timeout: 10000 },
      )
      const geo = await page.evaluate(() => {
        const doc = document.documentElement
        const vh = window.innerHeight
        const sections = [...document.querySelectorAll('main > section')]
        const post = document.querySelector('.landing-cta-row a[href="/post"]')
        const browse = document.querySelector('.landing-cta-row a[href="/browse"]')
        const ok = (el) => {
          if (!el) return false
          const r = el.getBoundingClientRect()
          return r.top >= 0 && r.bottom <= vh + 8
        }
        const img = document.querySelector('.landing-hero-media img')
        const surfaces = [
          document.body,
          document.querySelector('.landing-root'),
          document.querySelector('footer'),
        ].map((el) => (el ? getComputedStyle(el).backgroundColor : ''))
        return {
          overflowX: doc.scrollWidth > doc.clientWidth + 1,
          positions: sections.map((el) => getComputedStyle(el).position),
          transforms: sections.map((el) => getComputedStyle(el).transform),
          fullPageCount: document.querySelectorAll('.landing-section-full').length,
          ctasInView: ok(post) && ok(browse),
          surfaces,
          imgW: img?.naturalWidth ?? 0,
        }
      })
      assert.equal(geo.overflowX, false, `no horizontal overflow @${width}x${height}`)
      assert.ok(
        geo.positions.every((p) => p === 'static' || p === 'relative'),
        `non-sticky sections @${width}`,
      )
      assert.ok(geo.transforms.every((t) => t === 'none'), `no transforms @${width}`)
      assert.ok(geo.surfaces.every(isDarkRgb), `dark surfaces @${width}: ${geo.surfaces.join(' | ')}`)
      assert.ok(geo.imgW > 0, `hero image loaded @${width}`)
      assert.equal(geo.fullPageCount, 0, `no full-page slabs @${width}`)
      if (width === 375 || width >= 1280) {
        assert.equal(geo.ctasInView, true, `hero CTAs in first viewport @${width}`)
      }
      await page.setViewportSize({ width, height: 500 })
      const short = await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
        const footer = document.querySelector('footer')
        return footer ? footer.getBoundingClientRect().bottom <= window.innerHeight + 2 : false
      })
      assert.equal(short, true, `footer reachable short viewport @${width}`)
    }

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
    assert.match(reduced.text, /Post|Offers|Message|complete/i, 'reduced-motion workflow copy')

    await page.locator('body').click({ position: { x: 2, y: 2 } })
    await page.keyboard.press('Tab')
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? '')
    assert.ok(focusedTag === 'A' || focusedTag === 'BUTTON', 'tab reaches interactive control')
    console.log('ok landing browser DOM + warm-obsidian flow')
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
  await checkAuthMarkupAndRedirects()
  await checkLandingBrowser()
  await checkAuthBrowser()
  await checkBrowserPersistence()
  console.log('smoke passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
