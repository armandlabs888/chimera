#!/usr/bin/env node
/**
 * Visual QA for the messages drawer (replaces the 2-column page workspace).
 * Screenshots: /opt/cursor/artifacts/messages-2col-visual-qa/
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/messages-2col-visual-qa'
mkdirSync(OUT, { recursive: true })

async function shot(page, name) {
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  console.log(`saved ${path}`)
}

async function assertNoSample(page) {
  const text = await page.locator('body').innerText()
  assert.equal(/Sample conversations/i.test(text), false)
  assert.equal(await page.getByTestId('messages-task-bar').count(), 0)
  assert.equal(await page.getByTestId('messages-incoming-offer').count(), 0)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/messages/th-1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="messages-conversation"]', { timeout: 20000 })
    await page.waitForSelector('[data-testid="messages-composer"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="messages-view-request"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="messages-job-strip"]', { state: 'visible' })
    const joined = await page.evaluate(() => {
      const list = document.querySelector('[data-testid="messages-list-panel"]')?.getBoundingClientRect()
      const chat = document.querySelector('[data-testid="messages-chat-panel"]')?.getBoundingClientRect()
      return Boolean(list && chat) && Math.abs(chat.right - list.left) <= 2 && chat.width >= 480 && list.width <= 400
    })
    assert.equal(joined, true, 'desktop chat and list are one connected panel')
    await assertNoSample(page)
    await shot(page, '01-desktop-1440x900-messages-populated')

    await page.goto(`${BASE_URL}/browse?messages=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="messages-list-panel"]')
    assert.equal(await page.getByTestId('messages-conversation').count(), 0)
    await shot(page, '02-desktop-1440x900-messages-list')

    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(`${BASE_URL}/browse?messages=1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-thread-list"]', { state: 'visible' })
    await shot(page, '04-tablet-768x1024-messages-inbox')
    await page.getByTestId('messages-thread-row-th-1').click()
    await page.waitForSelector('[data-testid="messages-conversation"]', { state: 'visible' })
    assert.equal(await page.getByTestId('messages-back').isVisible(), true)
    await shot(page, '04b-tablet-768x1024-messages-thread')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/browse?messages=1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="messages-mobile-trigger"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="messages-list-panel"]', { state: 'visible' })
    await shot(page, '05-mobile-390x844-inbox')
    await page.getByTestId('messages-thread-row-th-1').click()
    await page.waitForSelector('[data-testid="messages-composer"]', { state: 'visible' })
    const hiddenList = await page.evaluate(() => {
      const list = document.querySelector('[data-testid="messages-list-panel"]')
      return list ? getComputedStyle(list).display === 'none' : false
    })
    assert.equal(hiddenList, true)
    await shot(page, '06-mobile-390x844-thread')

    console.log('messages drawer visual QA passed')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
