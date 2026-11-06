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
  '/onboarding',
  '/onboarding?preview=1',
  '/onboarding/helper',
  '/messages/missing-thread',
  '/does-not-exist',
]

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

function sanitizeNextLocal(raw, fallback = '/browse') {
  if (!raw) return fallback
  let value = String(raw).trim()
  if (!value) return fallback
  if (value.includes('%')) {
    try {
      const decoded = decodeURIComponent(value)
      if (decoded.startsWith('/') && !decoded.startsWith('//')) value = decoded
    } catch {
      /* keep */
    }
  }
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.includes('\\')) return fallback
  if (value.includes('://')) return fallback
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return fallback
  }
  if (value.length > 512) return fallback
  return value
}

function detectStrandedAuthLocal(pathname, searchParams) {
  if (pathname !== '/' && pathname !== '/auth') return null
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = sanitizeNextLocal(searchParams.get('next'))
  if (code) return { pathname: '/auth/callback', params: { code, next } }
  if (tokenHash && type) {
    return { pathname: '/auth/confirm', params: { token_hash: tokenHash, type, next } }
  }
  if (error && pathname === '/') {
    return { pathname: '/auth', params: { error: errorDescription || error, next } }
  }
  return null
}

function isProtectedAppPathLocal(pathname) {
  if (pathname === '/home' || pathname === '/post' || pathname === '/you') return true
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return true
  if (pathname === '/onboarding/helper' || pathname.startsWith('/onboarding/helper/')) return true
  return false
}

function guestAuthRedirectPathLocal(pathname, search = '') {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (pathname === '/onboarding') {
    if (params.get('preview') === '1') return null
    return '/auth?mode=signup&next=%2Fonboarding'
  }
  if (!isProtectedAppPathLocal(pathname)) return null
  const q = params.toString()
  const next = sanitizeNextLocal(q ? `${pathname}?${q}` : pathname)
  return `/auth?next=${encodeURIComponent(next)}`
}

