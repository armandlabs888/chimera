#!/usr/bin/env node
/**
 * Playwright visual QA for Beam Messages marketplace workspace.
 * Saves screenshots to /opt/cursor/artifacts/messages-visual-qa/
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const STORAGE_KEY = 'beam-demo-v1'
const OUT = '/opt/cursor/artifacts/messages-visual-qa'
mkdirSync(OUT, { recursive: true })

async function seedOpenBudgetHelperThread(page) {
  // Warm demo storage, then mutate + hard reload so BeamContext rehydrates.
  await page.goto(`${BASE_URL}/messages`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="messages-workspace"]', { timeout: 15000 })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    const now = new Date().toISOString()
    const requestId = 'req-qa-open-budget'
    const threadId = 'th-qa-open'
    const otherId = 'p-maya'

    state.requests = (state.requests || []).filter((r) => r.id !== requestId)
    state.threads = (state.threads || []).filter((t) => t.id !== threadId)
    state.messages = (state.messages || []).filter((m) => m.threadId !== threadId)
    state.offers = (state.offers || []).filter((o) => o.requestId !== requestId)

    state.requests.unshift({
      id: requestId,
      title: 'I need to help with moving out of my apartment',
      details: 'Need help carrying boxes and a couch down two flights.',
      category: 'moving',
      neighborhood: 'east-austin',
      locationLabel: 'San Jose, California',
      when: 'asap',
      whenLabel: 'ASAP',
      budget: 0,
      budgetType: 'open',
      radiusMiles: 5,
      status: 'open',
      requesterId: otherId,
      image:
        'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1200&q=80',
      createdAt: now,
    })

    state.threads.unshift({
      id: threadId,
      requestId,
      participantIds: [me, otherId],
      lastMessageAt: now,
    })

    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.goto(`${BASE_URL}/messages/th-qa-open`, { waitUntil: 'networkidle' })
  return 'th-qa-open'
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  console.log(`saved ${path}`)
  return path
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    // Desktop wide — open-budget helper empty thread (screenshot scenario)
    await page.setViewportSize({ width: 1440, height: 900 })
    const openThreadId = await seedOpenBudgetHelperThread(page)
    await page.waitForSelector('[data-testid="messages-workspace"]')
    await page
      .locator('[data-testid="messages-task-rail"] [data-testid="messages-send-offer"]')
      .waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForSelector('[data-testid="messages-empty-starter"]', { state: 'visible' })

    const desktopOpen = await page.evaluate(() => {
      const workspace = document.querySelector('[data-testid="messages-workspace"]')
      const price = document.querySelector(
        '[data-testid="messages-task-rail"] [data-testid="messages-offer-price"]',
      )
      const avatar = document.querySelector(
        '[data-testid="messages-conversation"] header img, [data-testid="messages-conversation"] header span',
      )
      const heroOutside = [...document.querySelectorAll('h1')].some(
        (h) =>
          h.textContent?.trim() === 'Messages' &&
          !h.closest('[data-testid="messages-inbox-rail"]'),
      )
      const ws = workspace ? getComputedStyle(workspace) : null
      const rail = document.querySelector('[data-testid="messages-task-rail"]')
      const compact = document.querySelector('[data-testid="messages-compact-task-strip"]')
      return {
        radius: ws ? parseFloat(ws.borderTopLeftRadius) : -1,
        priceValue: price?.value ?? null,
        hasDollarPrefix: Boolean(
          price?.previousElementSibling?.textContent?.includes('$') ||
            price?.parentElement?.textContent?.includes('$'),
        ),
        avatarRounded: avatar ? getComputedStyle(avatar).borderRadius : '',
        heroOutside,
        railVisible: rail ? getComputedStyle(rail).display !== 'none' : false,
        compactHidden: compact ? getComputedStyle(compact).display === 'none' : true,
        etaChips: [
          ...document.querySelectorAll(
            '[data-testid="messages-task-rail"] [data-testid="messages-send-offer"] button',
          ),
        ].map((b) => b.textContent?.trim()),
        rawOpen: /\bopen\b/.test(
          (document.querySelector('[data-testid="messages-inbox-rail"]')?.innerText || '').toLowerCase(),
        ) &&
          !/\bOpen\b/.test(
            document.querySelector('[data-testid="messages-inbox-rail"]')?.innerText || '',
          ),
      }
    })

    assert.ok(desktopOpen.radius > 0 && desktopOpen.radius <= 12, `radius ${desktopOpen.radius}`)
    assert.equal(desktopOpen.priceValue, '', 'open-budget offer price empty')
    assert.equal(desktopOpen.hasDollarPrefix, true, '$ prefix present')
    assert.equal(desktopOpen.heroOutside, false, 'no external Messages hero')
    assert.equal(desktopOpen.railVisible, true, '3rd pane visible at 1440')
    assert.equal(desktopOpen.compactHidden, true, 'compact strip hidden on xl')
    assert.ok(desktopOpen.etaChips.includes('Within 30 min'))
    assert.ok(desktopOpen.etaChips.includes('Flexible'))
    assert.ok(
      desktopOpen.avatarRounded.includes('50%') || parseFloat(desktopOpen.avatarRounded) >= 999,
      `circular avatar, got ${desktopOpen.avatarRounded}`,
    )
    await shot(page, 'desktop-1440-open-budget-empty')

    // Desktop — seeded requester incoming offer + messages
    await page.goto(`${BASE_URL}/messages/th-1`, { waitUntil: 'networkidle' })
    await page
      .locator('[data-testid="messages-task-rail"] [data-testid="messages-incoming-offer"]')
      .waitFor({ state: 'visible', timeout: 15000 })
    await page.waitForSelector('[data-testid="messages-scroll"]')
    await shot(page, 'desktop-1440-th1-incoming-offer')

    // Desktop /messages auto-select
    await page.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-conversation"]')
    const autoSelected = await page.evaluate(() => {
      const anySelected = [...document.querySelectorAll('[data-testid="messages-thread-list"] a')].some(
        (a) => getComputedStyle(a).backgroundColor !== 'rgb(255, 255, 255)',
      )
      return {
        hasConversation: Boolean(document.querySelector('[data-testid="messages-conversation"]')),
        anySelected,
      }
    })
    assert.equal(autoSelected.hasConversation, true)
    assert.equal(autoSelected.anySelected, true)
    await shot(page, 'desktop-1440-inbox-autoselect')

    // Tablet 768 — 2-col + compact strip
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(`${BASE_URL}/messages/${openThreadId}`, { waitUntil: 'networkidle' })
    await page
      .locator('[data-testid="messages-compact-task-strip"]')
      .waitFor({ state: 'visible', timeout: 15000 })
    const tablet = await page.evaluate(() => {
      const rail = document.querySelector('[data-testid="messages-task-rail"]')
      const compact = document.querySelector('[data-testid="messages-compact-task-strip"]')
      const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
      return {
        railHidden: rail ? getComputedStyle(rail).display === 'none' : true,
        compactVisible: compact ? getComputedStyle(compact).display !== 'none' : false,
        inboxVisible: inbox ? getComputedStyle(inbox).display !== 'none' : false,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.equal(tablet.railHidden, true, 'task rail hidden on tablet')
    assert.equal(tablet.compactVisible, true, 'compact strip on tablet')
    assert.equal(tablet.inboxVisible, true, 'inbox visible on tablet')
    assert.equal(tablet.overflow, false, 'no horizontal overflow on tablet')
    await shot(page, 'tablet-768-thread-compact-strip')

    // Mobile inbox
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle' })
    await page
      .locator('[data-testid="messages-inbox-rail"]')
      .waitFor({ state: 'visible', timeout: 15000 })
    const mobileInbox = await page.evaluate(() => {
      const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
      return {
        inboxVisible: inbox ? getComputedStyle(inbox).display !== 'none' : false,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.equal(mobileInbox.inboxVisible, true)
    assert.equal(mobileInbox.overflow, false)
    await shot(page, 'mobile-390-inbox')

    // Mobile thread
    await page.goto(`${BASE_URL}/messages/${openThreadId}`, { waitUntil: 'networkidle' })
    await page
      .locator('[data-testid="messages-conversation"]')
      .waitFor({ state: 'visible', timeout: 15000 })
    const mobileThread = await page.evaluate(() => {
      const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
      const composer = document.querySelector('[data-testid="messages-composer"]')
      return {
        inboxHidden: inbox ? getComputedStyle(inbox).display === 'none' : true,
        composerPaddingBottom: composer ? parseFloat(getComputedStyle(composer).paddingBottom) : 0,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.equal(mobileThread.inboxHidden, true)
    assert.ok(mobileThread.composerPaddingBottom >= 10, 'composer has bottom padding')
    assert.equal(mobileThread.overflow, false)
    await shot(page, 'mobile-390-thread')

    console.log('messages visual QA passed')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
