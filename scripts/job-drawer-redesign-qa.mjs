#!/usr/bin/env node
/**
 * Job details attached-drawer QA + screenshots (desktop flush + mobile sheet).
 */
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts/job-drawer-redesign'
mkdirSync(OUT, { recursive: true })
mkdirSync('artifacts/job-drawer-redesign', { recursive: true })

async function shot(page, name) {
  const path = `${OUT}/${name}.png`
  await page.screenshot({ path, fullPage: false })
  await page.screenshot({ path: `artifacts/job-drawer-redesign/${name}.png`, fullPage: false })
  console.log(`saved ${path}`)
}

async function openFirstJob(page) {
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="browse-job-row"]', { timeout: 20000 })
  await page.locator('[data-testid="browse-job-row"]').first().click()
  await page.waitForURL(/[?&]job=/)
}

async function main() {
  const browser = await chromium.launch()

  // Desktop 1440
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await openFirstJob(page)
    await page.waitForSelector('[data-testid="browse-job-drawer"]')

    const metrics = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="browse-job-drawer"]')
      const r = drawer.getBoundingClientRect()
      const cs = getComputedStyle(drawer)
      const shell = document.querySelector('[data-browse-drawer]')
      const header = document.querySelector('.browse-float-header-shell')
      const hr = header?.getBoundingClientRect()
      const scrim = document.querySelector('[data-browse-job-layer="drawer"] > button[aria-label="Dismiss job details"]')
      const img = drawer.querySelector('img')
      const imgR = img?.getBoundingClientRect()
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        radius: cs.borderRadius,
        shadow: cs.boxShadow,
        borderLeft: cs.borderLeftColor,
        shellPad: shell ? getComputedStyle(shell).paddingRight : '',
        headerRight: hr ? window.innerWidth - hr.right : null,
        hasScrim: !!scrim,
        imgTop: imgR?.top ?? null,
        imgHeight: imgR?.height ?? null,
        imgLeft: imgR?.left ?? null,
        imgWidth: imgR?.width ?? null,
        drawerLeft: r.left,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })

    assert.ok(Math.abs(metrics.width - 500) < 2, `drawer width ${metrics.width}`)
    assert.equal(metrics.top, 0, 'flush top')
    assert.ok(Math.abs(metrics.right - 1440) < 2, 'flush right')
    assert.ok(Math.abs(metrics.bottom - 900) < 2, 'flush bottom')
    assert.ok(metrics.radius === '0px' || metrics.radius === '0', `no radius: ${metrics.radius}`)
    assert.ok(!metrics.shadow || metrics.shadow === 'none', `no shadow: ${metrics.shadow}`)
    assert.equal(metrics.hasScrim, false, 'no dimmed scrim')
    assert.equal(metrics.shellPad, '500px', 'list reflow padding')
    assert.ok(metrics.headerRight != null && metrics.headerRight >= 499, `header reflow ${metrics.headerRight}`)
    assert.ok(metrics.imgHeight >= 200 && metrics.imgHeight <= 220, `photo ~210 ${metrics.imgHeight}`)
    assert.ok(Math.abs(metrics.imgLeft - metrics.drawerLeft) < 2, 'photo full-bleed left')
    assert.ok(Math.abs(metrics.imgWidth - metrics.width) < 2, 'photo full-bleed width')
    assert.equal(metrics.overflow, false, 'no page overflow')

    await shot(page, 'desktop-1440')
    await page.locator('[data-testid="browse-job-drawer"]').screenshot({
      path: `${OUT}/drawer-closeup.png`,
    })
    await page.locator('[data-testid="browse-job-drawer"]').screenshot({
      path: 'artifacts/job-drawer-redesign/drawer-closeup.png',
    })
    console.log('saved drawer-closeup')

    await page.keyboard.press('Escape')
    await page.waitForSelector('[data-testid="browse-job-drawer"]', { state: 'detached' })
    await page.close()
  }

  // Mobile 390
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await openFirstJob(page)
    await page.waitForSelector('[data-testid="browse-job-sheet"]')

    const metrics = await page.evaluate(() => {
      const sheet = document.querySelector('[data-testid="browse-job-sheet"]')
      const r = sheet.getBoundingClientRect()
      const cs = getComputedStyle(sheet)
      const handle = sheet.querySelector('.rounded-full.bg-\\[\\#C3CCD9\\]')
      const img = sheet.querySelector('img, [data-testid="browse-category-thumb"]')
      const imgR = img?.getBoundingClientRect()
      const ask = document.querySelector('[data-testid="browse-ask-question"]')
      const offer = document.querySelector('[data-testid="browse-make-offer"]')
      return {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        radius: cs.borderRadius,
        hasHandle: !!handle,
        imgHeight: imgR?.height ?? null,
        askText: ask?.textContent?.trim() || '',
        offerW: offer?.getBoundingClientRect().width ?? 0,
        askW: ask?.getBoundingClientRect().width ?? 0,
      }
    })

    assert.equal(metrics.top, 0, 'mobile flush top')
    assert.equal(metrics.left, 0, 'mobile flush left')
    assert.ok(Math.abs(metrics.width - 390) < 2)
    assert.ok(Math.abs(metrics.height - 844) < 2)
    assert.ok(metrics.radius === '0px' || metrics.radius === '0')
    assert.equal(metrics.hasHandle, false, 'no drag handle')
    assert.ok(metrics.imgHeight >= 140 && metrics.imgHeight <= 160, `mobile photo ~148 ${metrics.imgHeight}`)
    assert.match(metrics.askText, /Ask a question/i)
    if (metrics.askW && metrics.offerW) {
      assert.ok(Math.abs(metrics.askW - metrics.offerW) < 8, 'equal-width CTAs')
    }

    await shot(page, 'mobile-390')
    await page.close()
  }

  // Mid width 1024 — still docked drawer
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 900 } })
    await openFirstJob(page)
    await page.waitForSelector('[data-testid="browse-job-drawer"]')
    const width = await page.locator('[data-testid="browse-job-drawer"]').evaluate((el) =>
      el.getBoundingClientRect().width,
    )
    assert.ok(Math.abs(width - 500) < 2)
    await shot(page, 'desktop-1024')
    await page.close()
  }

  console.log('job-drawer-redesign-qa passed')
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
