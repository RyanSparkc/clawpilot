const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCliError,
  normalizeCliError,
  printCliError,
  printPreflightSummary
} = require('../bin/cli');

test('normalizeCliError maps missing channel error to channel_required', () => {
  const normalized = normalizeCliError(new Error('Channel is required when sending without --dry-run.'));

  assert.equal(normalized.code, 'channel_required');
  assert.match(normalized.fix, /--channel/i);
});

test('printCliError emits JSON payload when json mode is enabled', () => {
  const error = createCliError(
    'gateway_missing',
    'openclaw CLI not found.',
    'Install OpenClaw CLI and verify with: openclaw --version'
  );

  let output = '';
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    output += chunk;
    return true;
  };

  try {
    printCliError(error, true);
  } finally {
    process.stderr.write = originalWrite;
  }

  const payload = JSON.parse(output.trim());
  assert.equal(payload.code, 'gateway_missing');
  assert.match(payload.fix, /openclaw --version/i);
});

test('printPreflightSummary emits JSON summary when json mode is enabled', () => {
  const summary = {
    ok: true,
    checks: [{ name: 'openclaw_cli', ok: true }],
    issues: [],
    warnings: [{ code: 'gateway_token_missing' }]
  };

  let output = '';
  const originalWrite = process.stdout.write;
  process.stdout.write = (chunk) => {
    output += chunk;
    return true;
  };

  try {
    printPreflightSummary(summary, true);
  } finally {
    process.stdout.write = originalWrite;
  }

  const payload = JSON.parse(output.trim());
  assert.equal(payload.ok, true);
  assert.equal(payload.warnings[0].code, 'gateway_token_missing');
});
