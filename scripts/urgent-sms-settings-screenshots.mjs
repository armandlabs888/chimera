/**
 * Capture Urgent job texts card states (demo mode).
 * Desktop: off, code-entry, on. Mobile: on.
 */
import { chromium, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts'
mkdirSync(OUT, { recursive: true })

async function openSms(page) {
  await page.goto(`${BASE}/you?tab=helper&demo=1`, { waitUntil: 'networkidle' })
  const sms = page.getByTestId('helper-sms-settings')
  await sms.waitFor({ state: 'visible', timeout: 20000 })
  await sms.scrollIntoViewIfNeeded()
  return sms
}

async function shotCard(page, sms, name) {
  const path = join(OUT, name)
  await sms.screenshot({ path })
  console.log('wrote', path)
}

async function fillCode(page, code = '123456') {
  const digits = code.split('')
  for (let i = 0; i < digits.length; i += 1) {
    const testId = i === 0 ? 'helper-sms-code' : `helper-sms-code-${i + 1}`
    await page.getByTestId(testId).fill(digits[i])
  }
}

async function reachOnState(page) {
  const sms = await openSms(page)
  // Reset if already confirmed from prior run in same browser context
  const change = page.getByTestId('helper-sms-change-confirmed')
  if (await change.isVisible().catch(() => false)) {
    await change.click()
  }
  await page.getByTestId('helper-sms-phone').fill('+1 408 555 0100')
  await page.getByTestId('helper-sms-send-code').click()
  await page.getByTestId('helper-sms-code-step').waitFor({ state: 'visible' })
  await fillCode(page, '480001')
  await page.getByTestId('helper-sms-confirm-code').click()
  await page.getByTestId('helper-sms-confirmed').waitFor({ state: 'visible' })
  await page.getByTestId('helper-sms-opt-in').click()
  await page.getByTestId('helper-sms-prefs').waitFor({ state: 'visible' })
  await sms.scrollIntoViewIfNeeded()
  return sms
}

const browser = await chromium.launch({ headless: true })
try {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })
  const deskPage = await desktop.newPage()

  // Off
  let sms = await openSms(deskPage)
  await shotCard(deskPage, sms, 'helper-urgent-sms-desk-off.png')

  // Code entry
  await deskPage.getByTestId('helper-sms-phone').fill('+1 408 555 0100')
  await deskPage.getByTestId('helper-sms-send-code').click()
  await deskPage.getByTestId('helper-sms-code-step').waitFor({ state: 'visible' })
  await deskPage.getByTestId('helper-sms-code').fill('4')
  await deskPage.getByTestId('helper-sms-code-2').fill('8')
  await sms.scrollIntoViewIfNeeded()
  await shotCard(deskPage, sms, 'helper-urgent-sms-desk-code.png')

  // On (continue from code)
  await fillCode(deskPage, '480001')
  await deskPage.getByTestId('helper-sms-confirm-code').click()
  await deskPage.getByTestId('helper-sms-confirmed').waitFor({ state: 'visible' })
  await deskPage.getByTestId('helper-sms-opt-in').click()
  await deskPage.getByTestId('helper-sms-prefs').waitFor({ state: 'visible' })
  await sms.scrollIntoViewIfNeeded()
  await shotCard(deskPage, sms, 'helper-urgent-sms-desk-on.png')
  await desktop.close()

  const iPhone = devices['iPhone 13']
  const mobile = await browser.newContext({
    ...iPhone,
    deviceScaleFactor: 2,
  })
  const mobPage = await mobile.newPage()
  sms = await reachOnState(mobPage)
  await shotCard(mobPage, sms, 'helper-urgent-sms-mob-on.png')
  await mobile.close()
} finally {
  await browser.close()
}

console.log('done')
