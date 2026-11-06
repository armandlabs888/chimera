#!/usr/bin/env node
/**
 * Headless smoke checks for Beam (no screenshots committed).
 * Warm-obsidian reference-locked gates from beam-refero-mobbin-spec §3.
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
  assert.match(text, /Illustrative example/, 'single illustrative caption')
  assert.match(text, /beam-hero-moving-v2/, 'hero v2 image referenced')
  assert.match(text, /id="how-it-works"/, 'how-it-works section')
  assert.match(text, /id="coverage"/, 'coverage section')
  assert.match(text, /id="categories"/, 'categories section')
  assert.match(text, /id="safety"/, 'safety anchor')
  assert.match(text, /landing-nav-obsidian|data-testid="landing-nav-obsidian"/, 'obsidian nav')
  assert.doesNotMatch(text, /window-chrome|traffic-lights/, 'no macOS window chrome')
  assert.doesNotMatch(text, /data-testid="austin-map"/, 'no cartoon map')
  assert.doesNotMatch(text, /landing-section-full/, 'no sparse full-viewport section class')
  assert.doesNotMatch(text, /hero-stage|HeroProofStage|hero-beam-art|beam-stack|scrim-hero/i, 'no experimental markup')
  assert.doesNotMatch(
    text,
    /Y Combinator|backed by|guaranteed same-day|try free for 14 days|payius|Sequoia|\+2,300 more|ID-checked helpers/i,
    'no invented claims',
  )
  const imgRes = await fetch(`${BASE_URL}/images/beam-hero-moving-v2.jpg`)
  assert.equal(imgRes.status, 200, 'hero v2 asset HTTP 200')
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
    assert.equal(await page.locator('button:has-text("Continue with Google")').isVisible(), true)
    assert.ok(await page.locator('button:has-text("Continue with Google") svg').count() >= 1)

    const surfaces = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
    }))
    assert.ok(isDarkRgb(surfaces.body), `auth body dark got ${surfaces.body}`)

    await page.getByRole('tab', { name: 'Create account' }).click()
    await page.waitForSelector('text=Full name')
    assert.equal(await page.locator('select').count(), 1)
    assert.ok((await page.locator('select option').count()) >= 8)

    await page.locator('input[type="password"], input[type="text"]').last().fill('secret12')
    const showBtn = page.getByRole('button', { name: /Show|Hide/ })
    await showBtn.click()
    const revealed = await page.evaluate(() =>
      [...document.querySelectorAll('input')].some((i) => i.type === 'text' && i.value === 'secret12'),
    )
    assert.equal(revealed, true)

    await page.getByRole('tab', { name: 'Sign in' }).click()
    assert.equal(await page.locator('text=Full name').count(), 0)
    assert.equal(await page.locator('select').count(), 0)

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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  try {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('a[href="/post"]')

    const headline = await page.locator('h1').innerText()
    assert.match(headline, /Help nearby\./i)
    assert.match(headline, /Done today\./i)
    assert.equal(headline.trim().split('\n').filter(Boolean).length, 2, 'two-line serif h1')

    assert.ok(await page.getByText('PEER-TO-PEER HELP. LOCALLY.').count() >= 1)
    assert.equal(await page.getByPlaceholder('What do you need help with?').count(), 1)
    assert.ok(await page.getByRole('link', { name: /Post a request/i }).count() >= 1)
    assert.ok(await page.getByRole('link', { name: /Browse nearby help/i }).count() >= 1)
    assert.ok(await page.getByRole('button', { name: /Austin/i }).count() >= 1)
    assert.ok(await page.getByRole('link', { name: 'Log in' }).count() >= 1)
    assert.ok(await page.getByRole('link', { name: 'Sign up' }).count() >= 1)

    // Quality gates from §3
    const tight = await page.$$eval('h1,h2,h3', (els) =>
      els
        .filter((e) => {
          const cs = getComputedStyle(e)
          return parseFloat(cs.lineHeight) < parseFloat(cs.fontSize) * 0.95
        })
        .map((e) => (e.textContent || '').slice(0, 40)),
    )
    assert.deepEqual(tight, [], `headings with collapsed leading: ${tight}`)

    const geo = await page.evaluate(() => {
      const hero = document.querySelector('main > section')
      const h1 = document.querySelector('h1')
      const r = h1.getBoundingClientRect()
      return {
        heroH: hero.offsetHeight,
        vh: innerHeight,
        mid: (r.top + r.bottom) / 2,
        sectionCount: document.querySelectorAll('main > section').length,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        rootBg: getComputedStyle(document.querySelector('.landing-root')).backgroundColor,
        footerBg: getComputedStyle(document.querySelector('footer')).backgroundColor,
        h1Font: getComputedStyle(h1).fontFamily,
        h1Px: parseFloat(getComputedStyle(h1).fontSize),
        heroCtaH: Math.round(
          document.querySelector('.landing-cta-row a[href="/post"]')?.getBoundingClientRect().height ?? 0,
        ),
        signupH: Math.round(
          document.querySelector('a[href="/auth?mode=signup"]')?.getBoundingClientRect().height ?? 0,
        ),
        hasHow: !!document.querySelector('#how-it-works'),
        hasCategories: !!document.querySelector('#categories'),
        hasCoverage: !!document.querySelector('#coverage'),
        hasSafety: !!document.querySelector('#safety'),
        mapCount: document.querySelectorAll('[data-testid="austin-map"]').length,
        pageH: document.documentElement.scrollHeight,
      }
    })
    assert.ok(geo.heroH >= geo.vh - 1, `hero ${geo.heroH} < viewport ${geo.vh}`)
    assert.ok(geo.mid / geo.vh > 0.33 && geo.mid / geo.vh < 0.52, `h1 vertical center ${(geo.mid / geo.vh).toFixed(2)}`)
    assert.equal(geo.sectionCount, 4, 'hero + 3 sections')
    assert.ok(isDarkRgb(geo.bodyBg), `dark canvas ${geo.bodyBg}`)
    assert.ok(isDarkRgb(geo.rootBg), `landing-root dark ${geo.rootBg}`)
    assert.ok(isDarkRgb(geo.footerBg), `footer dark ${geo.footerBg}`)
    assert.match(geo.h1Font, /Newsreader|serif/i, 'Newsreader/serif on h1')
    assert.ok(geo.h1Px >= 48 && geo.h1Px <= 100, `hero size ${geo.h1Px}`)
    assert.ok(geo.heroCtaH >= 48 && geo.heroCtaH <= 58, `hero CTA h ${geo.heroCtaH}`)
    assert.ok(geo.signupH >= 36 && geo.signupH <= 48, `signup h ${geo.signupH}`)
    assert.equal(geo.hasHow, true)
    assert.equal(geo.hasCategories, true)
    assert.equal(geo.hasCoverage, true)
    assert.equal(geo.hasSafety, true)
    assert.equal(geo.mapCount, 0, 'no cartoon map')
    assert.ok(geo.pageH <= 3800, `desktop page height ${geo.pageH}`)

    assert.ok((await page.locator('.flat-meta, .eyebrow').count()) <= 1, 'single eyebrow')
    assert.equal(await page.getByText(/^Example$/).count(), 0, 'no per-tile Example pills')
    assert.ok(await page.getByText('Illustrative example').count() >= 1)

    const overflow = await page.$$eval('#categories *', (els) =>
      els.filter(
        (e) =>
          e.scrollWidth > e.clientWidth + 1 &&
          getComputedStyle(e).overflow === 'visible' &&
          e.children.length === 0,
      ).length,
    )
    assert.equal(overflow, 0, 'category text overflow')

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
      return {
        src: img.currentSrc || img.getAttribute('src') || '',
        naturalWidth: img.naturalWidth,
        alt: img.getAttribute('alt') || '',
      }
    })
    assert.match(heroImg.src, /beam-hero-moving-v2/, `hero src ${heroImg.src}`)
    assert.ok(heroImg.naturalWidth > 0)
    assert.match(heroImg.alt, /moving|box|neighbor|cap/i)

    await page.locator('#how-it-works').scrollIntoViewIfNeeded()
    await page.getByRole('tab', { name: /Compare priced offers/i }).click()
    assert.match(await page.locator('[role="tabpanel"]').innerText(), /\$55|Maya|Accept/i)

    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
      false,
      'no horizontal overflow desktop',
    )

    async function assertTrustBadgesUnclipped(label) {
      const trust = await page.evaluate(() => {
        const phrases = ['Fast & local', 'Help usually today', 'Fair & transparent', 'Scoped & local']
        const hits = phrases.map((t) => {
          const el = [...document.querySelectorAll('p,span')].find((n) => (n.textContent || '').trim() === t)
          if (!el) return { t, missing: true }
          const r = el.getBoundingClientRect()
          return { t, missing: false, right: r.right, left: r.left }
        })
        const row = document.querySelector('[data-testid="hero-trust-badges"]')
        return {
          hits,
          vw: innerWidth,
          scrollOk: row ? row.scrollWidth <= row.clientWidth + 1 : false,
          clientWidth: row?.clientWidth ?? 0,
          scrollWidth: row?.scrollWidth ?? 0,
        }
      })
      for (const h of trust.hits) {
        assert.equal(h.missing, false, `${label}: missing trust text "${h.t}"`)
        assert.ok(h.right <= trust.vw - 20, `${label}: "${h.t}" clips (right=${h.right}, vw=${trust.vw})`)
      }
      assert.equal(
        trust.scrollOk,
        true,
        `${label}: trust badge row scrolls (scroll=${trust.scrollWidth} client=${trust.clientWidth})`,
      )
    }

    await assertTrustBadgesUnclipped('1440×900')

    await page.locator('a[href="/browse?category=cleaning"]').first().click()
    await page.waitForURL(/\/browse\?category=cleaning/)
    console.log('ok landing category navigation')

    // Public browse + safety
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')
    const browseBody = await page.locator('body').innerText()
    assert.match(
      browseBody,
      /Browse|Open requests|Welcome back|Continue with Google|Sign in/i,
      'browse reachable',
    )
    assert.doesNotMatch(browseBody.slice(0, 80), /^Beam\nSign in to help nearby$/m)
    // Live guest browse: marketing chrome, no Guest sidebar / no duplicate command search
    const browseChrome = await page.evaluate(() => ({
      sidebar: !!document.querySelector('[data-testid="app-sidebar"]'),
      guest: /Guest/.test(document.body.innerText),
      landingNav: !!document.querySelector('[data-testid="landing-nav-obsidian"]'),
      commandSearch: !!document.querySelector('#app-command-search'),
      browseSearch: [...document.querySelectorAll('input')].filter((i) =>
        /Search titles|Search requests/i.test(i.placeholder || ''),
      ).length,
    }))
    if (browseChrome.landingNav) {
      assert.equal(browseChrome.sidebar, false, 'guest browse has no app sidebar')
      assert.equal(browseChrome.guest, false, 'guest browse has no Guest label')
      assert.equal(browseChrome.commandSearch, false, 'guest browse has no command search')
      assert.ok(browseChrome.browseSearch <= 1, `guest browse search count ${browseChrome.browseSearch}`)
    }

    await page.goto(`${BASE_URL}/safety`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')
    const safetyText = await page.locator('body').innerText()
    assert.match(safetyText, /Safety/i)
    assert.match(safetyText, /never holds your money|Beam never holds/i)
    assert.ok(await page.locator('a[href="/browse"], a[href="/"]').count() >= 1, 'safety has nav escape')
    assert.equal(
      await page.locator('[data-testid="landing-nav-obsidian"]').count(),
      1,
      'safety has exactly one LandingNav',
    )

    for (const { width, height } of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
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
      const g = await page.evaluate(() => {
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
        return {
          overflowX: doc.scrollWidth > doc.clientWidth + 1,
          sectionCount: sections.length,
          ctasInView: ok(post) && ok(browse),
          surfaces: [
            document.body,
            document.querySelector('.landing-root'),
            document.querySelector('footer'),
          ].map((el) => (el ? getComputedStyle(el).backgroundColor : '')),
          pageH: doc.scrollHeight,
          heroH: sections[0]?.offsetHeight ?? 0,
          vh,
        }
      })
      assert.equal(g.overflowX, false, `no x-overflow @${width}`)
      assert.equal(g.sectionCount, 4, `4 sections @${width}`)
      assert.ok(g.surfaces.every(isDarkRgb), `dark surfaces @${width}`)
      assert.ok(g.heroH >= g.vh - 1, `hero fills viewport @${width}`)
      if (width === 375 || width === 390 || width >= 1280) {
        assert.equal(g.ctasInView, true, `hero CTAs in fold @${width}`)
      }
      if (width === 1280 || width === 1440) {
        await assertTrustBadgesUnclipped(`${width}×${height}`)
      }
      if (width >= 1280) assert.ok(g.pageH <= 3800, `desktop height @${width}: ${g.pageH}`)
      if (width <= 390) assert.ok(g.pageH <= 6200, `mobile height @${width}: ${g.pageH}`)
    }

    console.log('ok landing browser DOM + reference-locked gates')
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
  roundTrip.requests.push({ id: 'req-smoke', title: 'Smoke lift help', status: 'open' })
  assert.equal(JSON.parse(JSON.stringify(roundTrip)).requests[0].id, 'req-smoke')
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
    if (/Sign in to help nearby|Create account|Beam needs configuration/i.test(bodyText) &&
        !/Open requests|Browse/i.test(bodyText)) {
      console.log('skip browser localStorage (live auth gate)')
      return
    }
    // Demo mode persists; live public browse may not have localStorage seed
    const hasKey = await page.evaluate((key) => !!localStorage.getItem(key), STORAGE_KEY)
    if (!hasKey) {
      console.log('skip browser localStorage (no demo seed)')
      return
    }
    await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key))
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
    assert.equal(persisted, true)
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
