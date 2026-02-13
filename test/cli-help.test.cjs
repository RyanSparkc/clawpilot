const test = require('node:test');
const assert = require('node:assert/strict');

const { printHelp } = require('../bin/cli');

test('printHelp prints usage and key install/runtime flags', () => {
  const lines = [];
  const originalLog = console.log;
  console.log = (value = '') => {
    lines.push(String(value));
  };

  try {
    printHelp();
  } finally {
    console.log = originalLog;
  }

  const output = lines.join('\n');
  assert.match(output, /clawpilot/i);
  assert.match(output, /install/i);
  assert.match(output, /--yes/i);
  assert.match(output, /--timezone/i);
  assert.match(output, /--json-errors/i);
  assert.match(output, /--preflight/i);
});
