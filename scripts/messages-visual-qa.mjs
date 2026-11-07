#!/usr/bin/env node
/**
 * Playwright visual QA for Beam Messages 2 separate panels.
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

async function seedLongAndMultiThread(page) {
  await page.goto(`${BASE_URL}/messages`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="messages-workspace"]', { timeout: 15000 })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    const now = new Date().toISOString()
    const longBody =
      'This is a deliberately long coordination note so we can verify wrapping: parking is around the corner, the couch barely fits the stairwell turn, please bring straps, and text when you are two blocks away so I can unlock the lobby.'

    // Keep seeded th-1 / th-2, append an extra long message on th-1.
    state.messages = (state.messages || []).filter((m) => m.id !== 'msg-qa-long')
    state.messages.push({
      id: 'msg-qa-long',
      threadId: 'th-1',
      requestId: 'req-you-open',
      senderId: me,
      body: longBody,
      createdAt: now,
    })

    // Empty selection companion: ensure at least two threads remain.
    if (!(state.threads || []).some((t) => t.id === 'th-2')) {
      state.threads.push({
        id: 'th-2',
        requestId: 'req-5',
        participantIds: [me, 'p-devon'],
        lastMessageAt: now,
      })
    }

    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.goto(`${BASE_URL}/messages/th-1`, { waitUntil: 'networkidle' })
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  console.log(`saved ${path}`)
  return path
}

async function assertSeparatePanels(page) {
  const probe = await page.evaluate(() => {
    const workspace = document.querySelector('[data-testid="messages-workspace"]')
    const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
    const conversation = document.querySelector('[data-testid="messages-conversation"]')
    const conversationPanel = document.querySelector('[data-testid="messages-conversation-panel"]')
    const rail = document.querySelector('[data-testid="messages-task-rail"]')
    const taskBar = document.querySelector('[data-testid="messages-task-bar"]')
    const offerStrip = document.querySelector(
      '[data-testid="messages-incoming-offer"], [data-testid="messages-send-offer"], [data-testid="messages-offer-confirmed"]',
    )
    const ir = inbox?.getBoundingClientRect()
    const cr = (conversationPanel || conversation)?.getBoundingClientRect()
    const gutter = ir && cr ? cr.left - ir.right : 0
    return {
      hasRail: Boolean(rail),
      hasTaskBar: Boolean(taskBar),
      hasOfferStrip: Boolean(offerStrip),
      gutter,
      twoPane:
        Boolean(ir && cr) &&
        ir.width >= 280 &&
        ir.width <= 380 &&
        cr.width >= 560 &&
        Math.abs(ir.top - cr.top) < 8 &&
        gutter >= 12,
      inboxWidth: ir?.width ?? 0,
      conversationWidth: cr?.width ?? 0,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      joinedWrapper:
        workspace &&
        getComputedStyle(workspace).backgroundColor.replace(/\s/g, '') === 'rgb(255,255,255)' &&
        parseFloat(getComputedStyle(workspace).borderTopLeftRadius) > 0,
    }
  })
  assert.equal(probe.hasRail, false, 'no messages-task-rail')
  assert.equal(probe.hasTaskBar, false, 'no messages-task-bar')
  assert.equal(probe.hasOfferStrip, false, 'no offer/confirmed strips')
  assert.equal(probe.joinedWrapper, false, 'workspace is not a joined white card')
  assert.ok(probe.twoPane, `separate panels with gutter failed: ${JSON.stringify(probe)}`)
  assert.equal(probe.overflow, false, 'no horizontal overflow')
  return probe
}

async function assertNoJobChrome(page) {
  const bad = await page.evaluate(() => {
    const text = document.body.innerText
    return {
      confirmed: /Confirmed\s*·/.test(text),
      openToOffers: /Open to offers/i.test(text),
      etaToday: /ETA Today/i.test(text),
      priceCaps: /\bPRICE\b/.test(text),
    }
  })
  assert.equal(bad.confirmed, false, 'no Confirmed · strip')
  assert.equal(bad.openToOffers, false, 'no Open to offers')
  assert.equal(bad.etaToday, false, 'no ETA Today strip')
  assert.equal(bad.priceCaps, false, 'no PRICE label')
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    // 01 — Desktop populated thread
    await page.setViewportSize({ width: 1440, height: 900 })
    await seedLongAndMultiThread(page)
    await page.waitForSelector('[data-testid="messages-composer"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="messages-view-request"]', { state: 'visible' })
    await assertSeparatePanels(page)
    await assertNoJobChrome(page)
    await shot(page, '01-desktop-1440x900-messages-populated')

    // 02 — Empty / no-selection (clear selection by visiting inbox after wiping threads selection path)
    await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}')
      state.threads = []
      state.messages = []
      localStorage.setItem(key, JSON.stringify(state))
    }, STORAGE_KEY)
    await page.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-workspace"]')
    const emptyProbe = await page.evaluate(() => {
      const text = document.body.innerText
      const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
      const panel = document.querySelector('[data-testid="messages-conversation-panel"]')
      const ir = inbox?.getBoundingClientRect()
      const pr = panel?.getBoundingClientRect()
      return {
        emptyCopy: /No conversations yet/i.test(text),
        selectCopy: /Select a conversation/i.test(text),
        gutter: ir && pr ? pr.left - ir.right : 0,
        hasTaskBar: Boolean(document.querySelector('[data-testid="messages-task-bar"]')),
      }
    })
    assert.equal(emptyProbe.emptyCopy, true)
    assert.equal(emptyProbe.selectCopy, true)
    assert.ok(emptyProbe.gutter >= 12, `empty-state gutter ${emptyProbe.gutter}`)
    assert.equal(emptyProbe.hasTaskBar, false)
    await shot(page, '02-desktop-1440x900-messages-empty')

    // Restore demo seed via hard navigation after clearing storage key mutation
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
    await page.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-conversation"]')

    // 03 — Wide desktop proportions + long message
    await page.setViewportSize({ width: 1680, height: 960 })
    await seedLongAndMultiThread(page)
    await assertSeparatePanels(page)
    await assertNoJobChrome(page)
    await shot(page, '03-desktop-1680x960-messages-wide')

    // 04 — Tablet list-to-chat (not squeezed columns)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-inbox-rail"]', { state: 'visible' })
    const tabletInbox = await page.evaluate(() => {
      const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
      const conversation = document.querySelector('[data-testid="messages-conversation"]')
      return {
        inboxVisible: inbox ? getComputedStyle(inbox).display !== 'none' : false,
        conversationHidden: conversation
          ? getComputedStyle(conversation).display === 'none' || !conversation.checkVisibility?.()
          : true,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.equal(tabletInbox.inboxVisible, true)
    assert.equal(tabletInbox.conversationHidden, true)
    assert.equal(tabletInbox.overflow, false)
    await shot(page, '04-tablet-768x1024-messages-inbox')

    await page.goto(`${BASE_URL}/messages/th-1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-conversation"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="messages-composer"]', { state: 'visible' })
    const tabletThread = await page.evaluate(() => {
      const inbox = document.querySelector('[data-testid="messages-inbox-rail"]')
      const back = document.querySelector('a[aria-label="Back to inbox"]')
      return {
        inboxHidden: inbox ? getComputedStyle(inbox).display === 'none' : true,
        backVisible: back ? getComputedStyle(back).display !== 'none' : false,
        hasTaskBar: Boolean(document.querySelector('[data-testid="messages-task-bar"]')),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.equal(tabletThread.inboxHidden, true)
    assert.equal(tabletThread.backVisible, true)
    assert.equal(tabletThread.hasTaskBar, false)
    assert.equal(tabletThread.overflow, false)
    await shot(page, '04b-tablet-768x1024-messages-thread')

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
          ? getComputedStyle(conversation).display === 'none' || !conversation.checkVisibility?.()
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
      return {
        inboxHidden: inbox ? getComputedStyle(inbox).display === 'none' : true,
        composerVisible: composer ? getComputedStyle(composer).display !== 'none' : false,
        hasTaskBar: Boolean(document.querySelector('[data-testid="messages-task-bar"]')),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    assert.equal(mobileThread.inboxHidden, true)
    assert.equal(mobileThread.composerVisible, true)
    assert.equal(mobileThread.hasTaskBar, false)
    assert.equal(mobileThread.overflow, false)
    await assertNoJobChrome(page)
    await shot(page, '06-mobile-390x844-thread')

    console.log('messages 2-panel visual QA passed')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
