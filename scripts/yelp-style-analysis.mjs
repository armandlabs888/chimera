#!/usr/bin/env node
/**
 * Capture Yelp reference screenshots and inspect computed styles.
 * Saves under /opt/cursor/artifacts/yelp-ref/
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const OUT = '/opt/cursor/artifacts/yelp-ref'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
]

const PAGES = [
  { key: 'home', url: 'https://www.yelp.com/' },
  {
    key: 'search',
    url: 'https://www.yelp.com/search?find_desc=plumbers&find_loc=San+Jose%2C+CA',
  },
]

async function dismissConsent(page) {
  const candidates = [
    'button:has-text("Accept")',
    'button:has-text("I Agree")',
    'button:has-text("Got it")',
    'button:has-text("OK")',
    '[aria-label="Close"]',
    'button:has-text("No thanks")',
  ]
  for (const sel of candidates) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout: 800 })) await el.click({ timeout: 1000 })
    } catch {
      /* ignore */
    }
  }
}

async function pickBusinessUrl(page) {
  const href = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href*="/biz/"]')]
    const hit = links.find((a) => {
      const h = a.getAttribute('href') || ''
      return h.includes('/biz/') && !h.includes('?') && a.offsetParent
    })
    return hit ? hit.href : null
  })
  return href
}

function styleProbeScript() {
  return () => {
    const pick = (sel) => document.querySelector(sel)
    const cs = (el) => (el ? getComputedStyle(el) : null)
    const pack = (el) => {
      if (!el) return null
      const s = cs(el)
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || '').slice(0, 80).replace(/\s+/g, ' ').trim(),
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        letterSpacing: s.letterSpacing,
        lineHeight: s.lineHeight,
        color: s.color,
        backgroundColor: s.backgroundColor,
        border: s.border,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow,
        padding: s.padding,
        margin: s.margin,
        height: `${Math.round(r.height)}px`,
        width: `${Math.round(r.width)}px`,
      }
    }

    const body = document.body
    const h1 = pick('h1')
    const h2 = pick('h2')
    const h3 = pick('h3')
    const header =
      pick('header') ||
      pick('[data-testid="header"]') ||
      pick('nav') ||
      pick('[role="banner"]')
    const searchInput =
      pick('input[name="find_desc"]') ||
      pick('input[placeholder*="plumbers" i]') ||
      pick('input[type="search"]') ||
      pick('input[aria-label*="Search" i]') ||
      pick('form input[type="text"]')
    const searchBtn =
      pick('button[type="submit"]') ||
      pick('form button') ||
      [...document.querySelectorAll('button')].find((b) => /search/i.test(b.textContent || ''))
    const card =
      pick('[data-testid="serp-ia-card"]') ||
      pick('[class*="container__"]') ||
      pick('li[class*="border"]') ||
      [...document.querySelectorAll('li, article, div')].find((el) => {
        const t = el.innerText || ''
        return t.includes('reviews') && t.length < 800 && el.querySelector('img') && el.querySelector('a')
      })
    const img = card?.querySelector('img') || pick('img')
    const star =
      pick('[aria-label*="star" i]') ||
      pick('[class*="star"]') ||
      pick('svg[class*="star" i]')
    const chip =
      [...document.querySelectorAll('a, span, button')].find((el) => {
        const s = getComputedStyle(el)
        const r = parseFloat(s.borderRadius) || 0
        return (
          r >= 10 &&
          el.offsetHeight > 20 &&
          el.offsetHeight < 44 &&
          (el.innerText || '').length > 0 &&
          (el.innerText || '').length < 40
        )
      }) || null
    const primaryBtn =
      [...document.querySelectorAll('button, a')].find((el) => {
        const s = getComputedStyle(el)
        const bg = s.backgroundColor
        return (
          el.offsetHeight >= 36 &&
          el.offsetHeight <= 56 &&
          bg &&
          bg !== 'rgba(0, 0, 0, 0)' &&
          bg !== 'transparent' &&
          /rgb\(/.test(bg) &&
          !/255,\s*255,\s*255/.test(bg)
        )
      }) || null
    const listRow =
      pick('[data-testid="serp-ia-card"]') ||
      [...document.querySelectorAll('li')].find((li) => {
        const t = li.innerText || ''
        return /reviews|★|stars/i.test(t) && li.querySelector('img') && li.offsetHeight > 80
      })

    const divider = [...document.querySelectorAll('hr, [class*="divider"], [class*="border"]')].find(
      (el) => {
        const s = getComputedStyle(el)
        return (
          (el.tagName === 'HR' || parseFloat(s.borderTopWidth) >= 1) &&
          el.offsetWidth > 200
        )
      },
    )

    return {
      url: location.href,
      title: document.title,
      body: pack(body),
      h1: pack(h1),
      h2: pack(h2),
      h3: pack(h3),
      header: pack(header),
      searchInput: pack(searchInput),
      searchBtn: pack(searchBtn),
      card: pack(card),
      photo: img
        ? {
            ...pack(img),
            naturalRatio:
              img.naturalWidth && img.naturalHeight
                ? +(img.naturalWidth / img.naturalHeight).toFixed(3)
                : null,
            displayRatio:
              img.clientWidth && img.clientHeight
                ? +(img.clientWidth / img.clientHeight).toFixed(3)
                : null,
          }
        : null,
      star: pack(star?.closest?.('span, div, a') || star),
      chip: pack(chip),
      primaryBtn: pack(primaryBtn),
      listRow: pack(listRow),
      divider: pack(divider),
      linkSample: pack(pick('a')),
    }
  }
}

async function capturePage(browser, pageDef, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'en-US',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(45000)
  let navOk = true
  try {
    await page.goto(pageDef.url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(2500)
    await dismissConsent(page)
    await page.waitForTimeout(800)
  } catch (err) {
    navOk = false
    console.error(`nav fail ${pageDef.key} ${viewport.name}:`, err.message)
  }

  const shotName = `yelp-${pageDef.key}-${viewport.name}.png`
  await page.screenshot({ path: join(OUT, shotName), fullPage: false })
  let styles = null
  try {
    styles = await page.evaluate(styleProbeScript())
  } catch (err) {
    styles = { error: err.message }
  }

  await context.close()
  return { shotName, styles, navOk, url: pageDef.url, viewport: viewport.name }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const report = { capturedAt: new Date().toISOString(), pages: [] }

  try {
    for (const vp of VIEWPORTS) {
      for (const p of PAGES) {
        console.log('capturing', p.key, vp.name)
        const result = await capturePage(browser, p, vp)
        report.pages.push(result)
      }
    }

    // Business page: discover from search desktop
    {
      const vp = VIEWPORTS[0]
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale: 'en-US',
      })
      const page = await context.newPage()
      page.setDefaultTimeout(45000)
      let bizUrl = null
      try {
        await page.goto(PAGES[1].url, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.waitForTimeout(2500)
        await dismissConsent(page)
        bizUrl = await pickBusinessUrl(page)
      } catch (err) {
        console.error('biz discover fail', err.message)
      }
      await context.close()

      if (!bizUrl) {
        bizUrl = 'https://www.yelp.com/biz/roto-rooter-plumbing-and-water-cleanup-san-jose-5'
      }
      console.log('biz url', bizUrl)

      for (const v of VIEWPORTS) {
        const result = await capturePage(browser, { key: 'biz', url: bizUrl }, v)
        report.pages.push(result)
      }
    }
  } finally {
    await browser.close()
  }

  writeFileSync(join(OUT, 'yelp-computed-styles.json'), JSON.stringify(report, null, 2))
  console.log('wrote', join(OUT, 'yelp-computed-styles.json'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
