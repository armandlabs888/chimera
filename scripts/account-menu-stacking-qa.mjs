/**
 * Assert the open account dropdown paints above page chrome (esp. /match search).
 */
import { chromium } from 'playwright'
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const LOCAL = '/workspace/artifacts/account-menu-stacking-qa'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

const summary = { ok: true, checks: [], failures: [] }

function record(ok, msg, detail = null) {
  summary.checks.push({ ok, msg, detail })
  if (!ok) {
    summary.ok = false
    summary.failures.push(msg)
    console.error(`FAIL  ${msg}${detail ? ` — ${JSON.stringify(detail)}` : ''}`)
  } else {
    console.log(`PASS  ${msg}`)
  }
}

async function shot(page, name) {
  const path = join(LOCAL, name)
  await page.screenshot({ path, fullPage: false })
  copyFileSync(path, join(OUT, name))
  return path
}

async function openDesktopMenu(page) {
  const trigger = page.locator('[data-testid="account-menu-trigger"]').first()
  await trigger.waitFor({ state: 'visible', timeout: 15000 })
  await trigger.click()
  await page.getByTestId('account-menu').waitFor({ state: 'visible', timeout: 5000 })
}

async function measureStacking(page) {
  return page.evaluate(() => {
    const menu = document.querySelector('[data-testid="account-menu"]')
    const shell = document.querySelector('[data-testid="browse-hc-header-shell"]')
    const search =
      document.querySelector('[data-testid="match-search"]') ||
      document.querySelector('[data-testid="hero-search"]') ||
      document.querySelector('.describe-search')
    if (!menu) return { ok: false, reason: 'no-menu' }

    const menuRect = menu.getBoundingClientRect()
    const menuZ = Number.parseFloat(getComputedStyle(menu).zIndex) || 0
    const shellZ = shell ? Number.parseFloat(getComputedStyle(shell).zIndex) || 0 : null
    const searchZ = search ? Number.parseFloat(getComputedStyle(search).zIndex) || 0 : null

    // Sample points across the menu header (name row) — must hit the menu, not search.
    const samples = [
      { x: menuRect.left + menuRect.width / 2, y: menuRect.top + 18 },
      { x: menuRect.left + 24, y: menuRect.top + 28 },
      { x: menuRect.right - 24, y: menuRect.top + 28 },
    ].map(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      const inMenu = !!(el && (el === menu || menu.contains(el)))
      const inSearch = !!(
        el &&
        (el.closest('[data-testid="match-search"]') ||
          el.closest('[data-testid="hero-search"]') ||
          el.closest('.describe-search') ||
          el.closest('[data-testid="describe-search-submit"]'))
      )
      return {
        x,
        y,
        inMenu,
        inSearch,
        tag: el?.tagName || null,
        testid: el?.getAttribute?.('data-testid') || null,
      }
    })

    return {
      ok: samples.every((s) => s.inMenu && !s.inSearch),
      menuZ,
      shellZ,
      searchZ,
      shellAboveSearch: shellZ == null || searchZ == null ? null : shellZ > searchZ,
      samples,
      menuTop: menuRect.top,
      menuHeight: menuRect.height,
    }
  })
}

async function checkRoute(page, { path, label, shotName, viewport }) {
  await page.setViewportSize(viewport)
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  if (viewport.width < 900) {
    // Mobile: open hamburger, then assert mobile account links (no absolute dropdown).
    const menuBtn = page.locator('.browse-hc-menu-btn, [aria-label="Menu"], [aria-label="Open menu"]').first()
    if (await menuBtn.count()) {
      await menuBtn.click()
      await page.getByTestId('mobile-account-links').waitFor({ state: 'visible', timeout: 5000 })
      record(true, `${label}: mobile account links visible`)
      await shot(page, shotName)
      return
    }
  }

  await openDesktopMenu(page)
  const m = await measureStacking(page)
  record(!!m.ok, `${label}: menu paints above page content`, m)
  if (m.shellAboveSearch != null) {
    record(!!m.shellAboveSearch, `${label}: header shell z-index above search`, {
      shellZ: m.shellZ,
      searchZ: m.searchZ,
    })
  }
  const nameVisible = await page.locator('[data-testid="account-menu"] .name').first().isVisible()
  record(nameVisible, `${label}: menu name row visible`)
  await shot(page, shotName)
  await page.keyboard.press('Escape')
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await checkRoute(page, {
    path: '/match?zip=95131&intent=jobs',
    label: 'match-jobs-1440',
    shotName: 'match-jobs-1440x900-menu-above-search.png',
    viewport: { width: 1440, height: 900 },
  })

  await checkRoute(page, {
    path: '/match?zip=95131&intent=jobs',
    label: 'match-jobs-390',
    shotName: 'match-jobs-390x844-menu-open.png',
    viewport: { width: 390, height: 844 },
  })

  await checkRoute(page, {
    path: '/browse',
    label: 'browse-1440',
    shotName: 'browse-1440x900-menu-open.png',
    viewport: { width: 1440, height: 900 },
  })

  // Landing uses solid white sticky nav; open account menu and ensure it is not under hero search.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('landing-nav').waitFor({ state: 'visible', timeout: 15000 })
  await openDesktopMenu(page)
  const landing = await measureStacking(page)
  record(!!landing.ok, 'landing-1440: menu paints above page content', landing)
  await shot(page, 'landing-1440x900-menu-open.png')
  await page.keyboard.press('Escape')

  // Job detail: first open request from seed if present
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' })
  const jobLink = page.locator('a[href^="/requests/"]').first()
  if ((await jobLink.count()) > 0) {
    const href = await jobLink.getAttribute('href')
    await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' })
    await openDesktopMenu(page)
    const job = await measureStacking(page)
    record(!!job.ok, 'job-detail-1440: menu paints above page content', job)
    await shot(page, 'job-detail-1440x900-menu-open.png')
  } else {
    record(true, 'job-detail-1440: skipped (no request link in demo browse)')
  }

  await browser.close()
  writeFileSync(join(LOCAL, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
  if (!summary.ok) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
