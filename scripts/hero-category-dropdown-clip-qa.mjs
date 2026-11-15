/**
 * Verify guest hero category dropdown is not clipped by the hero section.
 * Screenshots → /opt/cursor/artifacts/
 *
 * Requires live guest mode (no demo): NEXT_PUBLIC_SUPABASE_* set, no DEMO_MODE.
 */
import { chromium } from 'playwright'
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BEAM_BASE_URL || 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts'
const LOCAL_OUT = '/workspace/artifacts'
mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL_OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
]

const summary = { ok: true, checks: [], failures: [], shots: [] }

function record(ok, msg, detail = null) {
  const entry = { ok, msg, detail }
  summary.checks.push(entry)
  if (!ok) {
    summary.ok = false
    summary.failures.push(msg)
    console.error(`FAIL  ${msg}${detail ? ` — ${JSON.stringify(detail)}` : ''}`)
  } else {
    console.log(`PASS  ${msg}${detail ? ` — ${JSON.stringify(detail)}` : ''}`)
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
const tmpDir = '/tmp/beam-hero-category-dropdown'
mkdirSync(tmpDir, { recursive: true })

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 })

    const trigger = page.getByTestId('hero-category-trigger')
    await trigger.waitFor({ state: 'visible', timeout: 15000 })
    await trigger.click()
    const list = page.getByTestId('hero-category-listbox')
    await list.waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300)

    const metrics = await page.evaluate(() => {
      const listEl = document.querySelector('[data-testid="hero-category-listbox"]')
      const hero = document.querySelector('section.landing-hero-photo')
      const triggerEl = document.querySelector('[data-testid="hero-category-trigger"]')
      if (!listEl || !hero || !triggerEl) return { ok: false, reason: 'missing nodes' }
      const lr = listEl.getBoundingClientRect()
      const hr = hero.getBoundingClientRect()
      const style = getComputedStyle(listEl)
      const options = [...listEl.querySelectorAll('[role="option"]')].map((el) => {
        const r = el.getBoundingClientRect()
        return {
          text: (el.textContent || '').trim().slice(0, 40),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          inViewport: r.top >= 0 && r.bottom <= window.innerHeight + 0.5,
        }
      })
      return {
        ok: true,
        position: style.position,
        listInHero: hero.contains(listEl),
        listTop: Math.round(lr.top),
        listBottom: Math.round(lr.bottom),
        heroBottom: Math.round(hr.bottom),
        heroOverflow: {
          x: getComputedStyle(hero).overflowX,
          y: getComputedStyle(hero).overflowY,
        },
        options,
        labels: options.map((o) => o.text),
      }
    })

    record(metrics.ok, `${vp.name}: dropdown nodes present`, metrics)
    record(metrics.position === 'fixed', `${vp.name}: dropdown uses fixed positioning`, {
      position: metrics.position,
    })
    record(metrics.listInHero === false, `${vp.name}: dropdown portaled outside hero`, {
      listInHero: metrics.listInHero,
    })
    record(
      Array.isArray(metrics.labels) &&
        metrics.labels.includes('All categories') &&
        metrics.labels.includes('Junk Removal') &&
        metrics.labels.includes('Other') &&
        metrics.labels.includes('Pets'),
      `${vp.name}: all categories listed`,
      { labels: metrics.labels },
    )
    const listInViewport =
      typeof metrics.listBottom === 'number' &&
      typeof metrics.listTop === 'number' &&
      metrics.listTop >= 0 &&
      metrics.listBottom <= (vp.height ?? 900) + 0.5
    record(listInViewport, `${vp.name}: listbox fully within viewport`, {
      listTop: metrics.listTop,
      listBottom: metrics.listBottom,
      viewport: vp.height,
    })
    const allVisible = (metrics.options || []).every((o) => o.inViewport)
    record(allVisible, `${vp.name}: every option fully in viewport`, { options: metrics.options })

    // Click the last option to prove it is interactive.
    await page.getByRole('option', { name: 'Other' }).click()
    await list.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
    const label = await trigger.innerText()
    record(/Other/.test(label), `${vp.name}: selecting Other updates trigger`, { label })

    // Re-open for screenshot
    await trigger.click()
    await list.waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(200)
    const tmp = join(tmpDir, `hero-category-dropdown-after-${vp.name}.png`)
    await page.screenshot({ path: tmp, fullPage: false })
    saveShot(tmp, `hero-category-dropdown-after-${vp.name}.png`)

    await context.close()
  }

  // Signed-in / demo ZIP variant: no category popover, ZIP input present.
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.addInitScript(() => {
      try {
        localStorage.setItem('beam-demo-v1', JSON.stringify({ seeded: true }))
      } catch {}
    })
    await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle', timeout: 60000 })
    // Demo mode may still need DEMO flag at build; if live guest remains, skip softly.
    const zipCount = await page.getByTestId('hero-zip-input').count()
    const catCount = await page.getByTestId('hero-category-trigger').count()
    if (zipCount > 0) {
      record(catCount === 0, 'ZIP variant: no category trigger when ZIP shown')
      record(true, 'ZIP variant: hero ZIP input present')
      const tmp = join(tmpDir, 'hero-zip-variant-1440.png')
      await page.locator('[data-testid="hero-search-pill"]').screenshot({ path: tmp })
      saveShot(tmp, 'hero-zip-variant-1440.png')
    } else {
      record(true, 'ZIP variant check skipped (live guest still showing category)', {
        zipCount,
        catCount,
      })
    }
    await context.close()
  }
} catch (err) {
  summary.ok = false
  summary.error = String(err?.stack || err)
  console.error('FAIL', err)
} finally {
  await browser.close()
  writeFileSync(join(OUT, 'hero-category-dropdown-clip-qa.json'), JSON.stringify(summary, null, 2))
  writeFileSync(join(LOCAL_OUT, 'hero-category-dropdown-clip-qa.json'), JSON.stringify(summary, null, 2))
  if (!summary.ok) process.exit(1)
}
