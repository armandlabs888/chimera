/**
 * Landing nav + onboarding visual QA.
 * Screenshots → /opt/cursor/artifacts/landing-nav-qa/
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/landing-nav-qa'
const LOCAL_OUT = '/workspace/artifacts/landing-nav-qa'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL_OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
]

const summary = { ok: true, checks: [], failures: [], shots: [] }

function record(ok, msg, detail = null) {
  const entry = { ok, msg, detail }
  summary.checks.push(entry)
  if (!ok) {
    summary.ok = false
    summary.failures.push(msg)
    console.error(`FAIL  ${msg}${detail ? ` — ${detail}` : ''}`)
  } else {
    console.log(`PASS  ${msg}`)
  }
}

function saveShot(tmpPath, name) {
  const dest = join(OUT, name)
  copyFileSync(tmpPath, dest)
  copyFileSync(tmpPath, join(LOCAL_OUT, name))
  summary.shots.push(dest)
  return dest
}

const browser = await chromium.launch({ headless: true })
const tmpDir = '/tmp/beam-landing-nav-qa'
mkdirSync(tmpDir, { recursive: true })

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('[data-testid="landing-nav"]', { timeout: 15000 })
    await page.waitForTimeout(500)

    const nav = page.getByTestId('landing-nav')
    // Desktop auth links are sm:inline (hidden below sm); count DOM presence, not visibility.
    const authPresence = await nav.evaluate((el) => {
      const links = [...el.querySelectorAll('a')]
      return {
        login: links.some((a) => (a.textContent || '').trim() === 'Log in'),
        signup: links.some((a) => (a.textContent || '').trim() === 'Sign up'),
        post: links.some((a) => /^Post a task$/i.test((a.textContent || '').trim())),
      }
    })

    record(authPresence.login, `${vp.name}: Log in in landing-nav`)
    record(authPresence.signup, `${vp.name}: Sign up in landing-nav`)
    record(!authPresence.post, `${vp.name}: no Post a task in landing-nav`)

    const topShot = join(tmpDir, `landing-${vp.name}.png`)
    await page.screenshot({ path: topShot, fullPage: false })
    saveShot(topShot, `landing-${vp.name}.png`)

    if (vp.width >= 768) {
      await page.evaluate(() => window.scrollTo(0, 700))
      await page.waitForTimeout(400)
      record(
        (await nav.getByRole('link', { name: /^Post a task$/i }).count()) === 0,
        `${vp.name} scrolled: no Post a task`,
      )
      record(
        (await nav.getByRole('link', { name: 'Sign up' }).count()) >= 1,
        `${vp.name} scrolled: Sign up present`,
      )
      const scrolledShot = join(tmpDir, `landing-scrolled-${vp.name}.png`)
      await page.screenshot({ path: scrolledShot, fullPage: false })
      saveShot(scrolledShot, `landing-scrolled-${vp.name}.png`)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(200)
    }

    if (vp.width < 1024) {
      const openBtn = page.getByRole('button', { name: /Open menu/i })
      if ((await openBtn.count()) > 0 && (await openBtn.isVisible())) {
        await openBtn.click()
        await page.waitForSelector('[data-testid="landing-mobile-menu"]', { timeout: 5000 })
        const menu = page.getByTestId('landing-mobile-menu')
        record((await menu.count()) === 1, `${vp.name}: mobile menu open`)
        record(
          (await menu.getByRole('link', { name: 'Log in' }).count()) >= 1,
          `${vp.name}: mobile Log in`,
        )
        record(
          (await page.getByTestId('landing-mobile-signup').count()) === 1,
          `${vp.name}: mobile Sign up pill`,
        )
        record(
          (await menu.getByRole('link', { name: /^Post a task$/i }).count()) === 0,
          `${vp.name}: mobile menu has no Post a task`,
        )
        const menuShot = join(tmpDir, `landing-mobile-menu-${vp.name}.png`)
        await page.screenshot({ path: menuShot, fullPage: false })
        saveShot(menuShot, `landing-mobile-menu-${vp.name}.png`)
      }
    }

    await context.close()
  }

  // Onboarding preview shots — desktop + mobile
  for (const vp of [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '390x844', width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/onboarding?preview=1`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    await page.waitForSelector('[data-testid="onboarding-step-1"]', { timeout: 20000 })
    await page.waitForTimeout(400)
    record(
      (await page.getByTestId('onboarding-sign-out').count()) === 0,
      `onboarding ${vp.name}: no header/footer Sign out in preview`,
    )
    const shot = join(tmpDir, `onboarding-preview-${vp.name}.png`)
    await page.screenshot({ path: shot, fullPage: false })
    saveShot(shot, `onboarding-preview-${vp.name}.png`)

    // Validation state: Helper selected, city empty, Continue clicked
    await page.getByTestId('onboarding-role-helper').click()
    await page.getByTestId('onboarding-next').click({ force: true })
    await page.waitForTimeout(400)
    record(
      (await page.getByTestId('onboarding-city-error').count()) >= 1,
      `onboarding ${vp.name}: city validation after Continue`,
    )
    const validationShot = join(tmpDir, `onboarding-validation-${vp.name}.png`)
    await page.screenshot({ path: validationShot, fullPage: false })
    saveShot(validationShot, `onboarding-validation-${vp.name}.png`)
    await context.close()
  }
} finally {
  await browser.close()
}

const summaryPath = join(OUT, 'summary.json')
writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
if (existsSync(LOCAL_OUT)) {
  writeFileSync(join(LOCAL_OUT, 'summary.json'), JSON.stringify(summary, null, 2))
}
console.log(
  `\nSUMMARY passed=${summary.checks.filter((c) => c.ok).length} failed=${summary.failures.length} shots=${summary.shots.length}`,
)
if (!summary.ok) process.exit(1)
