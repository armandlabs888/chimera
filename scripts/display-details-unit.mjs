#!/usr/bin/env node
import assert from 'node:assert/strict'

// Mirrors src/lib/displayDetails.ts
const SAMPLE_MARKER_RE = /\n*\[(?:HouseCall|Bunk|Beam|BlockSide) sample[^\]]*\]\s*$/i

function formatJobDetailsDisplay(details) {
  if (!details) return ''
  return details.replace(SAMPLE_MARKER_RE, '').trimEnd()
}

const body =
  'Solid wood dresser from the entry to the upstairs bedroom. Drawers come out. Two people would be ideal.'

assert.equal(
  formatJobDetailsDisplay(`${body}\n\n[Bunk sample, Nov 12, 2026]`),
  body,
)
assert.equal(
  formatJobDetailsDisplay(`${body}\n[Bunk sample, Nov 12, 2026]`),
  body,
)
assert.equal(
  formatJobDetailsDisplay(`${body}\n\n[HouseCall sample, Nov 12, 2026]`),
  body,
)
assert.equal(
  formatJobDetailsDisplay(`${body}\n\n[Beam sample, Oct 1, 2025]`),
  body,
)
assert.equal(formatJobDetailsDisplay(body), body)
assert.equal(formatJobDetailsDisplay(''), '')
assert.equal(
  formatJobDetailsDisplay(`${body}\n\n[Bunk sample]`),
  body,
)
// Mid-body brackets are not stripped.
assert.equal(
  formatJobDetailsDisplay(`${body} [Bunk sample, Nov 12, 2026] more`),
  `${body} [Bunk sample, Nov 12, 2026] more`,
)
console.log('display-details-unit PASS')
