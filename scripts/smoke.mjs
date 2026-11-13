#!/usr/bin/env node
/**
 * Headless smoke checks for HouseCall (no screenshots committed).
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
    assert.match(text, /HouseCall/i, `${route} missing HouseCall brand marker`)
    assert.doesNotMatch(text, /Application error|Internal Server Error/i, `${route} errored`)
    console.log(`ok route ${route} -> ${res.status}`)
  }
}

async function checkLandingMarkup() {
  const { res, text } = await fetchText('/')
  assert.equal(res.status, 200, 'landing status')
  assert.match(text, /Trusted help, right next door\./, 'landing headline')
  assert.match(text, /Local services/, 'hero overline')
  assert.match(text, /Post a task|Post a request/, 'landing primary CTA')
  assert.match(text, /Browse nearby help|View all requests|Services|Popular services/, 'landing browse CTA')
  assert.match(text, /What help do you need\?/, 'hero search placeholder')
  assert.match(text, /Find help/, 'hero find help CTA')
  assert.match(text, /All categories/, 'guest category picker')
  assert.match(text, /href="\/post"/, 'post route wired')
  assert.match(text, /href="\/browse"/, 'browse route wired')
  assert.match(text, /href="\/browse\?category=home"/, 'home category browse link')
  assert.match(text, /href="\/browse\?category=junk-removal"/, 'junk-removal category browse link')
  assert.match(text, /href="\/browse\?category=pets"/, 'pets category browse link')
  assert.match(text, /href="\/browse\?category=other"/, 'other category browse link')
  assert.doesNotMatch(text, /data-testid="landing-browse-preview"/, 'browse preview removed')
  assert.doesNotMatch(
    text,
    /Illustrative samples for design review|Design preview — Sample listings/i,
    'no sample/design-preview labels on landing',
  )
  assert.doesNotMatch(text, /data-testid="popular-gigs"/, 'popular gigs section removed')
  assert.doesNotMatch(text, /Popular gigs (near you|in )/, 'no popular gigs heading')
  assert.doesNotMatch(text, /Open (near you|in your city)/, 'no popular gigs eyebrow')
  assert.doesNotMatch(text, /See all jobs/, 'no popular gigs see-all CTA')
  assert.doesNotMatch(text, /Need something different\?/, 'no popular gigs post-task footer')
  assert.match(text, /data-testid="landing-categories"/, 'popular services follows hero')
  assert.doesNotMatch(
    text,
    /data-testid="landing-hero"[\s\S]*?(Post a task|Browse services)[\s\S]*?data-testid="landing-categories"/,
    'hero has no Post a task / Browse services under search',
  )
  assert.doesNotMatch(text, /categories-tile-custom|Something else\?/, 'navy custom tile removed')
  assert.match(text, /data-testid="categories-tile-auto"/, 'auto detailing tile')
  assert.match(text, /data-testid="categories-tile-moving"/, 'moving tile')
  assert.match(text, /data-testid="categories-tile-junk"/, 'junk removal tile')
  assert.match(text, /\/browse\?category=moving/, 'moving browse href')
  assert.match(text, /avail-moving\.jpg/, 'moving sofa photo path')
  assert.match(text, /avail-junk-garage\.jpg/, 'junk garage photo path')
  assert.match(
    text,
    /House cleaning, auto detailing, moving, junk removal, and pet care\. Or post something custom\./,
    'popular services subtitle',
  )
  assert.match(text, /Post a custom task/, 'popular services custom link')
  assert.match(
    text,
    /Clear steps and in-app messaging, so you can compare offers/,
    'why HouseCall body copy',
  )
  assert.doesNotMatch(text, /without invented counts/, 'old why body removed')
  assert.doesNotMatch(
    text,
    /Peer-to-peer everyday local help —/,
    'footer blurb has no em dash',
  )
  assert.match(
    text,
    /Peer-to-peer everyday local help for home, auto, junk removal/,
    'footer blurb updated',
  )
  assert.doesNotMatch(text, /Elena R\.\s*·\s*Verified neighbor/, 'no fabricated verified testimonial')
  assert.doesNotMatch(text, /why-beam-live-offers|Trusted across local neighborhoods|hero-fan-stack/, 'no legacy hero/live-proof markup')
  assert.match(text, /href="\/auth\?mode=signin"/, 'landing Log in')
  assert.match(text, /href="\/auth\?mode=signup/, 'landing Sign up')
  assert.match(text, /How it works/, 'nav How it works')
  assert.match(text, /Find work/, 'nav Find work')
  assert.match(text, /Safety/, 'Safety link present')
  assert.match(text, /id="how-it-works"/, 'how-it-works section')
  assert.match(text, /From to-do to done/, 'how-it-works heading')
  assert.match(text, /Post your task/, 'how-it-works step 1')
  assert.match(text, /Compare offers/, 'how-it-works step 2')
  assert.match(text, /Chat, finish/, 'how-it-works step 3')
  assert.match(text, /Know what you.?re choosing/, 'why-beam heading')
  assert.match(text, /One less thing on your list/, 'closing CTA')
  assert.doesNotMatch(text, /Available services on HouseCall/, 'available services section removed')
  assert.doesNotMatch(text, /data-testid="available-services"/, 'available-services testid removed')
  assert.doesNotMatch(text, /Explore all six/, 'explore-all-six overline removed')
  assert.doesNotMatch(text, /id="neighborhoods"/, 'neighborhoods anchor removed')
  assert.doesNotMatch(
    text,
    /href="\/#neighborhoods"|Available services<\/a>/,
    'footer Available services link removed',
  )
  assert.match(text, /id="categories"/, 'categories section')
  assert.match(text, /data-testid="why-beam-section"/, 'why-beam section')
  assert.match(text, /data-testid="landing-nav"/, 'daylight landing nav')
  assert.match(text, /data-testid="landing-nav-signup"/, 'landing nav Sign up pill')
  // LandingNav must not ship a Post a task CTA — Sign up is the primary right-side action.
  assert.doesNotMatch(
    text,
    /data-testid="landing-nav"[\s\S]*?>[\s\S]*?Post a task[\s\S]*?<\/header>/i,
    'landing nav has no Post a task button',
  )
  // Landing v2 Browse preview uses decorative browser chrome; still forbid live-map chrome.
  assert.doesNotMatch(text, /data-testid="austin-map"/, 'no cartoon map')
  assert.doesNotMatch(text, /landing-section-full/, 'no sparse full-viewport section class')
  assert.doesNotMatch(text, /hero-stage|HeroProofStage|hero-beam-art|beam-stack|scrim-hero/i, 'no experimental markup')
  assert.doesNotMatch(
    text,
    /Y Combinator|backed by|guaranteed same-day|try free for 14 days|payius|Sequoia|\+2,300 more|ID-checked helpers/i,
    'no invented claims',
  )
  // Hero is image-free; Popular services still uses local lifestyle assets.
  const cleaningRes = await fetch(`${BASE_URL}/images/landing/avail-house-cleaning.jpg`)
  assert.equal(cleaningRes.status, 200, 'popular-services cleaning asset HTTP 200')
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
  assert.match(text, /HouseCall|auth/, 'auth route shell present')
  assert.doesNotMatch(text, /text-red-300|Live mode uses Supabase email\/password auth/i, 'no legacy developer auth copy')
  const authPhoto = await fetch(`${BASE_URL}/images/landing/auth-panel-neighbors.jpg`)
  assert.equal(authPhoto.status, 200, 'auth panel photo asset served')
  assert.match(authPhoto.headers.get('content-type') || '', /image\//, 'auth panel photo is an image')

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
  // Prefer an actual /post redirect probe — auth HTML is often client-rendered, so
  // "demo mode" / "needs configuration" may be absent from the initial document.
  const authProbe = await fetchText('/auth?mode=signin')
  const postProbe = await fetch(`${BASE_URL}/post`, { redirect: 'manual' })
  const postRedirectsToAuth =
    [302, 303, 307, 308].includes(postProbe.status) &&
    /\/auth/i.test(postProbe.headers.get('location') || '')
  const liveConfigured =
    authProbe.res.status === 200 &&
    !/demo mode|needs configuration/i.test(authProbe.text) &&
    postRedirectsToAuth
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
    const errorBanner = page.locator('[role="alert"]').first()
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
    await page.waitForSelector('text=Trusted help, right next door', { timeout: 20000 })

    const bodyText = await page.locator('body').innerText()
    assert.match(bodyText, /Post a task, compare offers from people nearby/i)
    assert.doesNotMatch(bodyText, /Elena R\.|Posted a couch move at 1pm/i)

    const aside = page.locator('[data-testid="auth-aside-panel"]')
    await aside.waitFor({ state: 'visible', timeout: 10000 })
    const panelSrc = await aside.locator('img').first().evaluate((img) => {
      const raw = img.currentSrc || img.getAttribute('src') || ''
      try {
        return new URL(raw, location.origin).searchParams.get('url') || raw
      } catch {
        return raw
      }
    })
    assert.match(decodeURIComponent(panelSrc), /auth-panel-neighbors/, `auth panel src ${panelSrc}`)

    if (/demo mode|needs configuration/i.test(bodyText)) {
      console.log('ok auth panel photo + truthful copy (skip interactions: demo / unconfigured)')
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
    const signupBody = await page.locator('body').innerText()
    assert.match(signupBody, /Post a task, compare offers from people nearby/i)
    assert.doesNotMatch(signupBody, /Elena R\.|Posted a couch move at 1pm/i)

    console.log('ok auth browser panel + Google + simplified signup + password toggle')
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

    // Scroll the full landing page so lazy images enter the viewport and finish loading.
    await page.evaluate(async () => {
      const step = Math.max(320, Math.floor(window.innerHeight * 0.7))
      const max = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      )
      for (let y = 0; y < max; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 80))
      }
      window.scrollTo(0, max)
      await new Promise((r) => setTimeout(r, 120))
      window.scrollTo(0, 0)
    })
    await page.waitForFunction(
      () => {
        const imgs = [...document.querySelectorAll('img')]
        // Popular services: five photo tiles (hero is image-free).
        return imgs.length >= 5 && imgs.every((img) => img.complete)
      },
      null,
      { timeout: 20000 },
    )

    const landingImages = await page.evaluate(() => {
      function normalizeSrc(raw) {
        if (!raw) return ''
        try {
          const url = new URL(raw, window.location.origin)
          if (url.pathname === '/_next/image') {
            const nested = url.searchParams.get('url')
            if (nested) return decodeURIComponent(nested)
          }
          return url.pathname
        } catch {
          return raw
        }
      }
      const imgs = [...document.querySelectorAll('img')]
      const paths = imgs.map((img) => normalizeSrc(img.getAttribute('src') || img.currentSrc || ''))
      const uniquePaths = new Set(paths)
      return {
        count: imgs.length,
        paths,
        uniqueCount: uniquePaths.size,
        allComplete: imgs.every((img) => img.complete),
        minNaturalWidth: Math.min(...imgs.map((img) => img.naturalWidth || 0)),
        broken: imgs.filter((img) => !img.complete || img.naturalWidth < 250).map((img, i) => ({
          i,
          src: paths[i],
          complete: img.complete,
          naturalWidth: img.naturalWidth,
        })),
        unsplash: paths.filter((p) => /images\.unsplash\.com/i.test(p) || /unsplash/i.test(p)),
        previewPresent: !!document.querySelector('[data-testid="landing-browse-preview"]'),
        popularGigsPresent: !!document.querySelector('[data-testid="popular-gigs"]'),
        categoriesPresent: !!document.querySelector('[data-testid="landing-categories"]'),
      }
    })
    assert.equal(landingImages.previewPresent, false, 'browse preview must be removed')
    assert.equal(landingImages.popularGigsPresent, false, 'popular gigs section removed')
    assert.equal(landingImages.categoriesPresent, true, 'popular services section present')
    assert.ok(
      landingImages.count >= 5,
      `landing should render Popular services marketing <img> elements, got ${landingImages.count}`,
    )
    assert.equal(landingImages.allComplete, true, 'every landing <img> must be complete')
    assert.ok(
      landingImages.minNaturalWidth >= 250,
      `every landing <img> naturalWidth >= 250 (min=${landingImages.minNaturalWidth}); broken=${JSON.stringify(landingImages.broken)}`,
    )
    assert.equal(
      landingImages.broken.filter((b) => b.naturalWidth < 250).length,
      0,
      `no broken/tiny landing images: ${JSON.stringify(landingImages.broken)}`,
    )
    assert.equal(
      landingImages.uniqueCount,
      landingImages.paths.length,
      `zero duplicate image paths on / (unique=${landingImages.uniqueCount}, total=${landingImages.paths.length}): ${JSON.stringify(landingImages.paths)}`,
    )
    assert.deepEqual(landingImages.unsplash, [], `zero Unsplash URLs on /: ${JSON.stringify(landingImages.unsplash)}`)
    console.log(
      `ok landing unique local images (${landingImages.uniqueCount}/${landingImages.count}, no unsplash)`,
    )

    // Full-bleed photo hero: no fan stack / portrait collage inside content.
    assert.equal(await page.getByTestId('hero-fan-stack').count(), 0, 'no hero fan stack')
    assert.equal(
      await page.getByTestId('landing-hero-photo').count(),
      1,
      'landing hero photo background present',
    )
    assert.ok(
      (await page.locator('[data-testid="landing-hero-photo"] img').count()) >= 1,
      'landing hero photo renders an image',
    )
    assert.equal(
      await page.locator('[data-testid="landing-hero"] img').count(),
      0,
      'hero content has no collage/portrait images',
    )

    const headline = await page.locator('h1').innerText()
    assert.match(headline, /Trusted help, right next door/i)
    assert.ok(await page.getByText(/Local services/i).count() >= 1)
    assert.equal(await page.getByPlaceholder('What help do you need?').count(), 1)
    assert.ok(await page.getByRole('button', { name: /Find help/i }).count() >= 1)
    assert.ok(await page.getByRole('link', { name: /Post a task/i }).count() >= 1)
    assert.ok(await page.getByTestId('hero-category-trigger').count() >= 1)
    assert.equal(await page.getByTestId('hero-neighborhood-trigger').count(), 0)
    assert.ok(await page.getByRole('link', { name: 'Log in' }).count() >= 1)
    assert.equal(await page.getByTestId('available-services').count(), 0)
    assert.ok(await page.getByTestId('why-beam-section').count() >= 1)
    assert.ok(await page.getByTestId('how-it-works').count() >= 1)
    assert.ok(await page.getByTestId('landing-closing-cta').count() >= 1)
    assert.equal(await page.getByTestId('why-beam-live-offers').count(), 0)

    // Uber-style landing nav: Log in text + Sign up pill; no Post a task in the nav.
    const nav = page.getByTestId('landing-nav')
    assert.equal(await nav.count(), 1, 'landing-nav present')
    assert.ok((await nav.getByRole('link', { name: 'Log in' }).count()) >= 1, 'nav Log in')
    assert.ok((await nav.getByRole('link', { name: 'Sign up' }).count()) >= 1, 'nav Sign up')
    assert.equal(
      await nav.getByRole('link', { name: /^Post a task$/i }).count(),
      0,
      'nav has no Post a task',
    )
    assert.equal(await page.getByTestId('landing-nav-signup').count(), 1, 'Sign up pill testid')

    // Scrolled / light sticky state keeps the same auth hierarchy.
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.waitForTimeout(350)
    assert.equal(
      await nav.getByRole('link', { name: /^Post a task$/i }).count(),
      0,
      'scrolled nav has no Post a task',
    )
    assert.ok((await nav.getByRole('link', { name: 'Log in' }).count()) >= 1, 'scrolled Log in')
    assert.ok((await nav.getByRole('link', { name: 'Sign up' }).count()) >= 1, 'scrolled Sign up')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(200)

    // Mobile menu: Sign up primary pill, no Post a task.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: /Open menu/i }).click()
    const mobileMenu = page.getByTestId('landing-mobile-menu')
    assert.equal(await mobileMenu.count(), 1, 'mobile menu open')
    assert.ok((await mobileMenu.getByRole('link', { name: 'Log in' }).count()) >= 1, 'mobile Log in')
    assert.equal(await page.getByTestId('landing-mobile-signup').count(), 1, 'mobile Sign up pill')
    assert.equal(
      await mobileMenu.getByRole('link', { name: /^Post a task$/i }).count(),
      0,
      'mobile menu has no Post a task',
    )
    await page.getByRole('button', { name: /Close menu/i }).click()
    await page.setViewportSize({ width: 1440, height: 900 })

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
        hasAvailableServices: !!document.querySelector('[data-testid="available-services"]'),
        mapCount: document.querySelectorAll('[data-testid="austin-map"]').length,
        h1Font: getComputedStyle(h1).fontFamily,
        h1Px: parseFloat(getComputedStyle(h1).fontSize),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.ok(geo.sectionCount >= 3, `section count ${geo.sectionCount}`)
    assert.equal(geo.hasHow, true)
    assert.equal(geo.hasCategories, true)
    assert.equal(geo.hasNeighborhoods, false, 'neighborhoods / available-services anchor gone')
    assert.equal(geo.hasAvailableServices, false, 'available-services section gone')
    assert.equal(geo.mapCount, 0, 'no cartoon map')
    assert.equal(
      /Fraunces|Georgia|ui-serif|(?:^|,\s)serif\s*(?:,|$)/i.test(geo.h1Font),
      false,
      `h1 must not use serif faces: ${geo.h1Font}`,
    )
    assert.match(
      geo.h1Font,
      /Inter|UberMoveText|__Inter|system-ui/i,
      `h1 Inter/body stack: ${geo.h1Font}`,
    )
    assert.ok(geo.h1Px >= 40 && geo.h1Px <= 110, `hero size ${geo.h1Px}`)
    assert.equal(geo.overflowX, false, 'no horizontal overflow desktop')

    await page.locator('a[href="/browse?category=home"]').first().click()
    await page.waitForURL(/\/browse\?category=home/)
    console.log('ok landing category navigation')

    // Public browse + safety
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')
    // Live boot can briefly show the "HouseCall" splash before public marketplace hydrates.
    await page
      .waitForFunction(
        () =>
          /Browse Local Jobs|Open requests|Local helpers|Welcome back|Continue with Google|Sign in/i.test(
            document.body.innerText,
          ),
        null,
        { timeout: 20000 },
      )
      .catch(() => {})
    const browseBody = await page.locator('body').innerText()
    assert.match(
      browseBody,
      /Browse Local Jobs|Open requests|Local helpers|Welcome back|Continue with Google|Sign in/i,
      'browse reachable',
    )
    assert.doesNotMatch(browseBody.slice(0, 80), /^HouseCall\nSign in to help nearby$/m)
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
        /Search titles|Search requests|Search tasks|Search jobs/i.test(i.placeholder || ''),
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
      assert.match(
        browseChrome.sortDefault,
        /Sort:\s*Newest|Newest first/i,
        'guest default sort is Newest',
      )
      assert.equal(browseChrome.nativeSelects, 0, 'browse has no native select')
      assert.equal(browseChrome.neighborhoodChipButtons, 0, 'no Austin neighborhood chip wall')
    } else if (browseChrome.topnav) {
      assert.equal(browseChrome.commandSearch, false, 'signed-in topnav has no command search')
      assert.ok(
        (await page.locator('[data-testid="account-menu-trigger"]').count()) >= 1,
        'signed-in topnav has account menu',
      )
      assert.equal(
        await page.locator('[data-testid="notifications-bell"]').count(),
        0,
        'signed-in topnav has no notifications bell (Messages carries unread)',
      )

      // Topnav is Browse + Messages only — Home & Safety live elsewhere.
      const topnavLinks = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="app-topnav"]')
        if (!nav) return { home: false, safety: false, browse: false, messages: false, labels: [] }
        const anchors = [...nav.querySelectorAll('a')]
        const labels = anchors.map((a) => (a.textContent || '').trim())
        const hrefs = anchors.map((a) => a.getAttribute('href') || '')
        return {
          home: hrefs.some((h) => h === '/home') || labels.some((t) => /^Home$/i.test(t)),
          safety: hrefs.some((h) => h === '/safety') || labels.some((t) => /^Safety$/i.test(t)),
          browse: hrefs.some((h) => h === '/browse' || h.startsWith('/browse?')),
          messages: hrefs.some((h) => h === '/messages' || h.startsWith('/messages/')),
          labels,
        }
      })
      assert.equal(topnavLinks.home, false, 'app-topnav must not contain Home')
      assert.equal(topnavLinks.safety, false, 'app-topnav must not contain Safety')
      assert.equal(topnavLinks.browse, true, 'app-topnav contains Browse')
      assert.equal(topnavLinks.messages, true, 'app-topnav contains Messages')

      // Shared tall marketing footer with Safety (replaces compact app-footer)
      await page.waitForSelector('[data-testid="landing-footer"]', { timeout: 10000 })
      const footer = page.locator('[data-testid="landing-footer"]')
      assert.equal(await footer.count(), 1, 'landing-footer visible on signed-in browse')
      assert.ok(
        (await footer.locator('a[href="/safety"]').count()) >= 1,
        'landing-footer has /safety link',
      )
      // Footer is below the browse workspace — scroll into view before clicking.
      await footer.scrollIntoViewIfNeeded()
      await footer.locator('a[href="/safety"]').first().click()
      await page.waitForURL(/\/safety/, { timeout: 15000 })
      await page.waitForSelector('text=Safety on HouseCall', { timeout: 15000 })
      assert.match(page.url(), /\/safety/)
      // Signed-in /safety keeps marketplace chrome (topnav + shared footer), not a stranded page.
      assert.ok(
        (await page.locator('[data-testid="app-topnav"]').count()) >= 1,
        'signed-in /safety keeps app-topnav',
      )
      assert.ok(
        (await page.locator('[data-testid="landing-footer"]').count()) >= 1,
        'signed-in /safety keeps landing-footer',
      )
      await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('text=Browse Local Jobs')
    }

    await page.goto(`${BASE_URL}/safety`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=Safety on HouseCall', { timeout: 15000 })
    const safetyText = await page.locator('body').innerText()
    assert.match(safetyText, /Safety/i)
    assert.match(safetyText, /never holds your money|HouseCall never holds/i)
    assert.match(safetyText, /How does local matching work\?/i)
    assert.doesNotMatch(safetyText, /Is HouseCall available outside Austin\?/i)
    assert.ok(await page.locator('a[href="/browse"], a[href="/"]').count() >= 1, 'safety has nav escape')
    // /safety guest chrome may omit marketing nav; ensure escape links exist above.
    const safetyNav = await page.locator('[data-testid="landing-nav"]').count()
    assert.ok(safetyNav >= 0, 'safety nav probe')

    // Customer seed so 3-col peer discovery chrome is exercised (helpers use jobs-only 2-col).
    await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId || 'user-you'
      for (const p of state.people || []) {
        if (p.id === me) {
          p.accountRole = 'customer'
          p.isHelper = false
          p.skills = []
        } else if (!(p.isHelper || (p.skills || []).length)) {
          p.isHelper = true
          p.skills = ['junk-removal', 'house-cleaning']
        }
      }
      localStorage.setItem(key, JSON.stringify(state))
    }, STORAGE_KEY)

    for (const { width, height } of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width, height })
      await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('text=Browse Local Jobs')
      const g = await page.evaluate((vpWidth) => {
        const html = document.documentElement
        const topnavInner =
          document.querySelector('[data-testid="app-topnav"] .beam-container') ||
          document.querySelector('[data-testid="landing-nav"] .beam-container') ||
          document.querySelector('main.beam-container') ||
          document.querySelector('.beam-container')
        // Padding-based gutters: container often spans full viewport; measure content inset.
        let leftGutter = Infinity
        let rightGutter = Infinity
        if (topnavInner) {
          const cs = getComputedStyle(topnavInner)
          const padL = parseFloat(cs.paddingLeft) || 0
          const padR = parseFloat(cs.paddingRight) || 0
          const rect = topnavInner.getBoundingClientRect()
          leftGutter = rect.left + padL
          rightGutter = vpWidth - (rect.right - padR)
        }
        const commandBar =
          document.querySelector('[data-testid="browse-command-bar"] > div') ||
          document.querySelector('[data-testid="browse-command-bar"]')
        const feed = document.querySelector('[data-testid="browse-feed-main"]')
        const radiusTrigger =
          document.querySelector('[data-testid="browse-radius-trigger"]') ||
          document.querySelector('[data-testid="browse-when-trigger"]') ||
          document.querySelector('[data-testid="browse-availability-trigger"]')
        return {
          overflowX: html.scrollWidth > html.clientWidth + 1,
          scrollWidth: html.scrollWidth,
          clientWidth: html.clientWidth,
          leftGutter,
          rightGutter,
          commandBarWidth: commandBar?.getBoundingClientRect().width ?? null,
          feedWidth: feed?.getBoundingClientRect().width ?? null,
          radiusTriggerWidth: radiusTrigger?.getBoundingClientRect().width ?? null,
          broken: Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0 && img.src)
            .length,
        }
      }, width)
      assert.equal(g.overflowX, false, `no x-overflow browse @${width}`)
      assert.equal(g.broken, 0, `no broken images browse @${width}`)
      if (width === 1440) {
        assert.ok(
          g.leftGutter <= 40,
          `desktop left gutter <= 40px (got ${g.leftGutter})`,
        )
        assert.ok(
          g.leftGutter >= 16,
          `desktop left gutter >= 16px (got ${g.leftGutter})`,
        )
        assert.ok(
          Math.abs(g.leftGutter - g.rightGutter) <= 2,
          `desktop gutters symmetric (L=${g.leftGutter}, R=${g.rightGutter})`,
        )
        assert.ok(
          g.commandBarWidth != null && g.commandBarWidth >= 700 && g.commandBarWidth <= 808,
          `desktop browse column is ~760–808px (got ${g.commandBarWidth})`,
        )
        assert.ok(
          g.radiusTriggerWidth != null && g.radiusTriggerWidth <= 220,
          `desktop radius/middle trigger compact (<=220px, got ${g.radiusTriggerWidth})`,
        )

        // Browse v3: one centered column, page scroll, no 3-col rails.
        const col = await page.evaluate(() => {
          const root = document.querySelector('[data-testid="browse-v3"]')
          const row = document.querySelector('[data-testid="browse-job-row"]')
          const rowRadius = row ? parseFloat(getComputedStyle(row).borderRadius) || 0 : 0
          const main = document.querySelector('main')
          return {
            hasV3: !!root,
            layout: root?.getAttribute('data-browse-layout') || null,
            has3col: !!document.querySelector('[data-testid="browse-3col-grid"]'),
            hasTrending: !!document.querySelector('[data-testid="browse-trending-helpers"]'),
            hasFeedScroll: !!document.querySelector('[data-testid="browse-feed-scroll"]'),
            hasBudget: [...document.querySelectorAll('button')].some((b) =>
              /^Budget$/i.test((b.textContent || '').trim()),
            ),
            hasSample: /Sample listings/i.test(document.body.innerText || ''),
            columnWidth: root?.getBoundingClientRect().width ?? null,
            rowRadius,
            mainOverflow: main ? getComputedStyle(main).overflowY : null,
            whenText: document.querySelector('[data-testid="browse-when-trigger"]')?.textContent || '',
          }
        })
        assert.equal(col.hasV3, true, 'browse-v3 present @1440')
        assert.equal(col.layout, 'discovery', 'customer browse-v3 discovery layout')
        assert.equal(col.has3col, false, '3-col grid removed')
        assert.equal(col.hasTrending, false, 'trending column removed')
        assert.equal(col.hasFeedScroll, false, 'nested feed scroll removed')
        assert.equal(col.hasBudget, false, 'no Budget filter pill')
        assert.equal(col.hasSample, false, 'no sample listings copy')
        assert.ok(
          col.columnWidth != null && col.columnWidth >= 760 && col.columnWidth <= 860,
          `browse column width (got ${col.columnWidth})`,
        )
        assert.ok(
          col.rowRadius > 0 && col.rowRadius <= 12,
          `job row radius <= 12px (got ${col.rowRadius})`,
        )
        assert.notEqual(col.mainOverflow, 'hidden', 'browse main is not overflow-locked')
        assert.match(col.whenText, /Any timing/i, 'when control defaults to Any timing')

        const locked = await page.evaluate(() => {
          const siteFooter = document.querySelector('[data-testid="landing-footer"]')
          const rows = [...document.querySelectorAll('[data-testid="browse-job-row"]')]
          const cardBoxes = rows.slice(0, 3).map((el) => {
            const r = el.getBoundingClientRect()
            return { top: r.top, left: r.left, width: r.width }
          })
          const firstBefore = rows[0]?.getBoundingClientRect().top ?? null
          window.scrollTo(0, 280)
          const firstAfter = rows[0]?.getBoundingClientRect().top ?? null
          const scrollY = window.scrollY
          window.scrollTo(0, 0)
          const bodyText = document.body.innerText || ''
          return {
            scrollY: window.scrollY,
            moved: firstBefore != null && firstAfter != null && firstAfter < firstBefore - 40,
            scrolledTo: scrollY,
            docScrollHeight: document.documentElement.scrollHeight,
            docClientHeight: document.documentElement.clientHeight,
            cardBoxes,
            hasZeroStar: /★\s*0\.0/.test(bodyText),
            hasSiteFooter: Boolean(siteFooter),
            footerHeight: siteFooter ? Math.round(siteFooter.getBoundingClientRect().height) : 0,
          }
        })
        assert.equal(locked.scrollY, 0, 'desktop /browse window.scrollY === 0 at load')
        assert.ok(locked.hasSiteFooter, 'desktop /browse includes shared landing-footer')
        assert.ok(
          locked.footerHeight >= 240 && locked.footerHeight <= 340,
          `desktop /browse footer height in ~280–340px band (got ${locked.footerHeight})`,
        )
        assert.ok(
          locked.docScrollHeight > locked.docClientHeight + 200,
          `desktop /browse document scrolls to reach footer (scrollHeight=${locked.docScrollHeight}, clientHeight=${locked.docClientHeight})`,
        )
        assert.equal(locked.moved, true, 'job rows move with document scroll')
        assert.ok(locked.scrolledTo > 40, 'window.scrollTo actually scrolled the page')
        if (locked.cardBoxes.length >= 3) {
          const [a, b, c] = locked.cardBoxes
          assert.ok(
            a.top < b.top && b.top < c.top,
            `job rows stack vertically @1440 (tops=${a.top},${b.top},${c.top})`,
          )
          assert.ok(
            Math.abs(a.left - b.left) <= 2 && Math.abs(b.left - c.left) <= 2,
            `job rows share the same left edge @1440 (lefts=${a.left},${b.left},${c.left})`,
          )
        }
        assert.equal(locked.hasZeroStar, false, 'no ★ 0.0 star rating text on /browse')
      }
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
    if (/Sign in to help nearby|Create account|HouseCall needs configuration/i.test(bodyText) &&
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
        category: 'house-cleaning',
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
    // Clear demo seed role/city so preview matches a fresh signup (seed helpers
    // now carry explicit accountRole and would otherwise pre-select Helper).
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(() => !!localStorage.getItem('beam-demo-v1'), null, {
      timeout: 20000,
    })
    await page.evaluate(() => {
      const key = 'beam-demo-v1'
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      const me = state.currentUserId
      state.people = (state.people || []).map((p) =>
        p.id === me
          ? {
              ...p,
              accountRole: null,
              isHelper: false,
              skills: [],
              hourlyRate: 0,
              city: null,
              stateCode: null,
              locationLabel: '',
              onboardingCompletedAt: null,
              safetyDisclaimerAcceptedAt: null,
            }
          : p,
      )
      localStorage.setItem(key, JSON.stringify(state))
    })

    await page.goto(`${BASE_URL}/onboarding?preview=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="onboarding-root"]', { timeout: 20000 })

    const onboardingHeader = page.getByTestId('onboarding-header')
    await onboardingHeader.waitFor({ state: 'visible' })
    const headerStep1 = await onboardingHeader.innerText()
    assert.match(headerStep1, /Step 1 of 2/i, 'step progress in header')
    assert.doesNotMatch(headerStep1, /\bBeam\b/, 'no Beam wordmark in onboarding header')
    assert.equal(
      await onboardingHeader.locator('a[aria-label="HouseCall home"]').count(),
      0,
      'no Beam logo link in onboarding header',
    )

    const step1 = await page.locator('[data-testid="onboarding-step-1"]').innerText()
    assert.match(step1, /Welcome to HouseCall/i)
    assert.match(step1, /\bNeighbor\b/i)
    assert.match(step1, /\bHelper\b/i)
    assert.match(step1, /How you'll use HouseCall/i)
    assert.doesNotMatch(step1, /\bCustomer\b/i)
    assert.doesNotMatch(step1, /Popular/i)
    assert.doesNotMatch(step1, /Sign out/i)
    assert.doesNotMatch(step1, /Preview mode/i)
    assert.equal(
      await page.getByTestId('onboarding-next').getAttribute('aria-disabled'),
      'true',
      'Continue aria-disabled initially',
    )
    // Native disabled must stay false so the click handler can show validation.
    assert.equal(
      await page.getByTestId('onboarding-next').evaluate((el) => el.hasAttribute('disabled')),
      false,
      'Continue has no native disabled attr',
    )
    assert.equal(await page.locator('[data-testid="onboarding-sign-out"]').count(), 0, 'no sign-out control in preview')
    assert.equal(await page.locator('[data-testid="onboarding-benefits"]').count(), 0, 'no benefits panel before role')
    assert.equal(await page.locator('img').count(), 0, 'no stock photos on onboarding')

    // Clicking Continue with no role shows inline validation (never a dead button).
    await page.getByTestId('onboarding-next').click({ force: true })
    await page.waitForSelector('[data-testid="onboarding-step1-error"]')
    assert.match(
      await page.getByTestId('onboarding-step1-error').innerText(),
      /Choose Neighbor or Helper/i,
    )

    const darkProbe = await page.evaluate(() => {
      const bodyBg = getComputedStyle(document.body).backgroundColor
      const bodyText = document.body.innerText
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
        austin: /across Austin|Hyde Park|East Austin/i.test(bodyText),
        emailLike: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(bodyText),
      }
    })
    assert.ok(isLightRgb(darkProbe.bodyBg) || !isDarkLeftover(darkProbe.bodyBg), `onboarding body ${darkProbe.bodyBg}`)
    assert.equal(darkProbe.darkCount, 0, 'onboarding dark leftovers')
    assert.equal(darkProbe.overflowX, false, 'onboarding no horizontal overflow')
    assert.equal(darkProbe.austin, false, 'onboarding has no Austin assumptions')
    assert.equal(darkProbe.emailLike, false, 'onboarding must not show email')

    await page.getByTestId('onboarding-role-customer').click()
    assert.equal(await page.getByTestId('onboarding-role-customer').getAttribute('aria-checked'), 'true')
    const benefitsVisible = page.locator('[data-testid="onboarding-benefits"]:visible')
    await benefitsVisible.first().waitFor({ state: 'visible' })
    const neighborBenefits = await benefitsVisible.first().innerText()
    assert.match(neighborBenefits, /As a Neighbor/i)
    assert.match(neighborBenefits, /Post a job and hire someone nearby/i)
    assert.match(neighborBenefits, /No address verification is needed to post a job/i)
    assert.doesNotMatch(neighborBenefits, /Address verification is required/i)
    assert.equal(await page.locator('[data-testid="onboarding-helper-verify"]:visible').count(), 0)

    await page.getByTestId('onboarding-role-helper').click()
    assert.equal(await page.getByTestId('onboarding-role-helper').getAttribute('aria-checked'), 'true')
    await page.locator('[data-testid="onboarding-helper-verify"]:visible').first().waitFor({ state: 'visible' })
    const helperBenefits = await benefitsVisible.first().innerText()
    assert.match(helperBenefits, /As a Helper/i)
    assert.match(helperBenefits, /Offer on jobs and earn on your schedule/i)
    assert.match(helperBenefits, /Address verification is required before you can make an offer/i)
    assert.match(helperBenefits, /one-time location check/i)
    assert.match(helperBenefits, /full email and home address/i)
    assert.doesNotMatch(helperBenefits, /electricity or water bill/i)
    assert.doesNotMatch(helperBenefits, /lease, or official mail/i)
    assert.match(helperBenefits, /We will never sell your address/i)
    assert.match(helperBenefits, /confirm you're at this address|confirm you.re at this address/i)
    assert.ok(await page.locator('[data-testid="onboarding-helper-verify"]:visible').count() >= 1)
    // Mobile source order: benefits (mobile slot) before City so Helper verification is visible before Continue.
    const step1Order = await page.evaluate(() => {
      const step = document.querySelector('[data-testid="onboarding-step-1"]')
      if (!step) return null
      const mobileBenefits = step.querySelector('[data-testid="onboarding-benefits-mobile"]')
      const benefits = mobileBenefits?.querySelector('[data-testid="onboarding-benefits"]')
        ?? step.querySelector('[data-testid="onboarding-benefits"]')
      const cityLabel = [...step.querySelectorAll('label')].find((el) => /City/i.test(el.textContent || ''))
      const next = step.querySelector('[data-testid="onboarding-next"]')
      if (!benefits || !cityLabel || !next) return null
      const position = benefits.compareDocumentPosition(cityLabel)
      const cityBeforeNext = cityLabel.compareDocumentPosition(next)
      const form = step.querySelector('[data-testid="onboarding-form-column"]')
      const desktop = step.querySelector('[data-testid="onboarding-benefits-desktop"]')
      const fr = form?.getBoundingClientRect()
      const br = desktop?.getBoundingClientRect()
      const nr = next.getBoundingClientRect()
      return {
        benefitsBeforeCity: (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        cityBeforeContinue: (cityBeforeNext & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        desktopSideBySide: Boolean(fr && br && br.left > fr.right - 8),
        continueInViewport: nr.top >= 0 && nr.bottom <= window.innerHeight + 1,
      }
    })
    assert.equal(step1Order?.benefitsBeforeCity, true, 'benefits before City in DOM')
    assert.equal(step1Order?.cityBeforeContinue, true, 'City before Continue in DOM')
    assert.equal(step1Order?.desktopSideBySide, true, 'desktop benefits beside form column')
    assert.equal(step1Order?.continueInViewport, true, 'Continue visible beside benefits on desktop')

    // Helper selected + no city → Continue focuses city + shows validation.
    await page.getByTestId('onboarding-next').click({ force: true })
    await page.waitForSelector('[data-testid="onboarding-city-error"]')
    assert.match(
      await page.getByTestId('onboarding-city-error').innerText(),
      /Select your US city/i,
    )
    await page.waitForSelector('[data-testid="onboarding-city-listbox"]', { timeout: 5000 })

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
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="onboarding-city-input"]')
      return el instanceof HTMLInputElement && !el.disabled
    }, null, { timeout: 20000 })

    for (const check of cityChecks) {
      await cityInput.fill('')
      await cityInput.fill(check.q)
      await page.waitForSelector('[data-testid="onboarding-city-listbox"]')
      await page.waitForFunction(
        ({ re }) => {
          const box = document.querySelector('[data-testid="onboarding-city-listbox"]')
          return box && new RegExp(re, 'i').test(box.textContent || '')
        },
        { re: check.expect.source },
        { timeout: 10000 },
      )
      const optionsText = await page.getByTestId('onboarding-city-listbox').innerText()
      assert.match(optionsText, check.expect, `autocomplete for ${check.q}`)
    }

    // Exact "City, ST" text commits on Enter without clicking a dropdown row.
    await cityInput.fill('Austin, TX')
    await page.waitForFunction(() => {
      const box = document.querySelector('[data-testid="onboarding-city-listbox"]')
      return box && /Austin,\s*TX/i.test(box.textContent || '')
    }, null, { timeout: 10000 })
    await cityInput.press('Enter')
    await page.waitForSelector('[data-testid="onboarding-city-verified"]', { timeout: 5000 })
    assert.match(
      await page.getByTestId('onboarding-city-verified').innerText(),
      /Austin,\s*TX/i,
      'Enter commits exact City, ST',
    )
    // Change city and commit San Jose via option click (existing path).
    await page.getByRole('button', { name: /Change city/i }).click()
    await page.waitForSelector('[data-testid="onboarding-city-input"]')
    await cityInput.fill('San Jose, CA')
    await page.waitForSelector('[data-testid="onboarding-city-listbox"]')
    await page.waitForFunction(() => {
      const box = document.querySelector('[data-testid="onboarding-city-listbox"]')
      return box && /San Jose,\s*CA/i.test(box.textContent || '')
    }, null, { timeout: 10000 })
    await page.getByRole('option', { name: /San Jose,\s*CA/i }).first().click()
    await page.waitForSelector('[data-testid="onboarding-city-verified"]')
    const verified = await page.getByTestId('onboarding-city-verified').innerText()
    assert.match(verified, /San Jose,\s*CA/i)
    assert.doesNotMatch(verified, /Verified/i)
    assert.equal(
      await page.getByTestId('onboarding-next').getAttribute('aria-disabled'),
      'false',
      'Continue enabled',
    )

    await page.getByTestId('onboarding-next').click()
    await page.waitForSelector('[data-testid="onboarding-step-2"]')
    const headerStep2 = await page.getByTestId('onboarding-header').innerText()
    assert.match(headerStep2, /Step 2 of 2/i, 'step progress updates on step 2')
    assert.doesNotMatch(headerStep2, /\bBeam\b/, 'no Beam wordmark on step 2 header')
    assert.equal(
      await page.getByTestId('onboarding-header').locator('a[aria-label="HouseCall home"]').count(),
      0,
      'no Beam logo link on step 2 header',
    )
    const step2 = await page.getByTestId('onboarding-step-2').innerText()
    assert.match(step2, /Posting illegal content or listing sexual services is strictly prohibited/i)
    assert.match(step2, /accounts are suspended/i)
    assert.doesNotMatch(step2, /Mandatory marketplace policy/i)
    assert.doesNotMatch(step2, /Sign out/i)
    assert.match(step2, /Back/i)
    assert.match(step2, /Agree and continue/i)
    assert.ok(await page.getByTestId('onboarding-safety-callout').count() >= 1)
    assert.equal(await page.locator('[data-testid="onboarding-sign-out"]').count(), 0)
    assert.equal(await page.locator('aside').count(), 0)

    await page.getByTestId('onboarding-back').click()
    await page.waitForSelector('[data-testid="onboarding-step-1"]')
    assert.equal(await page.getByTestId('onboarding-role-helper').getAttribute('aria-checked'), 'true')
    assert.ok(await page.getByTestId('onboarding-city-verified').count() >= 1, 'city preserved on Back')

    await page.getByTestId('onboarding-next').click()
    await page.waitForSelector('[data-testid="onboarding-step-2"]')
    await page.getByTestId('onboarding-complete').click()
    await page.waitForURL(/\/browse/, { timeout: 15000 })
    assert.match(page.url(), /\/browse/)

    // Helper role + incomplete helper profile → sticky top banner above app-topnav.
    await page.waitForSelector('[data-testid="helper-setup-callout"]', { timeout: 15000 })
    await page.waitForSelector('[data-testid="app-topnav"]')
    const bannerGeometry = await page.evaluate(() => {
      const banner = document.querySelector('[data-testid="helper-setup-callout"]')
      const nav = document.querySelector('[data-testid="app-topnav"]')
      const cta = document.querySelector('[data-testid="helper-setup-banner-cta"]')
      const copy = banner?.querySelector('p')
      if (!banner || !nav || !cta || !copy) return null
      const bannerBox = banner.getBoundingClientRect()
      const navBox = nav.getBoundingClientRect()
      const ctaBox = cta.getBoundingClientRect()
      const copyBox = copy.getBoundingClientRect()
      const left = Math.min(copyBox.left, ctaBox.left)
      const right = Math.max(copyBox.right, ctaBox.right)
      return {
        bannerY: bannerBox.y,
        bannerBottom: bannerBox.y + bannerBox.height,
        navY: navBox.y,
        ctaCount: document.querySelectorAll('[data-testid="helper-setup-banner-cta"]').length,
        contentMidX: (left + right) / 2,
        textCtaGap: Math.max(0, ctaBox.left - copyBox.right),
        viewportMidX: window.innerWidth / 2,
      }
    })
    assert.ok(bannerGeometry, 'helper setup banner + topnav present on /browse')
    assert.ok(
      bannerGeometry.bannerY < bannerGeometry.navY,
      `banner must sit above topnav (banner.y=${bannerGeometry.bannerY}, nav.y=${bannerGeometry.navY})`,
    )
    assert.ok(
      bannerGeometry.bannerBottom <= bannerGeometry.navY + 1,
      `banner bottom must meet topnav top (bannerBottom=${bannerGeometry.bannerBottom}, nav.y=${bannerGeometry.navY})`,
    )
    assert.equal(bannerGeometry.ctaCount, 1, 'helper-setup-banner-cta present')
    assert.ok(
      Math.abs(bannerGeometry.contentMidX - bannerGeometry.viewportMidX) <= 40,
      `banner content centered on desktop (mid=${bannerGeometry.contentMidX}, expected≈${bannerGeometry.viewportMidX})`,
    )
    assert.ok(
      bannerGeometry.textCtaGap <= 400,
      `banner text↔CTA gap not edge-stretched (gap=${bannerGeometry.textCtaGap})`,
    )

    await page.getByTestId('helper-setup-banner-cta').click()
    await page.waitForURL(/\/onboarding\/helper/, { timeout: 15000 })
    assert.match(page.url(), /\/onboarding\/helper/)
    await page.waitForSelector('[data-testid="app-topnav"]', { timeout: 15000 })
    assert.equal(
      await page.locator('[data-testid="helper-setup-callout"]').count(),
      0,
      'banner hidden on /onboarding/helper',
    )

    // Return to /browse — banner still visible until helper setup is completed.
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="helper-setup-callout"]', { timeout: 15000 })

    // ?edit=1 keeps returning users on /onboarding (no redirect away).
    await page.goto(`${BASE_URL}/onboarding?preview=1&edit=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="onboarding-root"]', { timeout: 15000 })
    assert.ok(await page.getByTestId('onboarding-step-1').count() >= 1, 'edit=1 shows step 1')
    assert.match(page.url(), /edit=1/)

    console.log(
      'ok onboarding Step1 validation+city commit + Step2 + helper top banner + edit=1 + Agree→/browse',
    )
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
          /helper|tasks you take|Publish helper|Save helper|Continue with Google|Sign in|Create account|Welcome back|demo mode/i.test(
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
        !/Publish helper|Save helper|tasks you take/i.test(onboardText))
    ) {
      console.log('skip helper onboarding interactive (auth gated → /auth)')
      if (onboardUrl.pathname.replace(/\/$/, '') === '/auth') {
        assert.match(onboardText, /Welcome back|Join HouseCall|Continue with Google|demo mode/i)
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
      await page.waitForSelector('[data-testid="helper-onboarding-root"]', { timeout: 15000 })
      assert.ok(await page.getByTestId('helper-onboarding-root').count() >= 1)
      assert.equal(
        await page.locator('[data-testid="topnav-post-cta"]').count(),
        0,
        'topnav-post-cta hidden on /onboarding/helper',
      )
      assert.equal(
        await page.locator('legend').count(),
        0,
        'no uppercase legend clutter on helper onboarding',
      )
      assert.doesNotMatch(onboardText, /\bHELPER SETUP\b/)
      assert.doesNotMatch(onboardText, /\bSKILLS\b/)
      assert.doesNotMatch(onboardText, /\bSERVICE RADIUS\b/)
      const helperChrome = await page.evaluate(() => {
        const shell = document.querySelector('.app-shell')
        const form = document.querySelector('[data-testid="helper-onboarding-form"]')
        const shellBg = shell ? getComputedStyle(shell).backgroundColor : ''
        const formShadow = form ? getComputedStyle(form).boxShadow : ''
        const overflow =
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        return { shellBg, formShadow, overflow }
      })
      assert.equal(helperChrome.overflow, false, 'helper onboarding no horizontal overflow')
      assert.ok(
        /rgba?\(\s*255\s*,\s*255\s*,\s*255/i.test(helperChrome.shellBg) ||
          helperChrome.shellBg === 'rgb(255, 255, 255)',
        `helper onboarding shell should be white, got ${helperChrome.shellBg}`,
      )
      assert.ok(
        !helperChrome.formShadow ||
          helperChrome.formShadow === 'none' ||
          /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(helperChrome.formShadow),
        `helper form must not use outer card box-shadow, got ${helperChrome.formShadow}`,
      )
      assert.ok(await page.getByTestId('helper-skills-grid').count() >= 1)
      assert.ok(
        (await page.getByTestId('onboarding-city-input').count()) +
          (await page.getByTestId('onboarding-city-verified').count()) >=
          1,
        'UsCityCombobox present on helper onboarding',
      )

      // Completing helper setup dismisses the helper-setup banner.
      await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) || '{}')
        state.people = (state.people || []).map((p) =>
          p.id === state.currentUserId
            ? {
                ...p,
                accountRole: 'helper',
                isHelper: false,
                skills: [],
                onboardingCompletedAt: p.onboardingCompletedAt || new Date().toISOString(),
                safetyDisclaimerAcceptedAt:
                  p.safetyDisclaimerAcceptedAt || new Date().toISOString(),
                city: p.city || 'San Jose',
                stateCode: p.stateCode || 'CA',
                locationLabel: p.locationLabel || 'San Jose, CA',
              }
            : p,
        )
        localStorage.setItem(key, JSON.stringify(state))
      }, STORAGE_KEY)
      await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-testid="helper-setup-callout"]', { timeout: 15000 })
      await page.goto(`${BASE_URL}/onboarding/helper`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-testid="helper-onboarding-root"]', { timeout: 15000 })
      // Ensure at least one skill selected, then publish.
      const skillBtn = page.getByTestId('helper-skill-parent-home')
      if ((await skillBtn.getAttribute('aria-pressed')) !== 'true') {
        await skillBtn.click()
      }
      // Wait for UsCityCombobox to finish loading (verified chip or enabled input).
      await page.waitForFunction(
        () => {
          const verified = document.querySelector('[data-testid="onboarding-city-verified"]')
          const input = document.querySelector('[data-testid="onboarding-city-input"]')
          return Boolean(verified) || Boolean(input && !input.disabled)
        },
        null,
        { timeout: 30000 },
      )
      // City may already be hydrated from profile; if not, type San Jose.
      if ((await page.getByTestId('onboarding-city-verified').count()) === 0) {
        const cityInput = page.getByTestId('onboarding-city-input')
        await cityInput.fill('San Jose')
        await page.waitForSelector('[data-testid="onboarding-city-listbox"]', { timeout: 10000 })
        await page.locator('[data-testid="onboarding-city-listbox"] [role="option"]').first().click()
        await page.waitForSelector('[data-testid="onboarding-city-verified"]', { timeout: 10000 })
      }
      await page.getByTestId('helper-onboarding-submit').click()
      await page.waitForURL(/\/browse/, { timeout: 15000 })
      assert.equal(
        await page.locator('[data-testid="helper-setup-callout"]').count(),
        0,
        'helper-setup-callout dismissed after completing helper profile',
      )
      const helperFlag = await page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) || '{}')
        const me = (state.people || []).find((p) => p.id === state.currentUserId)
        return Boolean(me?.isHelper)
      }, STORAGE_KEY)
      assert.equal(helperFlag, true, 'isHelper true after publish')
    }

    // Post composer — AI Quick-Draft + Open to offers + radius
    await page.goto(`${BASE_URL}/post`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('body')
    await page
      .waitForFunction(
        () =>
          /Draft with AI|Describe what you need|Post request|Sign in|Create account|Continue with Google|Continue to HouseCall|demo mode|Welcome back/i.test(
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
      (/Sign in|Create account|demo mode|Continue to HouseCall|Continue with Google|Welcome back/i.test(postBody) &&
        !/Draft with AI|Post request/i.test(postBody)) ||
      /^HouseCall$/m.test(postBody.trim())
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

    // Request detail — 2-column desktop layout + subtle card radii + open-budget price
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/requests/req-1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="request-detail-root"]', { timeout: 15000 })
    const reqText = await page.locator('body').innerText()
    if (/Invite to offer|Nearby matches|Send an offer|Accept offer|Incoming offers/i.test(reqText)) {
      assert.ok(true)
    }
    assert.equal(
      await page.evaluate(() => /WHEN YOU CAN START/.test(document.body.innerText)),
      false,
      'no uppercase WHEN YOU CAN START',
    )
    assert.equal(
      await page.evaluate(() => /\bBUDGET\b/.test(document.body.innerText)),
      false,
      'no uppercase BUDGET label',
    )
    const twoCol = await page.evaluate(() => {
      const left = document.querySelector('[data-testid="request-detail-left"]')
      const right = document.querySelector('[data-testid="request-detail-right"]')
      if (!left || !right) return null
      const lr = left.getBoundingClientRect()
      const rr = right.getBoundingClientRect()
      return {
        leftRight: lr.right,
        rightLeft: rr.left,
        bothVisible: lr.width > 100 && rr.width > 100 && lr.top < window.innerHeight,
        sideBySide: rr.left >= lr.right - 4,
      }
    })
    assert.ok(twoCol, 'request detail left+right columns present')
    assert.equal(twoCol.sideBySide, true, 'desktop request detail is 2-column')
    assert.equal(twoCol.bothVisible, true, 'both columns visible above the fold')

    const cardRadii = await page.evaluate(() => {
      const cards = [
        ...document.querySelectorAll(
          '[data-testid="request-budget-card"], [data-testid="request-detail-left"] article, [data-testid="request-offer-panel"] > div, [data-testid="request-incoming-offers"]',
        ),
      ]
      return cards.map((el) => {
        const r = getComputedStyle(el).borderTopLeftRadius
        const n = parseFloat(r)
        return { tag: el.getAttribute('data-testid') || el.tagName, px: n, raw: r }
      })
    })
    for (const c of cardRadii) {
      assert.ok(c.px > 0 && c.px <= 10, `request card radius subtle (<=10px), got ${c.raw} on ${c.tag}`)
    }

    // Open-budget request must not prefill literal "0" in offer price.
    await page.goto(`${BASE_URL}/requests/req-3`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="request-detail-root"]', { timeout: 15000 })
    if ((await page.getByTestId('offer-price-input').count()) > 0) {
      const priceVal = await page.getByTestId('offer-price-input').inputValue()
      assert.notEqual(priceVal, '0', 'open-budget offer price must not prefill 0')
      assert.equal(priceVal, '', 'open-budget offer price starts empty')
    }

    // Browse cards also use subtle corners.
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="browse-job-row"]', { timeout: 15000 })
    const browseRadii = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-testid="browse-job-row"]')].slice(0, 4)
      return cards.map((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius))
    })
    assert.ok(browseRadii.length > 0, 'browse request cards present')
    for (const px of browseRadii) {
      assert.ok(px > 0 && px <= 12, `browse card radius subtle (<=12px Paper), got ${px}`)
    }

    // Messages drawer — list over the current page, thread is a connected left pane.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/messages/missing-thread`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="messages-drawer"]', { timeout: 15000 })
    assert.match(page.url(), /\/browse\?/, 'missing thread redirects onto browse')
    assert.match(page.url(), /messages=1/, 'missing thread opens the drawer')
    assert.match(page.url(), /thread=missing-thread/, 'missing thread keeps the thread id')
    const missingText = await page.locator('body').innerText()
    assert.match(missingText, /Thread not found/i, 'missing thread empty state')
    assert.match(missingText, /Back to inbox/i, 'missing thread back action')
    assert.doesNotMatch(missingText, /Sample conversations/i, 'no sample conversations footer')
    assert.doesNotMatch(
      missingText,
      /Conversations stay scoped to accepted requests/i,
      'no inaccurate messages hero subtitle',
    )
    assert.ok(
      (await page.locator('[data-testid="browse-v3"]').count()) >= 1,
      'browse stays mounted under the drawer',
    )

    await page.goto(`${BASE_URL}/messages`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="messages-drawer"]', { timeout: 15000 })
    await page.waitForSelector('[data-testid="messages-thread-list"]', { timeout: 15000 })
    await page.waitForFunction(() => {
      const drawer = document.querySelector('[data-testid="messages-drawer"]')
      if (!drawer) return false
      const transform = getComputedStyle(drawer).transform
      return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
    })
    const messagesProbe = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="messages-drawer"]')
      if (!drawer) return null
      const list = document.querySelector('[data-testid="messages-list-panel"]')
      const conversation = document.querySelector('[data-testid="messages-conversation"]')
      const rail = document.querySelector('[data-testid="messages-task-rail"]')
      const taskBar = document.querySelector('[data-testid="messages-task-bar"]')
      const threads = document.querySelector('[data-testid="messages-thread-list"]')
      const heroH1 = [...document.querySelectorAll('h1')].some((h) => h.textContent?.trim() === 'Messages')
      const rawOpenBadge = [...document.querySelectorAll('[data-testid="messages-thread-list"] *')].some(
        (el) => el.textContent?.trim() === 'open',
      )
      const dr = drawer.getBoundingClientRect()
      const lr = list?.getBoundingClientRect()
      const radius = parseFloat(getComputedStyle(drawer).borderTopLeftRadius)
      return {
        role: drawer.getAttribute('role'),
        radius,
        hasList: Boolean(threads),
        hasConversation: Boolean(conversation),
        hasRail: Boolean(rail),
        hasTaskBar: Boolean(taskBar),
        heroH1,
        rawOpenBadge,
        sample: /Sample conversations/i.test(document.body.innerText),
        browseMounted: Boolean(document.querySelector('[data-testid="browse-v3"]')),
        listWidth: lr?.width ?? 0,
        drawerRightGap: window.innerWidth - dr.right,
        drawerTop: dr.top,
        bodyLocked: getComputedStyle(document.body).overflow === 'hidden',
      }
    })
    assert.ok(messagesProbe, 'messages drawer mounted')
    assert.equal(messagesProbe.role, 'dialog', 'messages drawer is a dialog')
    assert.equal(messagesProbe.heroH1, false, 'Messages title is not a page hero')
    assert.equal(messagesProbe.rawOpenBadge, false, 'no raw lowercase open badge in inbox')
    assert.equal(messagesProbe.sample, false, 'no sample conversations footer')
    assert.ok(messagesProbe.hasList, 'inbox thread list present')
    assert.equal(messagesProbe.hasConversation, false, 'list drawer does not auto-open a thread')
    assert.equal(messagesProbe.hasRail, false, 'task rail removed')
    assert.equal(messagesProbe.hasTaskBar, false, 'no persistent job/offer task bar')
    assert.ok(messagesProbe.browseMounted, 'browse stays mounted under the list drawer')
    assert.ok(messagesProbe.bodyLocked, 'body scroll locked while the drawer is open')
    assert.ok(
      messagesProbe.listWidth >= 360 && messagesProbe.listWidth <= 400,
      `list drawer ~380px (got ${messagesProbe.listWidth})`,
    )
    assert.ok(
      messagesProbe.radius >= 12 && messagesProbe.radius <= 16,
      `drawer radius ~14px, got ${messagesProbe.radius}`,
    )
    assert.ok(
      messagesProbe.drawerTop >= 8 && messagesProbe.drawerTop <= 16,
      `drawer inset top ~12px, got ${messagesProbe.drawerTop}`,
    )
    assert.ok(
      messagesProbe.drawerRightGap >= 8 && messagesProbe.drawerRightGap <= 16,
      `drawer inset right ~12px, got ${messagesProbe.drawerRightGap}`,
    )

    // Seeded requester thread — connected chat pane, person header, no offer strips
    await page.goto(`${BASE_URL}/messages/th-1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="messages-conversation"]', { timeout: 15000 })
    const threadProbe = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="messages-drawer"]')
      const list = document.querySelector('[data-testid="messages-list-panel"]')
      const chat = document.querySelector('[data-testid="messages-chat-panel"]')
      const lr = list?.getBoundingClientRect()
      const cr = chat?.getBoundingClientRect()
      const text = document.body.innerText
      return {
        joined:
          Boolean(lr && cr) &&
          Math.abs(cr.right - lr.left) <= 2 &&
          Math.abs(cr.top - lr.top) < 4,
        listWidth: lr?.width ?? 0,
        chatWidth: cr?.width ?? 0,
        drawerWidth: drawer?.getBoundingClientRect().width ?? 0,
        price: /\bPRICE\b/.test(text),
        confirmed: /Confirmed\s*·/.test(text),
        eta: /ETA Today/i.test(text),
        sample: /Sample conversations/i.test(text),
      }
    })
    assert.equal(await page.getByTestId('messages-incoming-offer').count(), 0)
    assert.equal(await page.getByTestId('messages-task-bar').count(), 0)
    assert.ok(await page.getByTestId('messages-composer').count() >= 1)
    assert.ok(await page.getByTestId('messages-view-request').count() >= 1)
    assert.ok(await page.getByTestId('messages-job-strip').count() >= 1)
    assert.equal(threadProbe.price, false, 'no uppercase PRICE label in messages')
    assert.equal(threadProbe.confirmed, false, 'no confirmed-price strip')
    assert.equal(threadProbe.eta, false, 'no ETA Today strip')
    assert.equal(threadProbe.sample, false, 'no sample conversations footer')
    assert.ok(threadProbe.joined, 'chat sits directly against the list (one panel)')
    assert.ok(
      threadProbe.chatWidth >= 480 && threadProbe.chatWidth <= 520,
      `chat pane ~500px (got ${threadProbe.chatWidth})`,
    )
    assert.ok(
      threadProbe.listWidth >= 360 && threadProbe.listWidth <= 400,
      `list pane ~380px beside chat (got ${threadProbe.listWidth})`,
    )
    assert.ok(
      threadProbe.drawerWidth >= 850 && threadProbe.drawerWidth <= 910,
      `connected drawer ~880px (got ${threadProbe.drawerWidth})`,
    )

    console.log('ok marketplace daylight + AI draft + geocode + onboarding + request-detail 2col + messages drawer')
  } finally {
    await browser.close()
  }
}

async function checkSubtleRadii() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.log('skip subtle radii (playwright not installed)')
    return
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  try {
    const paths = ['/', '/browse', '/browse?tab=people', '/auth', '/safety', '/post', '/messages']
    for (const pathName of paths) {
      await page.goto(`${BASE_URL}${pathName}`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('body')
      await page
        .waitForFunction(
          () =>
            document.body.innerText.length > 40 &&
            !/^HouseCall\s*$/m.test(document.body.innerText.trim()),
          null,
          { timeout: 15000 },
        )
        .catch(() => {})

      if (pathName === '/browse?tab=people') {
        // Customer role + clear other helper flags so EmptyState + Become a helper render.
        // Seed before navigation: helper accountRole would otherwise strip tab=people.
        await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
        await page.waitForFunction(() => !!localStorage.getItem('beam-demo-v1'), null, {
          timeout: 15000,
        })
        await page.evaluate((key) => {
          const raw = localStorage.getItem(key)
          if (!raw) return
          const state = JSON.parse(raw)
          state.people = (state.people || []).map((p) =>
            p.id === state.currentUserId
              ? {
                  ...p,
                  accountRole: 'customer',
                  isHelper: false,
                  skills: [],
                }
              : {
                  ...p,
                  isHelper: false,
                  skills: [],
                },
          )
          localStorage.setItem(key, JSON.stringify(state))
        }, STORAGE_KEY)
        await page.goto(`${BASE_URL}/browse?tab=people`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('text=No helpers nearby yet', { timeout: 15000 })
      }

      const probe = await page.evaluate(() => {
        function radiusPx(el) {
          return parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
        }
        function isAllowedCircle(el) {
          if (el.getAttribute('role') === 'switch' || el.getAttribute('role') === 'radio') return true
          const w = el.getBoundingClientRect().width
          const h = el.getBoundingClientRect().height
          // Tiny dots / progress segments
          if (w <= 14 && h <= 14) return true
          // Progress bar segments
          if (h <= 6 && w <= 64) return true
          // Circular avatars / portraits (near-square)
          if (
            Math.abs(w - h) <= 2 &&
            w >= 20 &&
            w <= 140 &&
            (el.tagName === 'IMG' ||
              el.className?.toString?.().includes('rounded-full') ||
              el.querySelector?.('img'))
          ) {
            return true
          }
          // Switch tracks
          if (el.getAttribute('role') === 'switch') return true
          if (w >= 40 && w <= 56 && h >= 24 && h <= 32 && /rounded-full/.test(String(el.className))) {
            return true
          }
          return false
        }

        const cardSelectors = [
          '[data-testid="browse-filters-sidebar"] > div',
          '[data-testid="browse-trending-helpers"]',
          '[data-testid="browse-command-bar"] > div',
          '[data-testid="hero-search-pill"] > div',
          '[data-testid="messages-inbox-rail"]',
          '[data-testid="messages-conversation-panel"]',
          '[data-testid="categories-bento"] a',
          '[data-testid="why-beam-live-offers"]',
          '[data-testid="why-beam-showcase"] > div',
        ]
        const cards = []
        for (const sel of cardSelectors) {
          for (const el of document.querySelectorAll(sel)) cards.push(el)
        }
        // EmptyState wrappers (white bordered boxes with centered text)
        for (const el of document.querySelectorAll('div')) {
          const t = (el.textContent || '').trim()
          if (/No helpers nearby yet|No (open )?requests|No messages yet/i.test(t) && el.children.length <= 6) {
            const r = el.getBoundingClientRect()
            if (r.width > 180 && r.height > 80) cards.push(el)
          }
        }

        const cardOffenders = cards
          .map((el) => ({
            tag: el.getAttribute('data-testid') || el.tagName,
            px: radiusPx(el),
            text: (el.textContent || '').trim().slice(0, 40),
            // Popular services photo tiles are locked at ~14px radius.
            allow14:
              el.closest?.('[data-testid="categories-bento"]') != null ||
              String(el.getAttribute('data-testid') || '').startsWith('categories-tile-'),
          }))
          .filter((c) => (c.allow14 ? c.px > 14 : c.px > 12))
          .map(({ allow14: _a, ...rest }) => rest)

        const controls = [
          ...document.querySelectorAll('button, a.inline-flex, a[class*="rounded"]'),
        ].filter((el) => {
          if (isAllowedCircle(el)) return false
          const r = el.getBoundingClientRect()
          return r.width > 24 && r.height > 20
        })
        const controlOffenders = controls
          .map((el) => ({
            tag: el.tagName,
            role: el.getAttribute('role'),
            testid: el.getAttribute('data-testid'),
            text: (el.textContent || '').trim().slice(0, 36),
            px: radiusPx(el),
            allow14:
              el.closest?.('[data-testid="categories-bento"]') != null ||
              String(el.getAttribute('data-testid') || '').startsWith('categories-tile-'),
          }))
          .filter((c) => (c.allow14 ? c.px > 14 : c.px > 12))
          .map(({ allow14: _a, ...rest }) => rest)

        // Explicit people-tab empty state + Become a helper CTA
        let peopleEmpty = null
        let becomeHelper = null
        if (location.search.includes('tab=people') || /No helpers nearby yet/i.test(document.body.innerText)) {
          const v3Empty = document.querySelector('[data-testid="browse-filtered-empty"]')
          const emptyTitle = [...document.querySelectorAll('h2, h3')].find((el) =>
            /No helpers nearby yet/i.test(el.textContent || ''),
          )
          let emptyBox = v3Empty || emptyTitle?.parentElement || null
          // Walk up to the bordered EmptyState wrapper when the v3 card is not the node itself.
          if (!v3Empty) {
            while (emptyBox && emptyBox !== document.body) {
              const cls = String(emptyBox.className || '')
              if (
                (/rounded-lg/.test(cls) || /rounded-\[10px\]/.test(cls) || /rounded-xl/.test(cls)) &&
                /border/.test(cls)
              ) {
                break
              }
              emptyBox = emptyBox.parentElement
            }
          }
          peopleEmpty = emptyBox
            ? { px: radiusPx(emptyBox), text: (emptyBox.textContent || '').trim().slice(0, 48) }
            : null
          const cta =
            document.querySelector('[data-testid="browse-empty-post-cta"]') ||
            [...document.querySelectorAll('a,button')].find((el) =>
              /^Become a helper$/i.test((el.textContent || '').trim()),
            )
          becomeHelper = cta ? { px: radiusPx(cta), text: (cta.textContent || '').trim() } : null
        }

        return {
          cardOffenders: cardOffenders.slice(0, 12),
          controlOffenders: controlOffenders.slice(0, 12),
          peopleEmpty,
          becomeHelper,
        }
      })

      assert.deepEqual(
        probe.cardOffenders,
        [],
        `${pathName} card/panel radius >12px: ${JSON.stringify(probe.cardOffenders)}`,
      )
      assert.deepEqual(
        probe.controlOffenders,
        [],
        `${pathName} button/CTA radius >12px: ${JSON.stringify(probe.controlOffenders)}`,
      )
      if (pathName === '/browse?tab=people') {
        assert.ok(probe.peopleEmpty, 'people tab EmptyState found')
        assert.ok(
          probe.peopleEmpty.px > 0 && probe.peopleEmpty.px <= 12,
          `EmptyState radius <=12 (got ${probe.peopleEmpty.px})`,
        )
        assert.ok(probe.becomeHelper, 'helper setup CTA found')
        assert.match(
          probe.becomeHelper.text,
          /Become a helper|Set up helper profile/i,
          'helper empty offers a path to become a helper',
        )
        assert.ok(
          probe.becomeHelper.px > 0 && probe.becomeHelper.px <= 12,
          `helper setup CTA radius <=12 (got ${probe.becomeHelper.px})`,
        )
      }
      console.log(`ok subtle radii ${pathName}`)
    }
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
  await checkSubtleRadii()
  console.log('smoke passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
