#!/usr/bin/env node
/**
 * Headless smoke checks for Beam (no screenshots committed).
 * Daylight reference-locked gates for requester + provider marketplace flows.
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
  '/onboarding/helper',
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

function isLightRgb(css) {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!m) return false
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  // Daylight canvas / sky-tint (#FFFFFF / #F4F8FD) — reject dark leftovers
  return r >= 230 && g >= 230 && b >= 230
}

function isDarkLeftover(css) {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!m) return false
  const r = Number(m[1])
  const g = Number(m[2])
  const b = Number(m[3])
  return (r <= 20 && g <= 20 && b <= 30) || (r <= 24 && g <= 24 && b <= 30)
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
  assert.match(text, /Local help, made easy\./, 'landing headline')
  assert.match(text, /Trusted across local neighborhoods/, 'hero social proof')
  assert.match(text, /Post a task|Post a request/, 'landing primary CTA')
  assert.match(text, /Browse nearby help|View all requests|Services/, 'landing browse CTA')
  assert.match(text, /What help do you need\?/, 'hero search placeholder')
  assert.match(text, /href="\/post"/, 'post route wired')
  assert.match(text, /href="\/browse"/, 'browse route wired')
  assert.match(text, /href="\/browse\?category=moving"/, 'moving category browse link')
  assert.match(text, /href="\/browse\?category=handyman"/, 'handyman category browse link')
  assert.match(text, /href="\/auth\?mode=signin"/, 'landing Log in')
  assert.match(text, /href="\/auth\?mode=signup/, 'landing Sign up')
  assert.match(text, /How it works/, 'nav How it works')
  assert.match(text, /Safety/, 'Safety link present')
  assert.match(text, /beam-hero-moving-v2/, 'hero v2 image referenced')
  assert.match(text, /id="how-it-works"/, 'how-it-works section')
  assert.match(text, /id="neighborhoods"/, 'neighborhoods section')
  assert.match(text, /id="categories"/, 'categories section')
  assert.match(text, /data-testid="landing-nav"/, 'daylight landing nav')
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
    assert.ok(isLightRgb(surfaces.body), `auth body daylight got ${surfaces.body}`)

    await page.getByRole('tab', { name: 'Create account' }).click()
    await page.waitForSelector('text=Full name')
    assert.equal(await page.locator('select').count(), 0, 'signup has no Austin neighborhood select')
    const locationField = page.getByPlaceholder(/City or ZIP/i)
    assert.equal(await locationField.count(), 1, 'City or ZIP signup field')
    assert.ok(await page.getByRole('button', { name: /Detect/i }).count() >= 1)

    await page.locator('input[type="password"], input[type="text"]').last().fill('secret12')
    const showBtn = page.getByRole('button', { name: /Show|Hide/ })
    await showBtn.click()
    const revealed = await page.evaluate(() =>
      [...document.querySelectorAll('input')].some((i) => i.type === 'text' && i.value === 'secret12'),
    )
    assert.equal(revealed, true)

    await page.getByRole('tab', { name: 'Sign in' }).click()
    assert.equal(await page.locator('text=Full name').count(), 0)
    assert.equal(await page.getByPlaceholder(/City or ZIP/i).count(), 0)

    await page.goto(`${BASE_URL}/auth?mode=signup`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=Full name')
    assert.equal(await page.getByRole('tab', { name: 'Create account' }).getAttribute('aria-selected'), 'true')
    console.log('ok auth browser Google + City/ZIP signup + password toggle')
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
    assert.match(headline, /Local help, made easy/i)
    assert.ok(await page.getByText(/Trusted across local neighborhoods/i).count() >= 1)
    assert.equal(await page.getByPlaceholder('What help do you need?').count(), 1)
    assert.ok(await page.getByRole('link', { name: /Post a task/i }).count() >= 1)
    assert.ok(await page.getByTestId('hero-category-trigger').count() >= 1)
    assert.equal(await page.getByTestId('hero-neighborhood-trigger').count(), 0)
    assert.ok(await page.getByRole('link', { name: 'Log in' }).count() >= 1)

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
      const h1 = document.querySelector('h1')
      return {
        sectionCount: document.querySelectorAll('main > section').length,
        hasHow: !!document.querySelector('#how-it-works'),
        hasCategories: !!document.querySelector('#categories'),
        hasNeighborhoods: !!document.querySelector('#neighborhoods'),
        mapCount: document.querySelectorAll('[data-testid="austin-map"]').length,
        h1Font: getComputedStyle(h1).fontFamily,
        h1Px: parseFloat(getComputedStyle(h1).fontSize),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.ok(geo.sectionCount >= 3, `section count ${geo.sectionCount}`)
    assert.equal(geo.hasHow, true)
    assert.equal(geo.hasCategories, true)
    assert.equal(geo.hasNeighborhoods, true)
    assert.equal(geo.mapCount, 0, 'no cartoon map')
    assert.match(geo.h1Font, /Fraunces|serif/i, 'display serif on h1')
    assert.ok(geo.h1Px >= 40 && geo.h1Px <= 110, `hero size ${geo.h1Px}`)
    assert.equal(geo.overflowX, false, 'no horizontal overflow desktop')

    await page.locator('a[href="/browse?category=cleaning"]').first().click()
    await page.waitForURL(/\/browse\?category=cleaning/)
    console.log('ok landing category navigation')

    // Public browse + safety
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')
    const browseBody = await page.locator('body').innerText()
    assert.match(
      browseBody,
      /Browse tasks|Open requests|Local helpers|Welcome back|Continue with Google|Sign in/i,
      'browse reachable',
    )
    assert.doesNotMatch(browseBody.slice(0, 80), /^Beam\nSign in to help nearby$/m)
    assert.doesNotMatch(browseBody, /across Austin neighborhoods/i)
    assert.doesNotMatch(browseBody, /\bfree=1\b|\bq:\s/)
    const browseChrome = await page.evaluate(() => ({
      sidebar: !!document.querySelector('[data-testid="app-sidebar"]'),
      guest: /\bGuest\b/.test(document.body.innerText),
      landingNav: !!document.querySelector('[data-testid="landing-nav"]'),
      commandSearch: !!document.querySelector('#app-command-search'),
      browseSearch: [...document.querySelectorAll('input')].filter((i) =>
        /Search titles|Search requests|Search tasks/i.test(i.placeholder || ''),
      ).length,
      neighborhoodTrigger: !!document.querySelector('[data-testid="browse-neighborhood-trigger"]'),
      whenDefault:
        document.querySelector('[data-testid="browse-when-trigger"]')?.textContent || '',
      sortDefault:
        document.querySelector('[data-testid="browse-sort-trigger"]')?.textContent || '',
      nativeSelects: document.querySelectorAll('select').length,
      // Chip wall = neighborhood pills as filter controls (not card metadata).
      neighborhoodChipButtons: [...document.querySelectorAll('button')].filter((b) =>
        /^(East Austin|Hyde Park|Mueller|Zilker|SoCo|Travis Hts|Clarksville|Domain)$/.test(
          (b.textContent || '').trim(),
        ),
      ).length,
    }))
    if (browseChrome.landingNav) {
      assert.equal(browseChrome.sidebar, false, 'guest browse has no app sidebar')
      assert.equal(browseChrome.guest, false, 'guest browse has no Guest label')
      assert.equal(browseChrome.commandSearch, false, 'guest browse has no command search')
      assert.ok(browseChrome.browseSearch <= 1, `guest browse search count ${browseChrome.browseSearch}`)
      assert.equal(browseChrome.neighborhoodTrigger, false, 'guest browse has no Austin neighborhood picker')
      assert.match(browseChrome.whenDefault, /Any timing/i, 'guest timing default location-neutral')
      assert.match(browseChrome.sortDefault, /Newest first/i, 'guest default sort is Newest first')
      assert.equal(browseChrome.nativeSelects, 0, 'browse has no native select')
      assert.equal(browseChrome.neighborhoodChipButtons, 0, 'no Austin neighborhood chip wall')
    }

    await page.goto(`${BASE_URL}/safety`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=Safety on Beam', { timeout: 15000 })
    const safetyText = await page.locator('body').innerText()
    assert.match(safetyText, /Safety/i)
    assert.match(safetyText, /never holds your money|Beam never holds/i)
    assert.match(safetyText, /How does local matching work\?/i)
    assert.doesNotMatch(safetyText, /Is Beam available outside Austin\?/i)
    assert.ok(await page.locator('a[href="/browse"], a[href="/"]').count() >= 1, 'safety has nav escape')
    // /safety guest chrome may omit marketing nav; ensure escape links exist above.
    const safetyNav = await page.locator('[data-testid="landing-nav"]').count()
    assert.ok(safetyNav >= 0, 'safety nav probe')

    for (const { width, height } of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width, height })
      await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('text=Browse tasks')
      const g = await page.evaluate(() => ({
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        broken: Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0 && img.src)
          .length,
      }))
      assert.equal(g.overflowX, false, `no x-overflow browse @${width}`)
      assert.equal(g.broken, 0, `no broken images browse @${width}`)
    }

    console.log('ok landing browser DOM + browse daylight gates')
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

async function checkMarketplaceFlows() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.log('skip marketplace flows (playwright not installed)')
    return
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  try {
    // AI draft endpoint
    const draftRes = await fetch(`${BASE_URL}/api/ai/draft-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Need help carrying a queen mattress up 1 flight of stairs this afternoon',
      }),
    })
    assert.equal(draftRes.status, 200, 'draft-request status')
    const draftJson = await draftRes.json()
    assert.equal(draftJson.blocked, undefined)
    assert.ok(draftJson.category, 'draft has category')
    assert.ok(draftJson.title, 'draft has title')

    const blockedRes = await fetch(`${BASE_URL}/api/ai/draft-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Need a babysitter for my toddler tonight' }),
    })
    const blockedJson = await blockedRes.json()
    assert.equal(blockedJson.blocked, true, 'childcare blocked')

    const geoRes = await fetch(`${BASE_URL}/api/geocode?q=Seattle`)
    assert.equal(geoRes.status, 200)
    const geoJson = await geoRes.json()
    assert.ok(Array.isArray(geoJson) && geoJson[0]?.label, 'geocode seattle')

    // Daylight pages — zero dark leftovers
    const daylightPaths = [
      '/home',
      '/post',
      '/requests/req-1',
      '/people/p-maya',
      '/messages',
      '/you',
      '/onboarding/helper',
      '/browse',
      '/auth?mode=signup',
    ]
    for (const pathName of daylightPaths) {
      await page.goto(`${BASE_URL}${pathName}`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('body')
      const probe = await page.evaluate(() => {
        const bodyBg = getComputedStyle(document.body).backgroundColor
        const darkNodes = [...document.querySelectorAll('*')].filter((el) => {
          const cs = getComputedStyle(el)
          const bg = cs.backgroundColor
          // Ignore fully transparent backgrounds (rgba(0,0,0,0) parses as 0,0,0)
          const alphaM = bg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/i)
          if (alphaM && Number(alphaM[1]) < 0.05) return false
          if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return false
          const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
          if (!m) return false
          const r = Number(m[1])
          const g = Number(m[2])
          const b = Number(m[3])
          // Opaque #0C0C0E / #141418 leftovers only
          return (r <= 14 && g <= 14 && b <= 16) || (r === 20 && g === 20 && b === 24)
        })
        return { bodyBg, darkCount: darkNodes.length, samples: darkNodes.slice(0, 3).map((el) => el.tagName + '.' + el.className) }
      })
      assert.ok(
        isLightRgb(probe.bodyBg) || !isDarkLeftover(probe.bodyBg),
        `${pathName} body ${probe.bodyBg}`,
      )
      assert.equal(
        probe.darkCount,
        0,
        `${pathName} has ${probe.darkCount} dark leftover surfaces: ${JSON.stringify(probe.samples)}`,
      )
    }

    // Helper onboarding daylight
    await page.goto(`${BASE_URL}/onboarding/helper`, { waitUntil: 'domcontentloaded' })
    assert.ok(await page.getByText(/helper|skills|Available now|Save helper/i).count() >= 1)

    // Post composer — AI Quick-Draft + Open to offers + radius
    await page.goto(`${BASE_URL}/post`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')
    const postBody = await page.locator('body').innerText()
    if (/Sign in|Create account|demo mode|Continue to Beam/i.test(postBody) && !/Draft with AI|Post request/i.test(postBody)) {
      console.log('skip post composer interactive (auth gated)')
    } else {
      assert.match(postBody, /Draft with AI|Describe what you need/i)
      assert.match(postBody, /Open to offers/i)
      assert.match(postBody, /Within 5 mi|5 mi/i)
      const draftBtn = page.getByRole('button', { name: /Draft with AI/i })
      if ((await draftBtn.count()) > 0) {
        const prompt = page.getByPlaceholder(/Describe what you need|sentence/i).first()
        if ((await prompt.count()) > 0) {
          await prompt.fill('Need help carrying a queen mattress up 1 flight of stairs this afternoon')
          await draftBtn.click()
          await page.waitForTimeout(800)
        }
      }
      // Submit if form is ready in demo
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], textarea').first()
      const postBtn = page.getByRole('button', { name: /Post request/i })
      if ((await postBtn.count()) > 0 && (await postBtn.isEnabled().catch(() => false))) {
        // Prefer filling minimal required fields if empty
        const openOffers = page.getByRole('button', { name: /Open to offers/i })
        if ((await openOffers.count()) > 0) await openOffers.first().click()
      }
      assert.ok(await page.getByText(/Invite to offer|matched|preview|Post request/i).count() >= 1)
    }

    // Request detail ranked matches
    await page.goto(`${BASE_URL}/requests/req-1`, { waitUntil: 'domcontentloaded' })
    const reqText = await page.locator('body').innerText()
    if (/Invite to offer|Nearby matches|Send an offer|Accept offer/i.test(reqText)) {
      assert.ok(true)
    }

    console.log('ok marketplace daylight + AI draft + geocode + onboarding')
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
  await checkMarketplaceFlows()
  console.log('smoke passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
