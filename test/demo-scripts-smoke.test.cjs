const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');

function readScript(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), 'utf8');
}

test('demo-safe scripts run in dry-run mode only', () => {
  const safePs1 = readScript('scripts', 'demo-safe.ps1');
  const safeSh = readScript('scripts', 'demo-safe.sh');

  assert.match(safePs1, /--dry-run/);
  assert.match(safeSh, /--dry-run/);
  assert.match(safePs1, /OPENCLAW_HOME/);
  assert.match(safeSh, /OPENCLAW_HOME/);
  assert.match(safePs1, /CLAWPILOT_SKIP_PREFLIGHT/);
  assert.match(safeSh, /--skip-preflight/);
  assert.doesNotMatch(safePs1, /openclaw message send/i);
  assert.doesNotMatch(safeSh, /openclaw message send/i);
});

test('demo-send scripts require explicit confirmation', () => {
  const sendPs1 = readScript('scripts', 'demo-send.ps1');
  const sendSh = readScript('scripts', 'demo-send.sh');

  assert.match(sendPs1, /-Confirm/);
  assert.match(sendSh, /--confirm/);
  assert.match(sendPs1, /SkipPreflight/);
  assert.match(sendSh, /--skip-preflight/);
  assert.match(sendPs1, /real send/i);
  assert.match(sendSh, /real send/i);
});
