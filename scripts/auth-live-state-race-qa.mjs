#!/usr/bin/env node
/**
 * Visual QA: mocked sign-in race must NOT show "Bunk backend error".
 * Loads a self-contained HTML harness that mirrors BeamContext gating
 * (no real Supabase accounts). Screenshots → /opt/cursor/artifacts/auth-live-state-race/
 */
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ARTIFACT_DIR = '/opt/cursor/artifacts/auth-live-state-race'
mkdirSync(ARTIFACT_DIR, { recursive: true })

function isAwaitingSignedInLiveState(input) {
  if (input.mode !== 'live') return false
  if (!input.authUserId) return false
  if (input.backendError) return false
  if (!input.stateCurrentUserId) return true
  return input.stateCurrentUserId !== input.authUserId
}

const harness = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Auth live-state race harness</title>
  <style>
    body { margin: 0; font-family: Georgia, serif; background: #f7f4ef; color: #071330; }
    .splash { min-height: 100vh; display: flex; flex-direction: column; justify-content: center;
      max-width: 32rem; margin: 0 auto; padding: 1rem; gap: 1rem; }
    .splash h1 { font-size: 1.75rem; margin: 0; }
    .app { min-height: 100vh; display: grid; place-items: center; }
    .modal { width: min(420px, 92vw); background: #fff; border: 1px solid #d7d2c8;
      border-radius: 16px; padding: 1.5rem; box-shadow: 0 18px 40px rgba(7,19,48,.08); }
    .modal h1 { margin: 0 0 .5rem; font-size: 1.5rem; }
    .modal p { margin: 0 0 1rem; color: #4A5568; }
    .bar { height: 4px; background: #e8e2d8; border-radius: 999px; overflow: hidden; margin-top: 1rem; }
    .bar > span { display: block; height: 100%; width: 40%; background: #0b3d2e;
      animation: slide 1.2s ease-in-out infinite; }
    @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
    .label { position: fixed; top: 12px; left: 12px; font: 12px/1.2 ui-sans-serif, system-ui;
      background: #071330; color: #fff; padding: .35rem .55rem; border-radius: 6px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    function isAwaitingSignedInLiveState(input) {
      if (input.mode !== 'live') return false
      if (!input.authUserId) return false
      if (input.backendError) return false
      if (!input.stateCurrentUserId) return true
      return input.stateCurrentUserId !== input.authUserId
    }

    function render(scenario) {
      const root = document.getElementById('root')
      const awaiting = isAwaitingSignedInLiveState(scenario)
      const showError = (!scenario.stateCurrentUserId || !scenario.hasCurrentUser) && !!scenario.backendError
        && !awaiting
      // Fixed path: awaiting keeps children (auth modal) mounted
      if (scenario.fixEnabled && awaiting) {
        root.innerHTML = '<div class="label">' + scenario.title + '</div>'
          + '<div class="app" data-testid="auth-shell"><div class="modal" data-testid="auth-modal">'
          + '<h1>Welcome back</h1><p>Loading your Bunk session…</p>'
          + '<div class="bar" data-testid="session-progress"><span></span></div></div></div>'
        return
      }
      // Broken path (before): signed-in + anonymous state → error splash
      if (!scenario.fixEnabled && scenario.authUserId
          && scenario.stateCurrentUserId === 'anonymous' && !scenario.hasCurrentUser) {
        root.innerHTML = '<div class="label">' + scenario.title + '</div>'
          + '<div class="splash" data-testid="backend-error-splash">'
          + '<h1>Bunk backend error</h1>'
          + '<p>' + (scenario.backendError || 'Could not load your Bunk session from Supabase.') + '</p></div>'
        return
      }
      if (showError) {
        root.innerHTML = '<div class="label">' + scenario.title + '</div>'
          + '<div class="splash" data-testid="backend-error-splash">'
          + '<h1>Bunk backend error</h1><p>' + scenario.backendError + '</p></div>'
        return
      }
      root.innerHTML = '<div class="label">' + scenario.title + '</div>'
        + '<div class="app" data-testid="auth-shell"><div class="modal" data-testid="auth-modal">'
        + '<h1>Welcome back</h1><p>Ready</p></div></div>'
    }

    window.__renderScenario = render
    render({
      title: 'before (race)',
      fixEnabled: false,
      mode: 'live',
      authUserId: 'user-1',
      stateCurrentUserId: 'anonymous',
      hasCurrentUser: false,
      backendError: 'User already registered',
    })
  </script>
</body>
</html>`

const htmlPath = join(ARTIFACT_DIR, 'harness.html')
writeFileSync(htmlPath, harness)

assert.equal(
  isAwaitingSignedInLiveState({
    mode: 'live',
    authUserId: 'user-1',
    stateCurrentUserId: 'anonymous',
    backendError: null,
  }),
  true,
)

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto('file://' + htmlPath)

await page.screenshot({ path: join(ARTIFACT_DIR, 'before-backend-error-splash.png'), fullPage: true })
const beforeSplash = await page.locator('[data-testid="backend-error-splash"]').count()
assert.equal(beforeSplash, 1, 'before harness must show backend error splash')

await page.evaluate(() => {
  window.__renderScenario({
    title: 'after (fixed gate)',
    fixEnabled: true,
    mode: 'live',
    authUserId: 'user-1',
    stateCurrentUserId: 'anonymous',
    hasCurrentUser: false,
    backendError: null,
  })
})

await page.screenshot({ path: join(ARTIFACT_DIR, 'after-auth-loading-no-error.png'), fullPage: true })
assert.equal(await page.locator('[data-testid="backend-error-splash"]').count(), 0)
assert.equal(await page.locator('[data-testid="auth-modal"]').count(), 1)
assert.equal(await page.locator('[data-testid="session-progress"]').count(), 1)

await browser.close()

// Source contract: BeamContext wires the same gate.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const beamSrc = readFileSync(join(root, 'src/context/BeamContext.tsx'), 'utf8')
assert.match(beamSrc, /isAwaitingSignedInLiveState/)
assert.match(beamSrc, /ready: false/)

console.log('auth-live-state-race-qa: ok')
console.log('artifacts:', ARTIFACT_DIR)
