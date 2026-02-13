const test = require('node:test');
const assert = require('node:assert/strict');

const { printHelp } = require('../bin/cli');

test('printHelp default mode prints concise commands and common flags', () => {
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
  assert.match(output, /init/i);
  assert.match(output, /doctor/i);
  assert.match(output, /--yes/i);
  assert.match(output, /--dry-run/i);
  assert.match(output, /--json-errors/i);
  assert.match(output, /--advanced/i);
  assert.doesNotMatch(output, /--state-file/i);
});

test('printHelp advanced mode includes full option list', () => {
  const lines = [];
  const originalLog = console.log;
  console.log = (value = '') => {
    lines.push(String(value));
  };

  try {
    printHelp({ advanced: true });
  } finally {
    console.log = originalLog;
  }

  const output = lines.join('\n');
  assert.match(output, /Advanced options/i);
  assert.match(output, /--timezone/i);
  assert.match(output, /--state-file/i);
  assert.match(output, /--role-pack/i);
});
