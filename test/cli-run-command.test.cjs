const test = require('node:test');
const assert = require('node:assert/strict');

const { parseRunOptions } = require('../bin/cli');

test('parseRunOptions parses dry-run morning command', () => {
  const options = parseRunOptions([
    '--command',
    'morning',
    '--dry-run',
    '--timezone',
    'UTC'
  ]);

  assert.equal(options.command, 'morning');
  assert.equal(options.dryRun, true);
  assert.equal(options.timezone, 'UTC');
});

test('parseRunOptions supports --json-errors flag', () => {
  const options = parseRunOptions([
    '--command',
    'report',
    '--json-errors'
  ]);

  assert.equal(options.command, 'report');
  assert.equal(options.jsonErrors, true);
});
