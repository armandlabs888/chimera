#!/usr/bin/env node
/**
 * Playwright visual QA for Beam Messages 2-column split.
 * Saves screenshots to /opt/cursor/artifacts/messages-2col-visual-qa/
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const STORAGE_KEY = 'beam-demo-v1'
const OUT = '/opt/cursor/artifacts/messages-2col-visual-qa'
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

async function assertTwoPane(page) {
  const probe = await page.evaluate(() => {
    const workspace = document.querySelector('[data-testid="messages-workspace"]')
    const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
    const conversation = document.querySelector('[data-testid="messages-conversation"]')
    const rail = document.querySelector('[data-testid="messages-task-rail"]')
    const ir = inbox?.getBoundingClientRect()
    const cr = conversation?.getBoundingClientRect()
    const workspaceWidth = workspace?.getBoundingClientRect().width ?? 0
    return {
      hasRail: Boolean(rail),
      twoPane:
        Boolean(ir && cr) &&
        ir.width >= 280 &&
        ir.width <= 380 &&
        cr.width >= 600 &&
        Math.abs(ir.top - cr.top) < 8 &&
        cr.left >= ir.right - 4 &&
        Math.abs(ir.width + cr.width - workspaceWidth) <= 6,
      inboxWidth: ir?.width ?? 0,
      conversationWidth: cr?.width ?? 0,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }
  })
  assert.equal(probe.hasRail, false, 'no messages-task-rail')
  assert.ok(probe.twoPane, `2-pane split failed: ${JSON.stringify(probe)}`)
  assert.equal(probe.overflow, false, 'no horizontal overflow')
  return probe
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    // 01 — Desktop requester incoming offer
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/messages/th-1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-incoming-offer"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="messages-composer"]', { state: 'visible' })
    await assertTwoPane(page)
    assert.equal(
      await page.evaluate(() => /\bPRICE\b/.test(document.body.innerText)),
      false,
      'no uppercase PRICE',
    )
    await shot(page, '01-desktop-1440x900-messages-incoming-offer')

    // 02 — Helper compact send-offer bar
    const openThreadId = await seedOpenBudgetHelperThread(page)
    await page.waitForSelector('[data-testid="messages-send-offer"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="messages-offer-price"]', { state: 'visible' })
    const helperProbe = await page.evaluate(() => {
      const price = document.querySelector('[data-testid="messages-offer-price"]')
      const taskBar = document.querySelector('[data-testid="messages-task-bar"]')
      const rail = document.querySelector('[data-testid="messages-task-rail"]')
      return {
        priceValue: price?.value ?? null,
        hasDollar: Boolean(price?.parentElement?.textContent?.includes('$')),
        taskBarVisible: taskBar ? getComputedStyle(taskBar).display !== 'none' : false,
        hasRail: Boolean(rail),
        etaChips: [
          ...document.querySelectorAll('[data-testid="messages-send-offer"] button'),
        ].map((b) => b.textContent?.trim()),
      }
    })
    assert.equal(helperProbe.hasRail, false)
    assert.equal(helperProbe.taskBarVisible, true)
    assert.equal(helperProbe.priceValue, '', 'open-budget offer price empty')
    assert.equal(helperProbe.hasDollar, true)
    assert.ok(helperProbe.etaChips.includes('Within 30 min'))
    assert.ok(helperProbe.etaChips.includes('Send offer'))
    await assertTwoPane(page)
    await shot(page, '02-desktop-1440x900-messages-helper-send-offer')

    // 03 — Wide desktop proportions
    await page.setViewportSize({ width: 1680, height: 960 })
    await page.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-conversation"]')
    await assertTwoPane(page)
    await shot(page, '03-desktop-1680x960-messages-wide')

    // 04 — Tablet 2-column split
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(`${BASE_URL}/messages/${openThreadId}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-task-bar"]', { state: 'visible' })
    const tablet = await page.evaluate(() => {
      const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
      const conversation = document.querySelector('[data-testid="messages-conversation"]')
      const rail = document.querySelector('[data-testid="messages-task-rail"]')
      const ir = inbox?.getBoundingClientRect()
      const cr = conversation?.getBoundingClientRect()
      return {
        hasRail: Boolean(rail),
        inboxVisible: inbox ? getComputedStyle(inbox).display !== 'none' : false,
        sideBySide: Boolean(ir && cr) && Math.abs(ir.top - cr.top) < 8 && cr.left >= ir.right - 4,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.equal(tablet.hasRail, false)
    assert.equal(tablet.inboxVisible, true)
    assert.equal(tablet.sideBySide, true)
    assert.equal(tablet.overflow, false)
    await shot(page, '04-tablet-768x1024-messages')

    // 05 — Mobile inbox
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-inbox-rail"]', { state: 'visible' })
    const mobileInbox = await page.evaluate(() => {
      const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
      const conversation = document.querySelector('[data-testid="messages-conversation"]')
      return {
        inboxVisible: inbox ? getComputedStyle(inbox).display !== 'none' : false,
        conversationHidden: conversation
          ? getComputedStyle(conversation).display === 'none' ||
            !conversation.checkVisibility?.()
          : true,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.equal(mobileInbox.inboxVisible, true)
    assert.equal(mobileInbox.overflow, false)
    await shot(page, '05-mobile-390x844-inbox')

    // 06 — Mobile thread + composer
    await page.goto(`${BASE_URL}/messages/th-1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-conversation"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="messages-composer"]', { state: 'visible' })
    const mobileThread = await page.evaluate(() => {
      const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
      const composer = document.querySelector('[data-testid="messages-composer"]')
      const bottomNav = document.querySelector('[data-testid="bottom-nav"], nav[aria-label="Bottom"], [data-testid="app-bottom-nav"]')
      return {
        inboxHidden: inbox ? getComputedStyle(inbox).display === 'none' : true,
        composerVisible: composer ? getComputedStyle(composer).display !== 'none' : false,
        composerBottom: composer?.getBoundingClientRect().bottom ?? 0,
        bottomNavTop: bottomNav?.getBoundingClientRect().top ?? null,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.equal(mobileThread.inboxHidden, true)
    assert.equal(mobileThread.composerVisible, true)
    assert.equal(mobileThread.overflow, false)
    await shot(page, '06-mobile-390x844-thread')

    console.log('messages 2-col visual QA passed')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
