#!/usr/bin/env node
/**
 * Floating messages panel QA at 1440 / 390.
 * Screenshots: /opt/cursor/artifacts/messages-drawer/
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/messages-drawer'
mkdirSync(OUT, { recursive: true })

function trigger(page) {
  return page
    .locator(
      '[data-testid="messages-nav-trigger"]:visible, [data-testid="messages-mobile-trigger"]:visible',
    )
    .first()
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  console.log(`saved ${path}`)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/browse?demo=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="browse-v3"]', { timeout: 20000 })
    await page.waitForSelector('[data-testid="messages-nav-trigger"]', { timeout: 15000 })

    await trigger(page).click()
    await page.waitForSelector('[data-testid="messages-drawer"]')
    await page.waitForSelector('[data-testid="messages-thread-list"]')
    assert.match(page.url(), /messages=1/)

    const openBox = await page.evaluate(() => {
      const drawer = document.querySelector('[data-testid="messages-drawer"]')
      const dr = drawer?.getBoundingClientRect()
      return {
        width: dr?.width ?? 0,
        height: dr?.height ?? 0,
        rightGap: dr ? window.innerWidth - dr.right : -1,
        bottomGap: dr ? window.innerHeight - dr.bottom : -1,
        radius: drawer ? parseFloat(getComputedStyle(drawer).borderTopLeftRadius) : 0,
      }
    })
    assert.ok(openBox.width >= 760 && openBox.width <= 820, `width ${openBox.width}`)
    assert.ok(openBox.height >= 600 && openBox.height <= 680, `height ${openBox.height}`)
    assert.ok(openBox.rightGap >= 16 && openBox.rightGap <= 28, `right ${openBox.rightGap}`)
    assert.ok(openBox.bottomGap >= 16 && openBox.bottomGap <= 28, `bottom ${openBox.bottomGap}`)
    assert.ok(openBox.radius >= 14 && openBox.radius <= 18, `radius ${openBox.radius}`)

    await page.getByTestId('messages-thread-row-th-1').click()
    await page.waitForSelector('[data-testid="messages-conversation"]')
    assert.equal(await page.getByTestId('messages-popout').count(), 0, 'no pop-out button')
    assert.ok(await page.getByTestId('messages-settings').isVisible())
    assert.ok(await page.getByTestId('messages-minimize').isVisible())
    assert.ok(await page.getByTestId('messages-chat-close').isVisible())
    await shot(page, '1440-panel-open')

    await page.getByTestId('messages-minimize').click()
    await page.waitForSelector('[data-testid="messages-minibar"]')
    assert.equal(await page.getByTestId('messages-drawer').count(), 0)
    await shot(page, '1440-panel-min')

    await page.getByTestId('messages-minibar-restore').click()
    await page.waitForSelector('[data-testid="messages-drawer"]')
    await page.getByTestId('messages-chat-close').click()
    await page.waitForSelector('[data-testid="messages-drawer"]', { state: 'detached' })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/browse?demo=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="messages-mobile-trigger"]', { state: 'visible' })
    await trigger(page).click()
    await page.waitForSelector('[data-testid="messages-thread-list"]')
    await shot(page, '390-list')

    await page.getByTestId('messages-thread-row-th-1').click()
    await page.waitForSelector('[data-testid="messages-conversation"]')
    assert.equal(await page.getByTestId('messages-back').isVisible(), true)
    assert.equal(await page.getByTestId('messages-popout').count(), 0, 'no pop-out button on mobile')
    assert.ok(await page.getByTestId('messages-settings').isVisible())
    assert.ok(await page.getByTestId('messages-chat-close').isVisible())
    await shot(page, '390-chat')

    console.log('messages floating panel QA passed')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