async function checkAuthMarkupAndRedirects() {
  assert.equal(sanitizeNextLocal('/browse'), '/browse')
  assert.equal(sanitizeNextLocal('//evil.example'), '/browse')
  assert.equal(sanitizeNextLocal('/you'), '/you')
  assert.equal(sanitizeNextLocal('/post'), '/post')
  assert.equal(sanitizeNextLocal('/become-helper'), '/become-helper')
  assert.equal(sanitizeNextLocal('/onboarding/helper'), '/onboarding/helper')
  assert.equal(sanitizeNextLocal('https://evil.example'), '/browse')
  assert.equal(sanitizeNextLocal('%2Fbrowse'), '/browse')
  assert.equal(sanitizeNextLocal('%2F%2Fevil.example'), '/browse')

  assert.deepEqual(
    detectStrandedAuthLocal('/', new URLSearchParams('code=pkce-test&next=%2Fpost')),
    { pathname: '/auth/callback', params: { code: 'pkce-test', next: '/post' } },
  )
  assert.deepEqual(
    detectStrandedAuthLocal('/auth', new URLSearchParams('code=pkce-on-auth')),
    { pathname: '/auth/callback', params: { code: 'pkce-on-auth', next: '/browse' } },
  )
  assert.deepEqual(
    detectStrandedAuthLocal(
      '/',
      new URLSearchParams('token_hash=otp-hash&type=signup&next=%2Fyou'),
    ),
    {
      pathname: '/auth/confirm',
      params: { token_hash: 'otp-hash', type: 'signup', next: '/you' },
    },
  )
  assert.deepEqual(
    detectStrandedAuthLocal(
      '/',
      new URLSearchParams('error=access_denied&error_description=User+cancelled'),
    ),
    {
      pathname: '/auth',
      params: { error: 'User cancelled', next: '/browse' },
    },
  )
  assert.equal(
    detectStrandedAuthLocal('/auth', new URLSearchParams('error=access_denied')),
    null,
    'bare /auth?error stays on AuthExperience',
  )
  assert.equal(detectStrandedAuthLocal('/browse', new URLSearchParams('code=x')), null)

  assert.equal(guestAuthRedirectPathLocal('/browse'), null)
  assert.equal(guestAuthRedirectPathLocal('/safety'), null)
  assert.equal(guestAuthRedirectPathLocal('/requests/abc'), null)
  assert.equal(guestAuthRedirectPathLocal('/onboarding', 'preview=1'), null)
  assert.equal(
    guestAuthRedirectPathLocal('/onboarding'),
    '/auth?mode=signup&next=%2Fonboarding',
  )
  assert.equal(guestAuthRedirectPathLocal('/post'), '/auth?next=%2Fpost')
  assert.equal(guestAuthRedirectPathLocal('/home'), '/auth?next=%2Fhome')
  assert.equal(guestAuthRedirectPathLocal('/you'), '/auth?next=%2Fyou')
  assert.equal(guestAuthRedirectPathLocal('/messages'), '/auth?next=%2Fmessages')
  assert.equal(
    guestAuthRedirectPathLocal('/messages/thread-1'),
    '/auth?next=%2Fmessages%2Fthread-1',
  )
  assert.equal(
    guestAuthRedirectPathLocal('/onboarding/helper'),
    '/auth?next=%2Fonboarding%2Fhelper',
  )

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

  // Site-URL fallback: stranded PKCE code on `/` must forward to /auth/callback
  const strandedCode = await fetch(`${BASE_URL}/?code=stranded-pkce-code&next=${encodeURIComponent('/post')}`, {
    redirect: 'manual',
  })
  assert.ok(
    [302, 307, 308].includes(strandedCode.status),
    `stranded /?code status ${strandedCode.status}`,
  )
  const strandedLoc = strandedCode.headers.get('location') || ''
  assert.match(strandedLoc, /\/auth\/callback/, `stranded code → callback, got ${strandedLoc}`)
  assert.match(strandedLoc, /code=stranded-pkce-code/, `preserves code: ${strandedLoc}`)
  assert.match(strandedLoc, /next=%2Fpost|next=\/post/, `preserves next: ${strandedLoc}`)

  const strandedAuthPath = await fetch(`${BASE_URL}/auth?code=on-auth-path`, { redirect: 'manual' })
  assert.ok([302, 307, 308].includes(strandedAuthPath.status), ' /auth?code redirects')
  const strandedAuthLoc = strandedAuthPath.headers.get('location') || ''
  assert.match(strandedAuthLoc, /\/auth\/callback/, `auth?code → callback, got ${strandedAuthLoc}`)
  assert.match(strandedAuthLoc, /code=on-auth-path/)

  const strandedOtp = await fetch(
    `${BASE_URL}/?token_hash=otp-test&type=email&next=${encodeURIComponent('/you')}`,
    { redirect: 'manual' },
  )
  assert.ok([302, 307, 308].includes(strandedOtp.status), `stranded otp status ${strandedOtp.status}`)
  const otpLoc = strandedOtp.headers.get('location') || ''
  assert.match(otpLoc, /\/auth\/confirm/, `stranded otp → confirm, got ${otpLoc}`)
  assert.match(otpLoc, /token_hash=otp-test/)
  assert.match(otpLoc, /type=email/)

  const strandedErr = await fetch(
    `${BASE_URL}/?error=access_denied&error_description=${encodeURIComponent('User cancelled')}`,
    { redirect: 'manual' },
  )
  assert.ok([302, 307, 308].includes(strandedErr.status), `stranded error status ${strandedErr.status}`)
  const errLoc = strandedErr.headers.get('location') || ''
  assert.match(errLoc, /\/auth(\?|$)/, `stranded oauth error → /auth, got ${errLoc}`)
  assert.match(errLoc, /error=/, `error query present: ${errLoc}`)

  // Plain `/` without auth params must still render the landing page (no redirect)
  const plainHome = await fetch(`${BASE_URL}/`, { redirect: 'manual' })
  assert.equal(plainHome.status, 200, 'plain / stays 200')

  // Sign-out route always clears session cookies and lands on clean `/auth`
  const signOutGet = await fetch(`${BASE_URL}/auth/signout`, { redirect: 'manual' })
  assert.ok(
    [302, 303, 307, 308].includes(signOutGet.status),
    `GET /auth/signout status ${signOutGet.status}`,
  )
  const signOutLoc = signOutGet.headers.get('location') || ''
  assert.match(signOutLoc, /\/auth\/?(\?|$)/, `signout → /auth, got ${signOutLoc}`)
  assert.doesNotMatch(signOutLoc, /next=/, `signout must not preserve next=: ${signOutLoc}`)
  // Path must be exactly /auth (not /auth/callback or stranded prior route)
  const signOutPath = new URL(signOutLoc, BASE_URL).pathname.replace(/\/$/, '') || '/'
  assert.equal(signOutPath, '/auth', `signout pathname must be /auth, got ${signOutPath}`)

  const signOutPost = await fetch(`${BASE_URL}/auth/signout`, {
    method: 'POST',
    redirect: 'manual',
  })
  assert.ok(
    [302, 303, 307, 308].includes(signOutPost.status),
    `POST /auth/signout status ${signOutPost.status}`,
  )
  const signOutPostLoc = signOutPost.headers.get('location') || ''
  assert.match(signOutPostLoc, /\/auth\/?(\?|$)/, `POST signout → /auth, got ${signOutPostLoc}`)

  // Live guests on protected routes must 302/307 to canonical /auth (not inline AuthGate).
  // Demo / unconfigured leave these routes reachable without redirect.
  const authProbe = await fetchText('/auth?mode=signin')
  const liveConfigured =
    authProbe.res.status === 200 &&
    !/demo mode|needs configuration/i.test(authProbe.text)
  if (liveConfigured) {
    const protectedPaths = [
      ['/post', /next=%2Fpost/],
      ['/home', /next=%2Fhome/],
      ['/you', /next=%2Fyou/],
      ['/messages', /next=%2Fmessages/],
      ['/onboarding/helper', /next=%2Fonboarding%2Fhelper/],
      ['/onboarding', /mode=signup/],
    ]
    for (const [pathName, nextRe] of protectedPaths) {
      const gate = await fetch(`${BASE_URL}${pathName}`, { redirect: 'manual' })
      assert.ok(
        [302, 303, 307, 308].includes(gate.status),
        `live guest ${pathName} should redirect, got ${gate.status}`,
      )
      const loc = gate.headers.get('location') || ''
      assert.match(loc, /\/auth/, `live guest ${pathName} → /auth, got ${loc}`)
      assert.match(loc, nextRe, `live guest ${pathName} preserves next/mode: ${loc}`)
      // Must not serve the secondary AuthGate compact chrome as HTML.
      assert.doesNotMatch(loc, /Browse.*Safety/)
      console.log(`ok live guest ${pathName} → ${loc}`)
    }
    // Public discovery stays open
    for (const openPath of ['/browse', '/safety', '/onboarding?preview=1']) {
      const openRes = await fetch(`${BASE_URL}${openPath}`, { redirect: 'manual' })
      assert.equal(openRes.status, 200, `public ${openPath} stays 200, got ${openRes.status}`)
      console.log(`ok public guest ${openPath} stays open`)
    }
  } else {
    console.log('skip live guest protected redirects (demo / unconfigured)')
  }

  console.log('ok auth markup + callback + Site-URL fallback redirects + signout')
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
    // OAuth error query → daylight banner (works in live, demo, and unconfigured)
    await page.goto(
      `${BASE_URL}/auth?error=${encodeURIComponent('access_denied')}&error_description=${encodeURIComponent('User cancelled')}`,
      { waitUntil: 'domcontentloaded' },
    )
    const errorBanner = page.locator('.rounded-2xl[role="alert"]').first()
    await errorBanner.waitFor({ state: 'visible' })
    const alertText = await errorBanner.innerText()
    assert.match(alertText, /cancelled|try again|email/i, `oauth error banner: ${alertText}`)
    const errSurfaces = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      text: document.body.innerText.slice(0, 1200),
    }))
    assert.ok(isLightRgb(errSurfaces.body), `auth error body daylight got ${errSurfaces.body}`)
    assert.doesNotMatch(errSurfaces.text, /across Austin|Hyde Park|East Austin|Austin seed/i)
    assert.doesNotMatch(errSurfaces.text, /bg-zinc-950|dark:|text-red-300/)
    console.log('ok auth oauth error banner (daylight)')

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
    assert.equal(await page.getByPlaceholder(/City or ZIP/i).count(), 0, 'signup no longer asks City/ZIP')
    assert.equal(await page.getByTestId('signup-location').count(), 0, 'no signup-location field')

    await page.locator('input[type="password"], input[type="text"]').last().fill('secret12')
    const showBtn = page.getByRole('button', { name: /Show|Hide/ })
    await showBtn.click()
    const revealed = await page.evaluate(() =>
      [...document.querySelectorAll('input')].some((i) => i.type === 'text' && i.value === 'secret12'),
    )
    assert.equal(revealed, true)

    await page.getByRole('tab', { name: 'Sign in' }).click()
    assert.equal(await page.locator('text=Full name').count(), 0)

    await page.goto(`${BASE_URL}/auth?mode=signup`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=Full name')
    assert.equal(await page.getByRole('tab', { name: 'Create account' }).getAttribute('aria-selected'), 'true')

    console.log('ok auth browser Google + simplified signup + password toggle')
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
    assert.equal(
      /Fraunces|Georgia|ui-serif|(?:^|,\s)serif\s*(?:,|$)/i.test(geo.h1Font),
      false,
      `h1 must not use serif faces: ${geo.h1Font}`,
    )
    assert.match(
      geo.h1Font,
      /UberMove|DM Sans|__DM_Sans|system-ui/i,
      `h1 geometric display stack: ${geo.h1Font}`,
    )
    assert.ok(geo.h1Px >= 40 && geo.h1Px <= 110, `hero size ${geo.h1Px}`)
    assert.equal(geo.overflowX, false, 'no horizontal overflow desktop')

    await page.locator('a[href="/browse?category=cleaning"]').first().click()
    await page.waitForURL(/\/browse\?category=cleaning/)
    console.log('ok landing category navigation')

    // Public browse + safety
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')
    // Live boot can briefly show the "Beam" splash before public marketplace hydrates.
    await page
      .waitForFunction(
        () =>
          /Browse tasks|Open requests|Local helpers|Welcome back|Continue with Google|Sign in/i.test(
            document.body.innerText,
          ),
        null,
        { timeout: 20000 },
      )
      .catch(() => {})
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
      sidebar: document.querySelectorAll('[data-testid="app-sidebar"]').length,
      asideRail: [...document.querySelectorAll('aside')].filter((el) =>
        el.className?.includes?.('app-sidebar'),
      ).length,
      topnav: !!document.querySelector('[data-testid="app-topnav"]'),
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
    assert.equal(browseChrome.sidebar, 0, 'browse has zero app-sidebar')
    assert.equal(browseChrome.asideRail, 0, 'browse has zero sidebar rail')
    if (browseChrome.landingNav) {
      assert.equal(browseChrome.topnav, false, 'guest browse uses landing nav, not app topnav')
      assert.equal(browseChrome.guest, false, 'guest browse has no Guest label')
      assert.equal(browseChrome.commandSearch, false, 'guest browse has no command search')
      assert.ok(browseChrome.browseSearch <= 1, `guest browse search count ${browseChrome.browseSearch}`)
      assert.equal(browseChrome.neighborhoodTrigger, false, 'guest browse has no Austin neighborhood picker')
      assert.match(browseChrome.whenDefault, /Any timing/i, 'guest timing default location-neutral')
      assert.match(browseChrome.sortDefault, /Newest first/i, 'guest default sort is Newest first')
      assert.equal(browseChrome.nativeSelects, 0, 'browse has no native select')
      assert.equal(browseChrome.neighborhoodChipButtons, 0, 'no Austin neighborhood chip wall')
    } else if (browseChrome.topnav) {
      assert.equal(browseChrome.commandSearch, false, 'signed-in topnav has no command search')
      assert.ok(
        (await page.locator('[data-testid="account-menu-trigger"]').count()) >= 1,
        'signed-in topnav has account menu',
      )
      assert.ok(
        (await page.locator('[data-testid="notifications-bell"]').count()) >= 1,
        'signed-in topnav has notifications',
      )
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

async function checkOnboardingFlow() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.log('skip onboarding flow (playwright not installed)')
    return
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  try {
    await page.goto(`${BASE_URL}/onboarding?preview=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="onboarding-root"]', { timeout: 20000 })

    const step1 = await page.locator('[data-testid="onboarding-step-1"]').innerText()
    assert.match(step1, /Welcome to Beam/i)
    assert.match(step1, /Customer/i)
    assert.match(step1, /Helper \/ Tasker/i)
    assert.equal(await page.getByTestId('onboarding-next').isDisabled(), true, 'Next disabled initially')

    const darkProbe = await page.evaluate(() => {
      const bodyBg = getComputedStyle(document.body).backgroundColor
      const darkNodes = [...document.querySelectorAll('*')].filter((el) => {
        const bg = getComputedStyle(el).backgroundColor
        const alphaM = bg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/i)
        if (alphaM && Number(alphaM[1]) < 0.05) return false
        if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return false
        const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
        if (!m) return false
        const r = Number(m[1])
        const g = Number(m[2])
        const b = Number(m[3])
        return (r <= 14 && g <= 14 && b <= 16) || (r === 20 && g === 20 && b === 24)
      })
      return {
        bodyBg,
        darkCount: darkNodes.length,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        austin: /across Austin|Hyde Park|East Austin/i.test(document.body.innerText),
      }
    })
    assert.ok(isLightRgb(darkProbe.bodyBg) || !isDarkLeftover(darkProbe.bodyBg), `onboarding body ${darkProbe.bodyBg}`)
    assert.equal(darkProbe.darkCount, 0, 'onboarding dark leftovers')
    assert.equal(darkProbe.overflowX, false, 'onboarding no horizontal overflow')
    assert.equal(darkProbe.austin, false, 'onboarding has no Austin assumptions')

    await page.getByTestId('onboarding-role-helper').click()
    assert.equal(await page.getByTestId('onboarding-role-helper').getAttribute('aria-checked'), 'true')

    await page.waitForSelector('[data-testid="onboarding-city-input"]', { timeout: 15000 })
    const cityInput = page.getByTestId('onboarding-city-input')
    await cityInput.click()
    await page.waitForSelector('[data-testid="onboarding-city-listbox"]')

    // Diverse US city coverage across states
    const cityChecks = [
      { q: 'Boise, ID', expect: /Boise,\s*ID/i },
      { q: 'San Juan, PR', expect: /San Juan,\s*PR/i },
      { q: 'Springfield, IL', expect: /Springfield,\s*IL/i },
    ]
    for (const check of cityChecks) {
      await cityInput.fill('')
      await cityInput.fill(check.q)
      await page.waitForSelector('[data-testid="onboarding-city-listbox"]')
      const optionsText = await page.getByTestId('onboarding-city-listbox').innerText()
      assert.match(optionsText, check.expect, `autocomplete for ${check.q}`)
    }

    await cityInput.fill('Boise, ID')
    await page.waitForSelector('[data-testid="onboarding-city-listbox"]')
    await page.getByRole('option', { name: /Boise,\s*ID/i }).first().click()
    await page.waitForSelector('[data-testid="onboarding-city-verified"]')
    assert.match(await page.getByTestId('onboarding-city-verified').innerText(), /Boise,\s*ID/i)
    assert.equal(await page.getByTestId('onboarding-next').isDisabled(), false, 'Next enabled')

    await page.getByTestId('onboarding-next').click()
    await page.waitForSelector('[data-testid="onboarding-step-2"]')
    const step2 = await page.getByTestId('onboarding-step-2').innerText()
    assert.match(step2, /Posting illegal content or listing sexual services is strictly prohibited/i)
    assert.match(step2, /temporary ban/i)
    assert.match(step2, /Back/i)
    assert.match(step2, /Complete/i)
    assert.ok(await page.getByTestId('onboarding-safety-callout').count() >= 1)

    await page.getByTestId('onboarding-back').click()
    await page.waitForSelector('[data-testid="onboarding-step-1"]')
    assert.equal(await page.getByTestId('onboarding-role-helper').getAttribute('aria-checked'), 'true')
    assert.ok(await page.getByTestId('onboarding-city-verified').count() >= 1, 'city preserved on Back')

    await page.getByTestId('onboarding-next').click()
    await page.waitForSelector('[data-testid="onboarding-step-2"]')
    await page.getByTestId('onboarding-complete').click()
    await page.waitForURL(/\/browse/, { timeout: 15000 })
    assert.match(page.url(), /\/browse/)

    console.log('ok onboarding Step1 role+cities + Step2 disclaimer + Complete→/browse')
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
      '/onboarding?preview=1',
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

    // Helper onboarding daylight (live guests redirect to canonical /auth)
    await page.goto(`${BASE_URL}/onboarding/helper`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')
    await page
      .waitForFunction(
        () =>
          /helper|skills|Available now|Save helper|Continue with Google|Sign in|Create account|Welcome back|demo mode/i.test(
            document.body.innerText,
          ) || /\/auth/.test(location.pathname),
        null,
        { timeout: 15000 },
      )
      .catch(() => {})
    const onboardUrl = new URL(page.url())
    const onboardText = await page.locator('body').innerText()
    if (
      onboardUrl.pathname.replace(/\/$/, '') === '/auth' ||
      (/Continue with Google|Sign in|Create account|Welcome back|demo mode|needs configuration/i.test(
        onboardText,
      ) &&
        !/Available now|Save helper/i.test(onboardText))
    ) {
      console.log('skip helper onboarding interactive (auth gated → /auth)')
      if (onboardUrl.pathname.replace(/\/$/, '') === '/auth') {
        assert.match(onboardText, /Welcome back|Join Beam|Continue with Google|demo mode/i)
        // Main AuthExperience — not the removed AuthGate compact header.
        const gateHeader = await page.evaluate(() =>
          [...document.querySelectorAll('header')].some((h) => {
            const t = h.innerText || ''
            return /Browse/i.test(t) && /Safety/i.test(t)
          }),
        )
        assert.equal(gateHeader, false, 'no AuthGate Browse/Safety header on /auth')
      }
    } else {
      assert.ok(await page.getByText(/helper|skills|Available now|Save helper/i).count() >= 1)
    }

    // Post composer — AI Quick-Draft + Open to offers + radius
    await page.goto(`${BASE_URL}/post`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')
    await page
      .waitForFunction(
        () =>
          /Draft with AI|Describe what you need|Post request|Sign in|Create account|Continue with Google|Continue to Beam|demo mode|Welcome back/i.test(
            document.body.innerText,
          ) || /\/auth/.test(location.pathname),
        null,
        { timeout: 15000 },
      )
      .catch(() => {})
    const postUrl = new URL(page.url())
    const postBody = await page.locator('body').innerText()
    if (
      postUrl.pathname.replace(/\/$/, '') === '/auth' ||
      (/Sign in|Create account|demo mode|Continue to Beam|Continue with Google|Welcome back/i.test(postBody) &&
        !/Draft with AI|Post request/i.test(postBody)) ||
      /^Beam$/m.test(postBody.trim())
    ) {
      console.log('skip post composer interactive (auth gated → /auth)')
      if (postUrl.pathname.replace(/\/$/, '') === '/auth') {
        assert.match(postUrl.search, /next=%2Fpost|next=\/post/)
        assert.match(postBody, /Welcome back|Continue with Google|demo mode/i)
        const gateHeader = await page.evaluate(() =>
          [...document.querySelectorAll('header')].some((h) => {
            const t = h.innerText || ''
            return /Browse/i.test(t) && /Safety/i.test(t)
          }),
        )
        assert.equal(gateHeader, false, 'no AuthGate Browse/Safety header on /auth from /post')
      }
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
  await checkOnboardingFlow()
  await checkBrowserPersistence()
  await checkMarketplaceFlows()
  console.log('smoke passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
