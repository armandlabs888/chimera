/**
 * Settings Notifications: HelperUrgentSmsSettings card (unverified, phone phase).
 * Captures 1440 and 390 widths for visual QA of borders, button, step circle, switch.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:43123'
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts'
const STORAGE_KEY = 'beam-demo-v1'

mkdirSync(OUT, { recursive: true })

async function seedUnverifiedHelper(page) {
  await page.goto(`${BASE}/browse?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction((key) => !!localStorage.getItem(key), STORAGE_KEY, {
    timeout: 20000,
  })
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}')
    const me = state.currentUserId || 'user-you'
    for (const p of state.people || []) {
      if (p.id !== me) continue
      p.accountRole = 'helper'
      p.isHelper = true
      p.skills = p.skills?.length ? p.skills : ['junk-removal', 'house-cleaning']
      p.hourlyRate = 50
      p.rateType = 'hourly'
    }
    state.helperVerification = {
      ...(state.helperVerification || {}),
      id: state.helperVerification?.id || 'ver-you',
      profileId: me,
      status: 'unverified',
      email: state.helperVerification?.email || 'you@example.com',
      street: state.helperVerification?.street || '1 Main St',
      city: state.helperVerification?.city || 'San Jose',
      stateCode: state.helperVerification?.stateCode || 'CA',
      zip: state.helperVerification?.zip || '95125',
      lastCheckResult: null,
    }
    localStorage.setItem(key, JSON.stringify(state))
  }, STORAGE_KEY)
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(
    (key) => {
      try {
        const s = JSON.parse(localStorage.getItem(key) || '{}')
        return s.helperVerification?.status === 'unverified'
      } catch {
        return false
      }
    },
    STORAGE_KEY,
    { timeout: 20000 },
  )
}

async function assertPhonePhaseStyles(page) {
  const styles = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="helper-sms-settings"]')
    const input = document.querySelector('[data-testid="helper-sms-phone"]')
    const btn = document.querySelector('[data-testid="helper-sms-send-code"]')
    const pill = document.querySelector('[data-testid="helper-sms-status-pill"]')
    const sw = document.querySelector('[data-testid="helper-sms-opt-in"]')
    const step = document.querySelector('.account-hc-sms-step-num')
    if (!card || !input || !btn || !pill || !sw || !step) {
      throw new Error('Missing SMS card elements')
    }
    const cs = (el) => getComputedStyle(el)
    const cardVars = getComputedStyle(card)
    return {
      hcBlue: cardVars.getPropertyValue('--hc-blue').trim(),
      hcLine2: cardVars.getPropertyValue('--hc-line-2').trim(),
      inputBorder: cs(input).borderTopColor,
      inputRadius: cs(input).borderRadius,
      inputBg: cs(input).backgroundColor,
      placeholder: input.getAttribute('placeholder'),
      btnBg: cs(btn).backgroundColor,
      btnColor: cs(btn).color,
      btnDisplay: cs(btn).display,
      pillBorder: cs(pill).borderTopColor,
      pillRadius: cs(pill).borderRadius,
      switchBg: cs(sw).backgroundColor,
      switchW: cs(sw).width,
      switchH: cs(sw).height,
      stepBg: cs(step).backgroundColor,
      stepColor: cs(step).color,
      stepDisplay: cs(step).display,
      phase: card.getAttribute('data-sms-phase'),
    }
  })
  console.log('style-check', JSON.stringify(styles, null, 2))
  if (!styles.hcBlue) throw new Error('--hc-blue missing on .account-hc-sms-settings')
  if (styles.phase !== 'phone') throw new Error(`expected phone phase, got ${styles.phase}`)
  if (styles.btnDisplay === 'none') throw new Error('Send code button not displayed')
  return styles
}

async function shotCard(page, name, width) {
  await page.setViewportSize({ width, height: width >= 1000 ? 900 : 844 })
  const sms = page.getByTestId('helper-sms-settings')
  await sms.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  const path = join(OUT, name)
  await sms.screenshot({ path })
  console.log('wrote', path)
  return path
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await seedUnverifiedHelper(page)
  await page.goto(`${BASE}/settings/account?demo=1#notifications`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  const sms = page.getByTestId('helper-sms-settings')
  await sms.waitFor({ state: 'visible', timeout: 20000 })
  await page.getByTestId('helper-sms-phone').waitFor({ state: 'visible', timeout: 10000 })
  await page.getByTestId('helper-sms-send-code').waitFor({ state: 'visible', timeout: 10000 })
  await page.getByTestId('helper-sms-opt-in').waitFor({ state: 'visible', timeout: 10000 })
  await page.getByTestId('helper-sms-status-pill').waitFor({ state: 'visible', timeout: 10000 })

  await assertPhonePhaseStyles(page)
  await shotCard(page, 'settings-sms-phone-phase-1440.png', 1440)
  await shotCard(page, 'settings-sms-phone-phase-390.png', 390)

  await browser.close()
  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
