#!/usr/bin/env node
import assert from 'node:assert/strict'

// Mirrors src/lib/displayTitle.ts
function formatJobTitleDisplay(title) {
  return title.replace(/-/g, '\u2011')
}

assert.equal(
  formatJobTitleDisplay('Pack and label a 1-bedroom apartment'),
  'Pack and label a 1\u2011bedroom apartment',
)
assert.equal(formatJobTitleDisplay('no hyphen'), 'no hyphen')
assert.equal(formatJobTitleDisplay('pre-war walk-up'), 'pre\u2011war walk\u2011up')
assert.doesNotMatch(formatJobTitleDisplay('1-bedroom'), /[\u2013\u2014]/)
console.log('display-title-unit PASS')
