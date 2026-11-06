#!/usr/bin/env node
/**
 * Playwright visual QA for enterprise /browse + top nav refactor.
 * Screenshots → /opt/cursor/artifacts/browse-enterprise-visual-qa/
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/browse-enterprise-visual-qa'
const LOCAL = '/workspace/artifacts/browse-enterprise-visual-qa'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })
mkdirSync(LOCAL, { recursive: true })

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, fullPage: false })
  await page.screenshot({ path: join(LOCAL, name), fullPage: false })
  console.log(`saved ${path}`)
  return path
}

async function warmDemo(page) {
  await page.goto(`${BASE}/browse`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => !!localStorage.getItem('beam-demo-v1'), null, {
    timeout: 20000,
  })
}

async function seedHelperBannerOneCard(page) {
  await warmDemo(page)
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    const people = state.people || []
    const self = people.find((p) => p.id === me) || people[0]
    if (self) {
      self.accountRole = 'helper'
      self.isHelper = false
      self.skills = []
      self.name = self.name || 'Kuni'
      self.city = self.city || 'San Jose'
      self.stateCode = self.stateCode || 'CA'
      self.locationLabel = self.locationLabel || 'San Jose, CA'
    }
    // Keep a single open request with open budget + zero-review requester
    const open = (state.requests || []).filter((r) => r.status === 'open')
    const keep = open[0]
    if (keep) {
      keep.title = 'I need to help with moving out of my apartment'
      keep.details =
        'I need to help with moving out of my apartment. Looking for careful help with boxes and furniture.'
      keep.category = 'moving'
      keep.budget = 0
      keep.budgetType = 'open'
      keep.when = 'this-week'
      keep.whenLabel = 'Fri, Nov 20 · Afternoon'
      keep.locationLabel = 'San Jose, California'
      keep.createdAt = new Date(Date.now() - 3 * 3600 * 1000).toISOString()
      const requester = people.find((p) => p.id === keep.requesterId)
      if (requester) {
        requester.name = 'Yo Chen'
        requester.rating = 0
        requester.reviewCount = 0
      }
      state.requests = [keep, ...(state.requests || []).filter((r) => r.id !== keep.id && r.status !== 'open')]
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('[data-testid="helper-setup-callout"]', { timeout: 15000 })
  await page.waitForSelector('text=Browse Local Jobs')
}

async function seedMultiCards(page) {
  await warmDemo(page)
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    const self = (state.people || []).find((p) => p.id === me)
    if (self) {
      self.accountRole = 'seeker'
      self.isHelper = false
      self.city = self.city || 'San Jose'
      self.locationLabel = self.locationLabel || 'San Jose, CA'
    }
    const cats = ['moving', 'cleaning', 'handyman', 'petcare', 'tutoring', 'events']
    const base = Date.now()
    const extras = Array.from({ length: 8 }, (_, i) => ({
      id: `req-qa-enterprise-${i}`,
      title: [
        'Help moving a couch upstairs',
        'Deep clean after guests leave',
        'Assemble IKEA bookshelf',
        'Walk two friendly dogs',
        'Set up a new Wi‑Fi router',
        'Weekend birthday photo help',
        'Pack kitchen boxes carefully',
        'Mount a TV on the wall',
      ][i],
      details:
        'Neighborhood task with clear scope, flexible timing, and upfront budget for a reviewed helper.',
      category: cats[i % cats.length],
      neighborhood: 'downtown',
      locationLabel: 'San Jose, California',
      when: i % 2 === 0 ? 'asap' : 'today',
      whenLabel: i % 2 === 0 ? 'ASAP' : 'Today',
      budget: i % 3 === 0 ? 0 : 45 + i * 10,
      budgetType: i % 3 === 0 ? 'open' : 'fixed',
      radiusMiles: 5,
      status: 'open',
      requesterId: (state.people || []).find((p) => p.id !== me)?.id || 'p-maya',
      image:
        i % 2 === 0
          ? 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1200&q=80'
          : 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
      createdAt: new Date(base - i * 3600 * 1000).toISOString(),
    }))
    const existingOpen = (state.requests || []).filter((r) => r.status === 'open')
    state.requests = [
      ...extras,
      ...existingOpen.filter((r) => !String(r.id).startsWith('req-qa-enterprise-')),
      ...(state.requests || []).filter((r) => r.status !== 'open'),
    ]
    // Ensure helpers have ratings so trending rail is populated
    for (const p of state.people || []) {
      if (p.id === me) continue
      if (!(p.rating > 0 && p.reviewCount > 0)) {
        p.rating = 4.9
        p.reviewCount = 12
      }
      p.isHelper = true
      if (!p.skills?.length) p.skills = ['moving', 'cleaning']
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('text=Browse Local Jobs')
  await page.waitForSelector('[data-testid="browse-feed-scroll"] a[href^="/requests/"]')
}

const report = { shots: [], metrics: {}, ok: true }

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    // 01 — helper banner + 1 card @1440×900
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedHelperBannerOneCard(page)
      await page.waitForTimeout(500)
      const m = await page.evaluate(() => {
        const feedScroll = document.querySelector('[data-testid="browse-feed-scroll"]')
        const filters = document.querySelector('[data-testid="browse-filters-sidebar"]')
        const trending = document.querySelector('[data-testid="browse-trending-helpers"]')
        const banner = document.querySelector('[data-testid="helper-setup-callout"]')
        const cards = [
          ...document.querySelectorAll('[data-testid="browse-feed-scroll"] a[href^="/requests/"]'),
        ]
        return {
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight,
          overflowY: feedScroll ? getComputedStyle(feedScroll).overflowY : null,
          hasBanner: !!banner,
          filtersTop: filters?.getBoundingClientRect().top ?? null,
          trendingTop: trending?.getBoundingClientRect().top ?? null,
          cardCount: cards.length,
          hasZeroStar: /★\s*0\.0/.test(document.body.innerText || ''),
          hasNewBadge: /New/.test(document.body.innerText || ''),
        }
      })
      assert.equal(m.scrollY, 0, '01 window.scrollY === 0')
      assert.ok(m.scrollHeight <= m.clientHeight + 1, '01 no document overflow')
      assert.ok(m.hasBanner, '01 helper banner visible')
      assert.equal(m.hasZeroStar, false, '01 no ★ 0.0')
      report.metrics['01'] = m
      await shot(page, '01-desktop-1440x900-signed-in-helper-banner-1card.png')
      report.shots.push('01-desktop-1440x900-signed-in-helper-banner-1card.png')
      await page.close()
    }

    // 02 — multi cards top
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedMultiCards(page)
      await page.waitForTimeout(500)
      const m = await page.evaluate(() => {
        const cards = [
          ...document.querySelectorAll('[data-testid="browse-feed-scroll"] a[href^="/requests/"]'),
        ]
        const boxes = cards.slice(0, 3).map((el) => {
          const r = el.getBoundingClientRect()
          return { top: Math.round(r.top), left: Math.round(r.left) }
        })
        const trendingRows = document.querySelectorAll(
          '[data-testid="browse-trending-helpers"] a[href^="/people/"]',
        ).length
        return {
          cardCount: cards.length,
          boxes,
          trendingRows,
          hasZeroStar: /★\s*0\.0/.test(document.body.innerText || ''),
          cols3:
            boxes.length >= 3 &&
            Math.abs(boxes[0].top - boxes[1].top) <= 2 &&
            Math.abs(boxes[1].top - boxes[2].top) <= 2 &&
            boxes[0].left < boxes[1].left &&
            boxes[1].left < boxes[2].left,
        }
      })
      assert.ok(m.cardCount >= 6, `02 expected 6+ cards, got ${m.cardCount}`)
      assert.equal(m.cols3, true, '02 three cards per row')
      assert.ok(m.trendingRows > 0, '02 trending helpers populated')
      assert.equal(m.hasZeroStar, false, '02 no ★ 0.0')
      report.metrics['02'] = m
      await shot(page, '02-desktop-1440x900-signed-in-multi-cards-top.png')
      report.shots.push('02-desktop-1440x900-signed-in-multi-cards-top.png')

      // 03 — scrolled feed; side columns pinned
      const before = await page.evaluate(() => {
        const filters = document.querySelector('[data-testid="browse-filters-sidebar"]')
        const trending = document.querySelector('[data-testid="browse-trending-helpers"]')
        const card = document.querySelector(
          '[data-testid="browse-feed-scroll"] a[href^="/requests/"]',
        )
        return {
          filtersTop: filters?.getBoundingClientRect().top ?? null,
          trendingTop: trending?.getBoundingClientRect().top ?? null,
          cardTop: card?.getBoundingClientRect().top ?? null,
        }
      })
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="browse-feed-scroll"]')
        if (feed) feed.scrollTop = 260
      })
      await page.waitForTimeout(250)
      const after = await page.evaluate(() => {
        const filters = document.querySelector('[data-testid="browse-filters-sidebar"]')
        const trending = document.querySelector('[data-testid="browse-trending-helpers"]')
        const card = document.querySelector(
          '[data-testid="browse-feed-scroll"] a[href^="/requests/"]',
        )
        const feed = document.querySelector('[data-testid="browse-feed-scroll"]')
        return {
          filtersTop: filters?.getBoundingClientRect().top ?? null,
          trendingTop: trending?.getBoundingClientRect().top ?? null,
          cardTop: card?.getBoundingClientRect().top ?? null,
          scrollTop: feed?.scrollTop ?? 0,
          windowScrollY: window.scrollY,
        }
      })
      assert.equal(after.windowScrollY, 0, '03 window still not scrolled')
      assert.ok(after.scrollTop >= 200, `03 feed scrolled (${after.scrollTop})`)
      assert.ok(
        Math.abs(before.filtersTop - after.filtersTop) <= 1,
        `03 filters pinned (${before.filtersTop} → ${after.filtersTop})`,
      )
      assert.ok(
        Math.abs(before.trendingTop - after.trendingTop) <= 1,
        `03 trending pinned (${before.trendingTop} → ${after.trendingTop})`,
      )
      assert.ok(
        after.cardTop < before.cardTop - 20,
        `03 cards moved (${before.cardTop} → ${after.cardTop})`,
      )
      report.metrics['03'] = { before, after }
      await shot(page, '03-desktop-1440x900-signed-in-multi-cards-scrolled.png')
      report.shots.push('03-desktop-1440x900-signed-in-multi-cards-scrolled.png')
      await page.close()
    }

    // 04 — helpers tab 3-col
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await seedMultiCards(page)
      await page.goto(`${BASE}/browse?tab=people`, { waitUntil: 'networkidle' })
      await page.waitForSelector('text=Browse Local Jobs')
      await page.waitForTimeout(400)
      const m = await page.evaluate(() => {
        const cards = [
          ...document.querySelectorAll('[data-testid="browse-feed-scroll"] a[href^="/people/"]'),
        ]
        const boxes = cards.slice(0, 3).map((el) => {
          const r = el.getBoundingClientRect()
          return { top: Math.round(r.top), left: Math.round(r.left) }
        })
        return {
          cardCount: cards.length,
          cols3:
            boxes.length >= 3 &&
            Math.abs(boxes[0].top - boxes[1].top) <= 2 &&
            boxes[0].left < boxes[1].left &&
            boxes[1].left < boxes[2].left,
          hasZeroStar: /★\s*0\.0/.test(document.body.innerText || ''),
        }
      })
      assert.ok(m.cardCount >= 3, '04 helpers cards present')
      assert.equal(m.cols3, true, '04 helpers 3-col')
      assert.equal(m.hasZeroStar, false, '04 no ★ 0.0')
      report.metrics['04'] = m
      await shot(page, '04-desktop-1440x900-helpers-tab-3col.png')
      report.shots.push('04-desktop-1440x900-helpers-tab-3col.png')
      await page.close()
    }

    // 05 — wide 1680×960
    {
      const page = await browser.newPage({ viewport: { width: 1680, height: 960 } })
      await seedMultiCards(page)
      await page.waitForTimeout(400)
      const m = await page.evaluate(() => ({
        scrollY: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        has3col: !!document.querySelector('[data-testid="browse-3col-grid"]'),
      }))
      assert.equal(m.scrollY, 0, '05 window.scrollY === 0')
      assert.ok(m.scrollHeight <= m.clientHeight + 1, '05 no document overflow @1680')
      report.metrics['05'] = m
      await shot(page, '05-desktop-1680x960-wide.png')
      report.shots.push('05-desktop-1680x960-wide.png')
      await page.close()
    }

    // 06 — guest browse (demo still uses app chrome; capture public landing chrome via live guest when possible)
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle' })
      await page.waitForSelector('text=Browse Local Jobs')
      // In demo mode this is signed-in chrome; still capture for layout parity.
      // Prefer LandingNav if a live guest server is pointed via GUEST_BASE_URL.
      const guestBase = process.env.GUEST_BASE_URL
      if (guestBase) {
        await page.goto(`${guestBase}/browse`, { waitUntil: 'networkidle' })
        await page.waitForSelector('text=Browse Local Jobs')
      }
      await page.waitForTimeout(400)
      await shot(page, '06-desktop-1440x900-guest.png')
      report.shots.push('06-desktop-1440x900-guest.png')
      await page.close()
    }

    // 07 — tablet
    {
      const page = await browser.newPage({ viewport: { width: 768, height: 1024 } })
      await seedMultiCards(page)
      await page.waitForTimeout(400)
      const m = await page.evaluate(() => ({
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        filtersHidden:
          getComputedStyle(
            document.querySelector('[data-testid="browse-filters-sidebar"]'),
          ).display === 'none',
      }))
      assert.equal(m.overflowX, false, '07 no x-overflow')
      assert.equal(m.filtersHidden, true, '07 filters sidebar hidden below xl')
      report.metrics['07'] = m
      await shot(page, '07-tablet-768x1024.png')
      report.shots.push('07-tablet-768x1024.png')
      await page.close()
    }

    // 08 — mobile
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      await seedMultiCards(page)
      await page.waitForTimeout(400)
      const m = await page.evaluate(() => ({
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        bottomNav: !!document.querySelector('[data-testid="bottom-dock"]'),
      }))
      assert.equal(m.overflowX, false, '08 no x-overflow')
      report.metrics['08'] = m
      await shot(page, '08-mobile-390x844.png')
      report.shots.push('08-mobile-390x844.png')
      await page.close()
    }

    writeFileSync(join(OUT, 'summary.json'), JSON.stringify(report, null, 2))
    writeFileSync(join(LOCAL, 'summary.json'), JSON.stringify(report, null, 2))
    console.log('browse-enterprise-visual-qa passed')
  } catch (err) {
    report.ok = false
    report.error = String(err?.stack || err)
    writeFileSync(join(OUT, 'summary.json'), JSON.stringify(report, null, 2))
    throw err
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
