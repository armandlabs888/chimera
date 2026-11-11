#!/usr/bin/env node
/**
 * Messages drawer QA at 1440 / 1024 / 768 / 390 / 320.
 * Screenshots: /opt/cursor/artifacts/messages-drawer/
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const OUT = '/opt/cursor/artifacts/messages-drawer'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, mode: 'dual' },
  { name: '1024', width: 1024, height: 800, mode: 'dual' },
  { name: '768', width: 768, height: 1024, mode: 'single' },
  { name: '390', width: 390, height: 844, mode: 'sheet' },
  { name: '320', width: 320, height: 700, mode: 'sheet' },
]

function trigger(page) {
  return page.locator(
    '[data-testid="messages-nav-trigger"]:visible, [data-testid="messages-mobile-trigger"]:visible',
  ).first()
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: false })
  console.log(`saved ${path}`)
}

async function overflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  )
}

async function openList(page) {
  await trigger(page).click()
  await page.waitForSelector('[data-testid="messages-drawer"]')
  await page.waitForSelector('[data-testid="messages-thread-list"]')
}

async function assertDrawerBox(page, mode) {
  const box = await page.evaluate(() => {
    const drawer = document.querySelector('[data-testid="messages-drawer"]')
    const list = document.querySelector('[data-testid="messages-list-panel"]')
    const chat = document.querySelector('[data-testid="messages-chat-panel"]')
    const dr = drawer?.getBoundingClientRect()
    const lr = list?.getBoundingClientRect()
    const cr = chat?.getBoundingClientRect()
    const listStyle = list ? getComputedStyle(list) : null
    return {
      role: drawer?.getAttribute('role') || '',
      top: dr?.top ?? -1,
      rightGap: dr ? window.innerWidth - dr.right : -1,
      width: dr?.width ?? 0,
      height: dr?.height ?? 0,
      vw: window.innerWidth,
      radius: drawer ? parseFloat(getComputedStyle(drawer).borderTopLeftRadius) : 0,
      listWidth: lr?.width ?? 0,
      chatWidth: cr?.width ?? 0,
      listDisplay: listStyle?.display || 'missing',
      joined: Boolean(lr && cr) && Math.abs(cr.right - lr.left) <= 2,
      chatLeftOfList: Boolean(lr && cr) && cr.left < lr.left,
      browse: Boolean(document.querySelector('[data-testid="browse-v3"]')),
      sample: /Sample conversations/i.test(document.body.innerText),
      locked: getComputedStyle(document.body).overflow === 'hidden',
      focusInside: Boolean(
        document.activeElement &&
          document.querySelector('[data-testid="messages-drawer"]')?.contains(document.activeElement),
      ),
    }
  })
  assert.equal(box.role, 'dialog')
  assert.equal(box.sample, false, 'no sample footer')
  assert.equal(box.browse, true, 'page stays mounted')
  assert.equal(box.locked, true, 'body scroll locked')
  assert.equal(box.focusInside, true, 'focus trapped in the drawer')
  assert.equal(await overflow(page), true, 'no horizontal overflow')
  if (mode === 'sheet') {
    assert.ok(box.top <= 1, `sheet is full screen, top=${box.top}`)
    assert.ok(Math.abs(box.width - box.vw) <= 2, `sheet width ${box.width} vs ${box.vw}`)
    assert.equal(box.radius, 0, 'mobile sheet has no corner radius')
  } else {
    assert.ok(box.top >= 8 && box.top <= 16, `inset top ${box.top}`)
    assert.ok(box.rightGap >= 8 && box.rightGap <= 16, `inset right ${box.rightGap}`)
    assert.ok(box.radius >= 12 && box.radius <= 16, `radius ${box.radius}`)
  }
  return box
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="browse-v3"]', { timeout: 20000 })
    await page.waitForSelector('[data-testid="messages-nav-trigger"]', { timeout: 15000 })
    assert.equal(await page.locator('[data-testid="notifications-bell"]').count(), 0)

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-testid="browse-v3"]')
      if (vp.mode === 'sheet') {
        await page.waitForSelector('[data-testid="messages-mobile-trigger"]', { state: 'visible' })
      } else {
        await page.waitForSelector('[data-testid="messages-nav-trigger"]', { state: 'visible' })
      }

      await openList(page)
      assert.match(page.url(), /messages=1/)
      assert.doesNotMatch(page.url(), /thread=/)
      const listBox = await assertDrawerBox(page, vp.mode)
      if (vp.mode === 'dual') {
        assert.ok(listBox.listWidth >= 360 && listBox.listWidth <= 400, `${vp.name} list ${listBox.listWidth}`)
        assert.equal(listBox.chatWidth, 0)
      } else if (vp.mode === 'single') {
        assert.ok(listBox.width >= 480 && listBox.width <= 520, `${vp.name} single width ${listBox.width}`)
      }
      await shot(page, `${vp.name}-list`)

      if (vp.name === '1440') {
        await page.getByTestId('messages-filter-unread').click()
        await page.waitForSelector('[data-testid="messages-thread-row-th-1"]')
        assert.equal(await page.getByTestId('messages-thread-row-th-2').count(), 0)
        await page.getByTestId('messages-filter-all').click()
        await page.getByTestId('messages-search').fill('zzz-no-such-person')
        await page.waitForSelector('text=No matching conversations')
        await page.getByTestId('messages-search').fill('devon')
        await page.waitForSelector('[data-testid="messages-thread-row-th-1"]')
        await page.getByTestId('messages-search').fill('')
        await shot(page, '1440-search-devon')
      }

      await page.getByTestId('messages-thread-row-th-1').click()
      await page.waitForSelector('[data-testid="messages-conversation"]')
      assert.match(page.url(), /thread=th-1/)
      const chatBox = await assertDrawerBox(page, vp.mode)
      if (vp.mode === 'dual') {
        assert.equal(chatBox.joined, true, `${vp.name} panels share an edge`)
        assert.equal(chatBox.chatLeftOfList, true)
        assert.ok(chatBox.chatWidth >= 480 && chatBox.chatWidth <= 520, `chat ${chatBox.chatWidth}`)
        assert.ok(chatBox.listWidth >= 360 && chatBox.listWidth <= 400, `list ${chatBox.listWidth}`)
      } else {
        assert.equal(chatBox.listDisplay, 'none', `${vp.name} list hidden under chat`)
        const back = page.getByTestId('messages-back')
        assert.equal(await back.isVisible(), true, `${vp.name} back visible`)
      }
      await shot(page, `${vp.name}-thread`)

      if (vp.name === '1440') {
        const before = await page.getByTestId('messages-conversation').innerText()
        assert.match(before, /Devon Park/)
        await page.getByTestId('messages-thread-row-th-2').click()
        await page.waitForFunction(
          () =>
            /thread=th-2/.test(location.search) &&
            /Post-brunch kitchen reset/.test(
              document.querySelector('[data-testid="messages-job-strip"]')?.textContent || '',
            ),
        )
        assert.match(await page.getByTestId('messages-conversation').innerText(), /Devon Park/)
        await page.getByTestId('messages-thread-row-th-1').click()
        await page.waitForFunction(
          () =>
            /thread=th-1/.test(location.search) &&
            /Cat drop-in/.test(document.querySelector('[data-testid="messages-job-strip"]')?.textContent || ''),
        )

        const input = page.getByTestId('messages-composer-input')
        const send = page.getByTestId('messages-send')
        assert.equal(await send.isDisabled(), true)
        await input.fill('QA drawer ping')
        assert.equal(await send.isDisabled(), false)
        await input.press('Enter')
        await page.waitForSelector('text=QA drawer ping')
        assert.equal(await input.inputValue(), '')
        assert.equal(await send.isDisabled(), true)
        await shot(page, '1440-sent')

        await page.keyboard.press('Escape')
        await page.waitForFunction(() => !/thread=/.test(location.search) && /messages=1/.test(location.search))
        assert.equal(await page.getByTestId('messages-conversation').count(), 0)
        assert.equal(await page.getByTestId('messages-thread-list').isVisible(), true)
        await page.keyboard.press('Escape')
        await page.waitForFunction(() => !/messages=1/.test(location.search))
        assert.equal(await page.getByTestId('messages-drawer').count(), 0)
        const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
        assert.equal(focused, 'messages-nav-trigger')
      } else if (vp.mode !== 'dual') {
        await page.getByTestId('messages-back').click()
        await page.waitForSelector('[data-testid="messages-thread-list"]', { state: 'visible' })
        assert.equal(await page.getByTestId('messages-conversation').count(), 0)
        await page.getByTestId('messages-close').click()
        await page.waitForSelector('[data-testid="messages-drawer"]', { state: 'detached' })
      } else {
        await page.getByTestId('messages-close').click()
        await page.waitForSelector('[data-testid="messages-drawer"]', { state: 'detached' })
      }
      assert.equal(await overflow(page), true, `${vp.name} no overflow after close`)
    }

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE_URL}/messages/th-2`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="messages-conversation"]', { timeout: 15000 })
    assert.match(page.url(), /\/browse\?/)
    assert.match(page.url(), /messages=1/)
    assert.match(page.url(), /thread=th-2/)
    assert.match(await page.getByTestId('messages-job-strip').innerText(), /Post-brunch kitchen reset/)
    assert.ok((await page.locator('[data-testid="browse-v3"]').count()) >= 1)
    await shot(page, '1440-deep-link-th-2')

    await page.goto(`${BASE_URL}/messages/missing-thread`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="messages-thread-missing"]')
    await page.getByRole('button', { name: 'Back to inbox' }).click()
    await page.waitForFunction(() => !/thread=/.test(location.search) && /messages=1/.test(location.search))
    await page.waitForSelector('[data-testid="messages-thread-list"]')
    await shot(page, '1440-missing-back-to-list')

    await page.goto(`${BASE_URL}/home?messages=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-testid="messages-drawer"]')
    assert.match(page.url(), /\/home\?/)
    await page.keyboard.press('Escape')
    await page.waitForSelector('[data-testid="messages-drawer"]', { state: 'detached' })

    console.log('messages drawer QA passed')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
